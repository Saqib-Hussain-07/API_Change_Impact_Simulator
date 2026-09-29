import { query } from '../db/client';
import { createError } from '../middleware/errorHandler';
import { auditLog } from '../utils/audit';
import type { ClassifiedChange } from '../classification-rules';

export interface ConsumerImpact {
  teamId: string;
  teamName: string;
  dependencyId: string;
  severity: string;
}

/**
 * Cross-reference a classified change against the consumer registry.
 * Only consumers that have registered a dependency on the affected endpoint/field
 * will receive an impact record. Unregistered consumers are never alerted.
 */
export async function crossReferenceConsumers(
  change: ClassifiedChange & { id: string },
  diffRunId: string,
  changeItemId: string,
): Promise<ConsumerImpact[]> {
  if (!change.endpointPath || !change.httpMethod) return [];

  // Find matching dependencies
  const { rows: deps } = await query<{
    id: string;
    consumer_team_id: string;
    team_name: string;
    field_path: string | null;
  }>(
    `SELECT d.id, d.consumer_team_id, ct.name AS team_name, d.field_path
     FROM dependencies d
     JOIN consumer_teams ct ON d.consumer_team_id = ct.id
     WHERE d.endpoint_path = $1
       AND d.http_method = $2`,
    [change.endpointPath, change.httpMethod.toUpperCase()],
  );

  const impacts: ConsumerImpact[] = [];

  for (const dep of deps) {
    // If the dependency has a field_path, only match if the change involves that field
    if (dep.field_path && change.fieldPath && !change.fieldPath.includes(dep.field_path)) {
      continue;
    }

    const severity = change.classification === 'BREAKING' ? 'HIGH'
      : change.classification === 'WARNING' ? 'MEDIUM' : 'LOW';

    // Upsert impact record
    await query(
      `INSERT INTO impacts(change_item_id, dependency_id, severity)
       VALUES($1, $2, $3)
       ON CONFLICT (change_item_id, dependency_id) DO UPDATE SET severity = EXCLUDED.severity`,
      [changeItemId, dep.id, severity],
    );

    impacts.push({
      teamId: dep.consumer_team_id,
      teamName: dep.team_name,
      dependencyId: dep.id,
      severity,
    });
  }

  return impacts;
}

/** Register a consumer team's dependency on an endpoint/field */
export async function registerDependency(
  consumerTeamId: string,
  endpointPath: string,
  httpMethod: string,
  fieldPath: string | undefined,
  registeredBy: string,
): Promise<{ id: string }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO dependencies(consumer_team_id, endpoint_path, http_method, field_path)
     VALUES($1, $2, $3, $4)
     ON CONFLICT (consumer_team_id, endpoint_path, http_method, field_path)
     DO UPDATE SET field_path = EXCLUDED.field_path
     RETURNING id`,
    [consumerTeamId, endpointPath, httpMethod.toUpperCase(), fieldPath ?? null],
  );

  await auditLog({
    userId: registeredBy,
    actionType: 'DEPENDENCY_REGISTERED',
    entityType: 'dependency',
    entityId: rows[0].id,
    metadata: { consumerTeamId, endpointPath, httpMethod, fieldPath },
  });

  return rows[0];
}

/** List dependencies for a consumer team */
export async function listDependencies(consumerTeamId: string) {
  const { rows } = await query(
    `SELECT id, endpoint_path, http_method, field_path, created_at
     FROM dependencies WHERE consumer_team_id = $1 ORDER BY created_at DESC`,
    [consumerTeamId],
  );
  return rows;
}

/** Create a consumer team */
export async function createConsumerTeam(name: string, ownerId: string) {
  const { rows } = await query<{ id: string; name: string }>(
    `INSERT INTO consumer_teams(name, owner_id) VALUES($1, $2) RETURNING id, name`,
    [name, ownerId],
  );
  return rows[0];
}

/** List all consumer teams */
export async function listConsumerTeams() {
  const { rows } = await query(
    `SELECT ct.id, ct.name, ct.created_at, COUNT(d.id) AS dependency_count
     FROM consumer_teams ct
     LEFT JOIN dependencies d ON d.consumer_team_id = ct.id
     GROUP BY ct.id ORDER BY ct.created_at DESC`,
  );
  return rows;
}

/** Register a test collection for a consumer team */
export async function registerTestCollection(
  consumerTeamId: string,
  name: string,
  collectionJson: Record<string, unknown>,
  uploadedBy: string,
) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO test_collections(consumer_team_id, name, collection_json, uploaded_by)
     VALUES($1, $2, $3, $4)
     RETURNING id`,
    [consumerTeamId, name, JSON.stringify(collectionJson), uploadedBy],
  );

  await auditLog({
    userId: uploadedBy,
    actionType: 'TEST_COLLECTION_REGISTERED',
    entityType: 'test_collection',
    entityId: rows[0].id,
    metadata: { consumerTeamId, name },
  });

  return rows[0];
}

/** Acknowledge or dispute an impact item */
export async function acknowledgeImpact(
  impactId: string,
  userId: string,
  action: 'acknowledge' | 'dispute',
  reason?: string,
) {
  if (!['acknowledge', 'dispute'].includes(action)) {
    throw createError('action must be acknowledge or dispute', 400, 'VALIDATION_ERROR');
  }

  const status = action === 'acknowledge' ? 'acknowledged' : 'disputed';
  const { rows } = await query<{ id: string }>(
    `UPDATE impacts
     SET status = $1, acknowledged_by = $2, acknowledged_at = NOW(), dispute_reason = $3
     WHERE id = $4
     RETURNING id`,
    [status, userId, reason ?? null, impactId],
  );

  if (!rows[0]) throw createError('Impact not found', 404, 'NOT_FOUND');

  await auditLog({
    userId,
    actionType: `IMPACT_${action.toUpperCase()}D`,
    entityType: 'impact',
    entityId: impactId,
    metadata: { reason },
  });

  return rows[0];
}
