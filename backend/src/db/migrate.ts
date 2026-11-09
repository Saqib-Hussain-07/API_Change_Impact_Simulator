import 'dotenv/config';
import { pool } from './client';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Runs all migration SQL files in order.
 * Files must be named NNN_description.sql where NNN is a zero-padded number.
 */
async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const candidateDirs = [
      path.join(__dirname, 'migrations'),
      path.join(__dirname, '../../src/db/migrations'),
      path.join(process.cwd(), 'src/db/migrations'),
      path.join(process.cwd(), 'backend/src/db/migrations'),
      path.join(process.cwd(), 'dist/db/migrations'),
      path.join(process.cwd(), 'backend/dist/db/migrations'),
    ];
    const migrationsDir = candidateDirs.find((d) => fs.existsSync(d) && fs.readdirSync(d).some((f) => f.endsWith('.sql')));
    if (!migrationsDir) {
      throw new Error('Migrations directory not found in candidate paths');
    }
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM _migrations WHERE filename = $1',
        [file],
      );
      if (rows.length > 0) {
        logger.info({ file }, 'Migration already applied, skipping');
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info({ file }, 'Applying migration');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations(filename) VALUES($1)', [file]);
        await client.query('COMMIT');
        logger.info({ file }, 'Migration applied successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  logger.error(err, 'Migration failed');
  process.exit(1);
});
