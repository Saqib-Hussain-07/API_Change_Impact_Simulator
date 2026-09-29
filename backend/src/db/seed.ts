/**
 * db/seed.ts
 * ============================================================
 * Seeds the database with demo data for end-to-end demo workflow:
 * - 3 users (admin, 2 consumer reps)
 * - 2 consumer teams
 * - Sample API specs + 2 versions each
 * - Dependencies for each consumer team
 * - Sample Postman-format test collections
 *
 * Run: npm run db:seed
 * Safe to re-run — uses ON CONFLICT DO NOTHING
 * ============================================================
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, query } from './client';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function seed() {
  logger.info('Starting database seed...');

  // ── Users ────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const rep1Hash = await bcrypt.hash('Rep@1234', 12);
  const rep2Hash = await bcrypt.hash('Rep@1234', 12);

  const { rows: adminRows } = await query<{ id: string }>(
    `INSERT INTO users(email, password_hash, role)
     VALUES('admin@acme.dev', $1, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [adminHash],
  );
  const adminId = adminRows[0].id;

  // ── Consumer Teams ───────────────────────────────────────────
  const { rows: team1Rows } = await query<{ id: string }>(
    `INSERT INTO consumer_teams(name, owner_id)
     VALUES('Frontend Mobile Team', $1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [adminId],
  );
  const { rows: team2Rows } = await query<{ id: string }>(
    `INSERT INTO consumer_teams(name, owner_id)
     VALUES('Analytics Service', $1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [adminId],
  );
  const team1Id = team1Rows[0].id;
  const team2Id = team2Rows[0].id;

  // ── Consumer Rep Users ────────────────────────────────────────
  await query(
    `INSERT INTO users(email, password_hash, role, team_id)
     VALUES('mobile-rep@acme.dev', $1, 'consumer_rep', $2)
     ON CONFLICT (email) DO UPDATE SET team_id = EXCLUDED.team_id
     RETURNING id`,
    [rep1Hash, team1Id],
  );

  await query(
    `INSERT INTO users(email, password_hash, role, team_id)
     VALUES('analytics-rep@acme.dev', $1, 'consumer_rep', $2)
     ON CONFLICT (email) DO UPDATE SET team_id = EXCLUDED.team_id
     RETURNING id`,
    [rep2Hash, team2Id],
  );

  // ── API Specs ────────────────────────────────────────────────
  const { rows: userSpecRows } = await query<{ id: string }>(
    `INSERT INTO api_specs(name, description, owner_id)
     VALUES('User Service API', 'Core user management API', $1)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [adminId],
  );

  let userSpecId: string;
  if (userSpecRows[0]) {
    userSpecId = userSpecRows[0].id;
  } else {
    const { rows } = await query<{ id: string }>(`SELECT id FROM api_specs WHERE name = 'User Service API'`);
    userSpecId = rows[0].id;
  }

  const { rows: paymentsSpecRows } = await query<{ id: string }>(
    `INSERT INTO api_specs(name, description, owner_id)
     VALUES('Payments API', 'Payment processing API', $1)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [adminId],
  );

  let paymentsSpecId: string;
  if (paymentsSpecRows[0]) {
    paymentsSpecId = paymentsSpecRows[0].id;
  } else {
    const { rows } = await query<{ id: string }>(`SELECT id FROM api_specs WHERE name = 'Payments API'`);
    paymentsSpecId = rows[0].id;
  }

  // ── Spec Versions ─────────────────────────────────────────────
  const fixturesDir = path.join(__dirname, '../diff-engine/fixtures');

  const userV1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'user-service-v1.json'), 'utf8'));
  const userV2 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'user-service-v2.json'), 'utf8'));
  const paymentsV1 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'payments-api-v1.json'), 'utf8'));
  const paymentsV2 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'payments-api-v2.json'), 'utf8'));

  const { rows: uv1Rows } = await query<{ id: string }>(
    `INSERT INTO spec_versions(spec_id, version_label, uploaded_by, raw_spec, file_size)
     VALUES($1, '1.0.0', $2, $3, $4)
     ON CONFLICT (spec_id, version_label) DO UPDATE SET raw_spec = EXCLUDED.raw_spec
     RETURNING id`,
    [userSpecId, adminId, JSON.stringify(userV1), JSON.stringify(userV1).length],
  );

  const { rows: uv2Rows } = await query<{ id: string }>(
    `INSERT INTO spec_versions(spec_id, version_label, uploaded_by, raw_spec, file_size)
     VALUES($1, '2.0.0', $2, $3, $4)
     ON CONFLICT (spec_id, version_label) DO UPDATE SET raw_spec = EXCLUDED.raw_spec
     RETURNING id`,
    [userSpecId, adminId, JSON.stringify(userV2), JSON.stringify(userV2).length],
  );

  const { rows: pv1Rows } = await query<{ id: string }>(
    `INSERT INTO spec_versions(spec_id, version_label, uploaded_by, raw_spec, file_size)
     VALUES($1, '1.0.0', $2, $3, $4)
     ON CONFLICT (spec_id, version_label) DO UPDATE SET raw_spec = EXCLUDED.raw_spec
     RETURNING id`,
    [paymentsSpecId, adminId, JSON.stringify(paymentsV1), JSON.stringify(paymentsV1).length],
  );

  const { rows: pv2Rows } = await query<{ id: string }>(
    `INSERT INTO spec_versions(spec_id, version_label, uploaded_by, raw_spec, file_size)
     VALUES($1, '2.0.0', $2, $3, $4)
     ON CONFLICT (spec_id, version_label) DO UPDATE SET raw_spec = EXCLUDED.raw_spec
     RETURNING id`,
    [paymentsSpecId, adminId, JSON.stringify(paymentsV2), JSON.stringify(paymentsV2).length],
  );

  // ── Dependencies ─────────────────────────────────────────────
  // Mobile Team: depends on GET /users, GET /users/{id}, POST /users
  const userDeps = [
    { path: '/users', method: 'GET', field: null },
    { path: '/users/{id}', method: 'GET', field: 'name' },
    { path: '/users', method: 'POST', field: null },
  ];

  for (const dep of userDeps) {
    await query(
      `INSERT INTO dependencies(consumer_team_id, endpoint_path, http_method, field_path)
       VALUES($1, $2, $3, $4)
       ON CONFLICT (consumer_team_id, endpoint_path, http_method, field_path) DO NOTHING`,
      [team1Id, dep.path, dep.method, dep.field],
    );
  }

  // Analytics Team: depends on GET /users, GET /payments status
  const analyticsDeps = [
    { path: '/users', method: 'GET', field: null },
    { path: '/payments/{paymentId}/status', method: 'GET', field: null },
  ];

  for (const dep of analyticsDeps) {
    await query(
      `INSERT INTO dependencies(consumer_team_id, endpoint_path, http_method, field_path)
       VALUES($1, $2, $3, $4)
       ON CONFLICT (consumer_team_id, endpoint_path, http_method, field_path) DO NOTHING`,
      [team2Id, dep.path, dep.method, dep.field],
    );
  }

  // ── Test Collections ─────────────────────────────────────────
  const mobileCollection = {
    info: { name: 'Mobile Team - User Service Tests', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
      {
        name: 'GET /users - List Users',
        request: {
          method: 'GET',
          url: { raw: '{{base_url}}/users', host: ['{{base_url}}'], path: ['users'] },
        },
        event: [{
          listen: 'test',
          script: { exec: ['pm.test("Status 200", () => pm.response.to.have.status(200));'] },
        }],
      },
      {
        name: 'GET /users/{id} - Get User',
        request: {
          method: 'GET',
          url: { raw: '{{base_url}}/users/test-id-123', host: ['{{base_url}}'], path: ['users', 'test-id-123'] },
        },
        event: [{
          listen: 'test',
          script: {
            exec: [
              'pm.test("Status 200 or 404", () => { pm.expect([200, 404]).to.include(pm.response.code); });',
            ],
          },
        }],
      },
    ],
  };

  const analyticsCollection = {
    info: { name: 'Analytics Team - API Tests', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [
      {
        name: 'GET /users - Analytics Read',
        request: {
          method: 'GET',
          url: { raw: '{{base_url}}/users', host: ['{{base_url}}'], path: ['users'] },
        },
        event: [{
          listen: 'test',
          script: { exec: ['pm.test("Status 200", () => pm.response.to.have.status(200));'] },
        }],
      },
    ],
  };

  await query(
    `INSERT INTO test_collections(consumer_team_id, name, collection_json, uploaded_by)
     VALUES($1, 'User Service Test Suite', $2, $3)
     ON CONFLICT DO NOTHING`,
    [team1Id, JSON.stringify(mobileCollection), adminId],
  );

  await query(
    `INSERT INTO test_collections(consumer_team_id, name, collection_json, uploaded_by)
     VALUES($1, 'Analytics API Tests', $2, $3)
     ON CONFLICT DO NOTHING`,
    [team2Id, JSON.stringify(analyticsCollection), adminId],
  );

  logger.info({
    users: ['admin@acme.dev', 'mobile-rep@acme.dev', 'analytics-rep@acme.dev'],
    specs: ['User Service API', 'Payments API'],
    specVersionIds: {
      userV1: uv1Rows[0]?.id,
      userV2: uv2Rows[0]?.id,
      paymentsV1: pv1Rows[0]?.id,
      paymentsV2: pv2Rows[0]?.id,
    },
    teams: ['Frontend Mobile Team', 'Analytics Service'],
  }, '✅ Seed completed successfully');

  await pool.end();
}

seed().catch((err) => {
  logger.error(err, 'Seed failed');
  process.exit(1);
});
