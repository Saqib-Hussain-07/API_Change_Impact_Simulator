import 'dotenv/config';
import app from './app';
import { logger } from './utils/logger';
import { testDbConnection } from './db/client';

const PORT = process.env.PORT ?? 4000;

async function main() {
  await testDbConnection();
  app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, 'API Change Impact Simulator API started');
  });
}

main().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});
