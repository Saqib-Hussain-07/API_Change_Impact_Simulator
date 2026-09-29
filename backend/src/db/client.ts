import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

interface QueryResult<T extends object = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

interface DbClient {
  query<T extends object = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  release(): void;
}

let activeDriver: 'pg' | 'pglite' | null = null;
let pgliteInstance: any = null;

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/api_impact_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 1500,
});

pgPool.on('error', (err) => {
  if (activeDriver === 'pg') {
    logger.error(err, 'Unexpected PostgreSQL pool error');
  }
});

async function getPgliteInstance() {
  if (!pgliteInstance) {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = path.resolve(__dirname, '../../data/pglite');
    fs.mkdirSync(dataDir, { recursive: true });
    pgliteInstance = new PGlite(dataDir);
  }
  return pgliteInstance;
}

export const pool = {
  async connect(): Promise<DbClient> {
    if (activeDriver === null) {
      await testDbConnection();
    }

    if (activeDriver === 'pg') {
      const client = await pgPool.connect();
      return client;
    }

    const db = await getPgliteInstance();
    return {
      query: async <T extends object = Record<string, unknown>>(text: string, params?: unknown[]) => {
        const res = await db.query(text, params);
        return { rows: res.rows as T[], rowCount: res.rowCount ?? (res.affectedRows ?? null) };
      },
      release: () => {},
    };
  },

  async query<T extends object = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return query<T>(text, params);
  },

  on(event: string, listener: (...args: any[]) => void) {
    pgPool.on(event as any, listener);
  },

  async end(): Promise<void> {
    if (activeDriver === 'pg') {
      await pgPool.end();
    } else if (pgliteInstance) {
      await pgliteInstance.close();
      pgliteInstance = null;
    }
  },
};

export async function testDbConnection(): Promise<void> {
  // First, attempt standard PostgreSQL
  if (process.env.DATABASE_URL) {
    try {
      const client = await pgPool.connect();
      try {
        await client.query('SELECT 1');
        activeDriver = 'pg';
        logger.info('Connected to PostgreSQL database via DATABASE_URL');
        return;
      } finally {
        client.release();
      }
    } catch {
      logger.warn('Could not connect to external PostgreSQL. Falling back to embedded PostgreSQL engine (PGlite)...');
    }
  }

  // Fallback to embedded PGlite
  try {
    const db = await getPgliteInstance();
    await db.query('SELECT 1');
    activeDriver = 'pglite';
    logger.info('Connected to embedded PostgreSQL engine (PGlite)');

    // Check if migrations have been applied
    const res = await db.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_migrations'",
    );
    if (res.rows.length === 0) {
      logger.info('Initializing database schema and initial seed data...');
      await autoMigrateAndSeed(db);
    }
  } catch (err) {
    logger.error(err, 'Failed to initialize database');
    throw err;
  }
}

async function autoMigrateAndSeed(db: any): Promise<void> {
  // 1. Run migrations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      logger.info({ file }, 'Applying migration');
      await db.exec(sql);
      await db.query('INSERT INTO _migrations(filename) VALUES($1)', [file]);
      logger.info({ file }, 'Migration applied successfully');
    }
  }

  // 2. Run seed script logic
  logger.info('Seeding demo data...');
  try {
    const adminHash = await bcrypt.hash('Admin@1234', 12);
    const rep1Hash = await bcrypt.hash('Rep@1234', 12);
    const rep2Hash = await bcrypt.hash('Rep@1234', 12);

    const adminRes = await db.query(
      `INSERT INTO users(email, password_hash, role)
       VALUES('admin@acme.dev', $1, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [adminHash],
    );
    const adminId = adminRes.rows[0].id;

    const team1Res = await db.query(
      `INSERT INTO consumer_teams(name, owner_id)
       VALUES('Frontend Mobile Team', $1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [adminId],
    );
    const team2Res = await db.query(
      `INSERT INTO consumer_teams(name, owner_id)
       VALUES('Analytics Service', $1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [adminId],
    );
    const team1Id = team1Res.rows[0].id;
    const team2Id = team2Res.rows[0].id;

    await db.query(
      `INSERT INTO users(email, password_hash, role, team_id)
       VALUES('mobile-rep@acme.dev', $1, 'consumer_rep', $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [rep1Hash, team1Id],
    );

    await db.query(
      `INSERT INTO users(email, password_hash, role, team_id)
       VALUES('analytics-rep@acme.dev', $1, 'consumer_rep', $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [rep2Hash, team2Id],
    );

    // Dependencies
    await db.query(
      `INSERT INTO dependencies(consumer_team_id, endpoint_path, http_method, field_path)
       VALUES
         ($1, '/users/{id}', 'GET', 'id'),
         ($1, '/users/{id}', 'GET', 'email'),
         ($1, '/users/{id}', 'GET', 'name'),
         ($1, '/users', 'GET', NULL),
         ($2, '/users/{id}', 'GET', 'id'),
         ($2, '/users/{id}', 'GET', 'email'),
         ($2, '/analytics/events', 'POST', NULL)
       ON CONFLICT DO NOTHING`,
      [team1Id, team2Id],
    );

    logger.info('Demo seed completed successfully');
  } catch (seedErr) {
    logger.warn({ err: seedErr }, 'Auto-seed note');
  }
}

/**
 * Execute a query using the active driver.
 */
export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  if (activeDriver === null) {
    await testDbConnection();
  }

  if (activeDriver === 'pg') {
    const result = await pgPool.query<T>(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  const db = await getPgliteInstance();
  const result = await db.query(text, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount ?? (result.affectedRows ?? null),
  };
}
