import { query } from '../db/client';
import { diffSpecs } from './openapi-differ';
import { classifyChanges, type ClassifiedChange } from '../classification-rules';
import { getSpecVersionById } from '../specs/specs.service';
import { createError } from '../middleware/errorHandler';
import { crossReferenceConsumers } from '../consumer-registry/consumers.service';
import { auditLog } from '../utils/audit';
import { logger } from '../utils/logger';

export interface DiffRunResult {
  diffRunId: string;
  oldVersionId: string;
  newVersionId: string;
  runAt: string;
  status: string;
  changes: Array<ClassifiedChange & { id: string; affectedConsumers: ConsumerImpact[] }>;
}

export interface ConsumerImpact {
  teamId: string;
  teamName: string;
  dependencyId: string;
  severity: string;
}

/**
 * Trigger a diff run between two spec versions.
 * Idempotent: if the same pair already has a completed run, return cached result unless force=true.
 */
export async function triggerDiffRun(
  oldVersionId: string,
  newVersionId: string,
  triggeredBy: string,
  force = false,
): Promise<DiffRunResult> {
  if (oldVersionId === newVersionId) {
    throw createError('Old and new versions must be different', 400, 'SAME_VERSION');
  }

  // Idempotency check
  if (!force) {
    const { rows: existing } = await query<{ id: string; status: string; run_at: string }>(
      `SELECT id, status, run_at FROM diff_runs
       WHERE old_version_id = $1 AND new_version_id = $2 AND status = 'completed'`,
      [oldVersionId, newVersionId],
    );
    if (existing[0]) {
      logger.info({ diffRunId: existing[0].id }, 'Returning cached diff run result');
      return getDiffRunById(existing[0].id);
    }
  }

  // Fetch both specs
  const [oldVersion, newVersion] = await Promise.all([
    getSpecVersionById(oldVersionId),
    getSpecVersionById(newVersionId),
  ]);

  // Create or upsert the run record
  const { rows: runRows } = await query<{ id: string }>(
    `INSERT INTO diff_runs(old_version_id, new_version_id, triggered_by, status)
     VALUES($1, $2, $3, 'running')
     ON CONFLICT (old_version_id, new_version_id)
     DO UPDATE SET status = 'running', triggered_by = EXCLUDED.triggered_by, run_at = NOW()
     RETURNING id`,
    [oldVersionId, newVersionId, triggeredBy],
  );
  const diffRunId = runRows[0].id;

  try {
    // Run the diff
    const atomicChanges = diffSpecs(
      oldVersion.rawSpec as Record<string, unknown>,
      newVersion.rawSpec as Record<string, unknown>,
    );

    // Classify every change
    const classifiedChanges = classifyChanges(atomicChanges);

    // Delete old change items if re-running (force)
    await query('DELETE FROM change_items WHERE diff_run_id = $1', [diffRunId]);

    // Persist change items
    const savedChanges: Array<ClassifiedChange & { id: string }> = [];
    for (const change of classifiedChanges) {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO change_items(diff_run_id, change_type, classification, endpoint_path, http_method, field_path, explanation, old_value, new_value)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          diffRunId,
          change.changeType,
          change.classification,
          change.endpointPath ?? null,
          change.httpMethod ?? null,
          change.fieldPath ?? null,
          change.explanation,
          change.oldValue !== undefined ? JSON.stringify(change.oldValue) : null,
          change.newValue !== undefined ? JSON.stringify(change.newValue) : null,
        ],
      );
      savedChanges.push({ ...change, id: rows[0].id });
    }

    // Cross-reference with consumer registry
    const changesWithImpact: Array<ClassifiedChange & { id: string; affectedConsumers: ConsumerImpact[] }> = [];
    for (const change of savedChanges) {
      const impacts = await crossReferenceConsumers(change, diffRunId, change.id);
      changesWithImpact.push({ ...change, affectedConsumers: impacts });
    }

    // Mark run complete
    await query(
      `UPDATE diff_runs SET status = 'completed' WHERE id = $1`,
      [diffRunId],
    );

    await auditLog({
      userId: triggeredBy,
      actionType: 'DIFF_RUN_COMPLETED',
      entityType: 'diff_run',
      entityId: diffRunId,
      metadata: { oldVersionId, newVersionId, changeCount: classifiedChanges.length },
    });

    return {
      diffRunId,
      oldVersionId,
      newVersionId,
      runAt: new Date().toISOString(),
      status: 'completed',
      changes: changesWithImpact,
    };
  } catch (err) {
    await query(`UPDATE diff_runs SET status = 'failed' WHERE id = $1`, [diffRunId]);
    throw err;
  }
}

export async function getDiffRunById(diffRunId: string): Promise<DiffRunResult> {
  const { rows: runs } = await query<{
    id: string;
    old_version_id: string;
    new_version_id: string;
    run_at: string;
    status: string;
  }>('SELECT id, old_version_id, new_version_id, run_at, status FROM diff_runs WHERE id = $1', [diffRunId]);

  if (!runs[0]) throw createError('Diff run not found', 404, 'NOT_FOUND');
  const run = runs[0];

  const { rows: changeRows } = await query<{
    id: string;
    change_type: string;
    classification: string;
    endpoint_path: string;
    http_method: string;
    field_path: string;
    explanation: string;
    old_value: unknown;
    new_value: unknown;
  }>(
    `SELECT id, change_type, classification, endpoint_path, http_method, field_path, explanation, old_value, new_value
     FROM change_items WHERE diff_run_id = $1 ORDER BY created_at`,
    [diffRunId],
  );

  const changesWithImpact = await Promise.all(
    changeRows.map(async (c) => {
      const { rows: impactRows } = await query<{
        id: string;
        consumer_team_id: string;
        team_name: string;
        dependency_id: string;
        severity: string;
      }>(
        `SELECT i.id, d.consumer_team_id, ct.name AS team_name, i.dependency_id, i.severity
         FROM impacts i
         JOIN dependencies d ON i.dependency_id = d.id
         JOIN consumer_teams ct ON d.consumer_team_id = ct.id
         WHERE i.change_item_id = $1`,
        [c.id],
      );

      return {
        id: c.id,
        changeType: c.change_type as ClassifiedChange['changeType'],
        classification: c.classification as ClassifiedChange['classification'],
        endpointPath: c.endpoint_path,
        httpMethod: c.http_method,
        fieldPath: c.field_path,
        explanation: c.explanation,
        oldValue: c.old_value,
        newValue: c.new_value,
        affectedConsumers: impactRows.map((r) => ({
          teamId: r.consumer_team_id,
          teamName: r.team_name,
          dependencyId: r.dependency_id,
          severity: r.severity,
        })),
      };
    }),
  );

  return {
    diffRunId: run.id,
    oldVersionId: run.old_version_id,
    newVersionId: run.new_version_id,
    runAt: run.run_at,
    status: run.status,
    changes: changesWithImpact,
  };
}
