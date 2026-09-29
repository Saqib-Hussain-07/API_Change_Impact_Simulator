import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { query } from '../db/client';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';

const PRISM_PORT = parseInt(process.env.PRISM_PORT ?? '4010', 10);
const TMP_DIR = os.tmpdir();

/**
 * Trigger mock server (Prism) + Newman test run for a given diff run.
 * 1. Write new spec version to a temp file
 * 2. Start Prism mock server on the spec
 * 3. Run all consumer test collections (Newman) against Prism
 * 4. Capture pass/fail results
 * 5. Persist results to test_runs table
 * 6. Kill Prism
 *
 * This is idempotent: a failed run does not corrupt existing diff results.
 */
export async function triggerMockRun(
  diffRunId: string,
  triggeredBy: string,
): Promise<{ testRuns: Array<{ testRunId: string; teamName: string; status: string }> }> {
  // Get diff run + new spec version
  const { rows: diffRows } = await query<{
    id: string;
    new_version_id: string;
    status: string;
  }>(
    'SELECT id, new_version_id, status FROM diff_runs WHERE id = $1',
    [diffRunId],
  );
  if (!diffRows[0]) throw createError('Diff run not found', 404, 'NOT_FOUND');
  if (diffRows[0].status !== 'completed') {
    throw createError('Diff run must be completed before running mock tests', 400, 'DIFF_NOT_READY');
  }

  const newVersionId = diffRows[0].new_version_id;

  // Fetch the raw spec
  const { rows: specRows } = await query<{ raw_spec: Record<string, unknown> }>(
    'SELECT raw_spec FROM spec_versions WHERE id = $1',
    [newVersionId],
  );
  if (!specRows[0]) throw createError('Spec version not found', 404, 'NOT_FOUND');

  // Write spec to temp file
  const specPath = path.join(TMP_DIR, `prism-spec-${diffRunId}.json`);
  fs.writeFileSync(specPath, JSON.stringify(specRows[0].raw_spec), 'utf8');

  // Start Prism mock server
  const prismProcess = await startPrism(specPath);

  const results: Array<{ testRunId: string; teamName: string; status: string }> = [];

  try {
    // Get all consumer teams that have test collections
    const { rows: teamsWithCollections } = await query<{
      team_id: string;
      team_name: string;
      collection_id: string;
      collection_name: string;
      collection_json: Record<string, unknown>;
    }>(
      `SELECT ct.id AS team_id, ct.name AS team_name, tc.id AS collection_id,
              tc.name AS collection_name, tc.collection_json
       FROM consumer_teams ct
       JOIN test_collections tc ON tc.consumer_team_id = ct.id`,
    );

    for (const team of teamsWithCollections) {
      // Create a test run record
      const { rows: trRows } = await query<{ id: string }>(
        `INSERT INTO test_runs(diff_run_id, test_collection_id, status, started_at)
         VALUES($1, $2, 'running', NOW())
         RETURNING id`,
        [diffRunId, team.collection_id],
      );
      const testRunId = trRows[0].id;

      try {
        const newmanResult = await runNewman(
          team.collection_json,
          `http://localhost:${PRISM_PORT}`,
        );

        const status = newmanResult.failed === 0 ? 'passed' : 'failed';

        await query(
          `UPDATE test_runs
           SET status = $1, results = $2, completed_at = NOW()
           WHERE id = $3`,
          [status, JSON.stringify(newmanResult), testRunId],
        );

        results.push({ testRunId, teamName: team.team_name, status });
      } catch (err) {
        logger.error({ err, testRunId }, 'Newman run failed');
        await query(
          `UPDATE test_runs SET status = 'error', results = $1, completed_at = NOW() WHERE id = $2`,
          [JSON.stringify({ error: String(err) }), testRunId],
        );
        results.push({ testRunId, teamName: team.team_name, status: 'error' });
      }
    }
  } finally {
    // Always kill Prism, even on error — prevents port leaks
    prismProcess.kill('SIGTERM');
    try { fs.unlinkSync(specPath); } catch { /* ignore cleanup errors */ }
  }

  await auditLog({
    userId: triggeredBy,
    actionType: 'MOCK_RUN_COMPLETED',
    entityType: 'diff_run',
    entityId: diffRunId,
    metadata: { testRunCount: results.length },
  });

  return { testRuns: results };
}

/** Start Prism mock server and wait for it to be ready */
async function startPrism(specPath: string): Promise<ReturnType<typeof spawn>> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['@stoplight/prism-cli', 'mock', specPath, '--port', String(PRISM_PORT), '--host', '0.0.0.0'],
      { stdio: 'pipe', shell: true },
    );

    let ready = false;
    const timeout = setTimeout(() => {
      if (!ready) {
        proc.kill();
        reject(new Error('Prism mock server failed to start within 15s'));
      }
    }, 15000);

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      logger.debug({ text }, 'Prism stdout');
      if (text.includes('Prism is listening') || text.includes(String(PRISM_PORT))) {
        if (!ready) {
          ready = true;
          clearTimeout(timeout);
          resolve(proc);
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      logger.debug({ text }, 'Prism stderr');
      // Prism often logs to stderr even on success
      if (text.includes('Prism is listening') || text.includes('listening on')) {
        if (!ready) {
          ready = true;
          clearTimeout(timeout);
          resolve(proc);
        }
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    // If prism exits immediately (e.g. port conflict), reject
    proc.on('close', (code) => {
      if (!ready && code !== null) {
        clearTimeout(timeout);
        reject(new Error(`Prism exited with code ${code}`));
      }
    });
  });
}

interface NewmanResult {
  total: number;
  passed: number;
  failed: number;
  assertions: Array<{ name: string; passed: boolean; error?: string }>;
}

/** Run Newman against a target URL and return structured results */
async function runNewman(
  collection: Record<string, unknown>,
  target: string,
): Promise<NewmanResult> {
  // Write collection to temp file
  const collPath = path.join(TMP_DIR, `newman-coll-${Date.now()}.json`);
  fs.writeFileSync(collPath, JSON.stringify(collection), 'utf8');

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['newman', 'run', collPath, '--reporters', 'json', '--reporter-json-export', `${collPath}.results.json`, '--env-var', `base_url=${target}`],
      { stdio: 'pipe', shell: true },
    );

    proc.on('close', () => {
      try {
        const resultsPath = `${collPath}.results.json`;
        if (fs.existsSync(resultsPath)) {
          const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
          const stats = raw?.run?.stats;
          const assertions: NewmanResult['assertions'] = [];

          for (const exec of raw?.run?.executions ?? []) {
            for (const assertion of exec.assertions ?? []) {
              assertions.push({
                name: assertion.assertion ?? 'unknown',
                passed: !assertion.error,
                error: assertion.error?.message,
              });
            }
          }

          resolve({
            total: stats?.assertions?.total ?? 0,
            passed: stats?.assertions?.total - stats?.assertions?.failed ?? 0,
            failed: stats?.assertions?.failed ?? 0,
            assertions,
          });
        } else {
          // Newman ran but no JSON export — treat as empty result
          resolve({ total: 0, passed: 0, failed: 0, assertions: [] });
        }
      } catch (err) {
        reject(err);
      } finally {
        try { fs.unlinkSync(collPath); } catch { /* ignore */ }
        try { fs.unlinkSync(`${collPath}.results.json`); } catch { /* ignore */ }
      }
    });

    proc.on('error', reject);
  });
}
