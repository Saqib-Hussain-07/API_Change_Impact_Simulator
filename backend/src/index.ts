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

// Only start standalone HTTP server when not running in Vercel serverless environment
if (!process.env.VERCEL) {
  main().catch((err) => {
    logger.error(err, 'Fatal startup error');
    process.exit(1);
  });
}

export default app;
// CommonJS export compatibility for @vercel/node:
module.exports = app;
module.exports.default = app;
