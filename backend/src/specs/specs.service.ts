import { query } from '../db/client';
import { parseAndValidateSpec } from './spec.validator';
import { createError } from '../middleware/errorHandler';
import { auditLog } from '../utils/audit';

export interface ApiSpec {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
}

export interface SpecVersion {
  id: string;
  specId: string;
  versionLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize?: number;
}

// ── Spec CRUD ──────────────────────────────────────────────────

export async function createApiSpec(
  name: string,
  description: string | undefined,
  ownerId: string,
): Promise<ApiSpec> {
  const { rows } = await query<ApiSpec>(
    `INSERT INTO api_specs(name, description, owner_id)
     VALUES($1, $2, $3)
     RETURNING id, name, description, owner_id AS "ownerId", created_at AS "createdAt"`,
    [name, description ?? null, ownerId],
  );
  return rows[0];
}

export async function listApiSpecs(page = 1, limit = 20): Promise<{ specs: ApiSpec[]; total: number }> {
  const offset = (page - 1) * limit;
  const { rows: specs } = await query<ApiSpec>(
    `SELECT id, name, description, owner_id AS "ownerId", created_at AS "createdAt"
     FROM api_specs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  const { rows: countRows } = await query<{ count: string }>('SELECT COUNT(*) FROM api_specs');
  return { specs, total: parseInt(countRows[0].count, 10) };
}

export async function getApiSpec(specId: string): Promise<ApiSpec> {
  const { rows } = await query<ApiSpec>(
    `SELECT id, name, description, owner_id AS "ownerId", created_at AS "createdAt"
     FROM api_specs WHERE id = $1`,
    [specId],
  );
  if (!rows[0]) throw createError('Spec not found', 404, 'NOT_FOUND');
  return rows[0];
}

// ── Spec Versions ──────────────────────────────────────────────

export async function uploadSpecVersion(
  specId: string,
  versionLabel: string,
  rawContent: string,
  uploadedBy: string,
): Promise<SpecVersion> {
  // Ensure parent spec exists
  await getApiSpec(specId);

  // Parse + validate
  const parsedSpec = await parseAndValidateSpec(rawContent);
  const fileSize = Buffer.byteLength(rawContent, 'utf8');

  const { rows } = await query<SpecVersion>(
    `INSERT INTO spec_versions(spec_id, version_label, uploaded_by, raw_spec, file_size)
     VALUES($1, $2, $3, $4, $5)
     RETURNING id, spec_id AS "specId", version_label AS "versionLabel",
               uploaded_by AS "uploadedBy", uploaded_at AS "uploadedAt", file_size AS "fileSize"`,
    [specId, versionLabel, uploadedBy, JSON.stringify(parsedSpec), fileSize],
  ).catch((err: Error) => {
    if (err.message?.includes('unique')) {
      throw createError(`Version "${versionLabel}" already exists for this spec`, 409, 'VERSION_EXISTS');
    }
    throw err;
  });

  await auditLog({
    userId: uploadedBy,
    actionType: 'SPEC_VERSION_UPLOADED',
    entityType: 'spec_version',
    entityId: rows[0].id,
    metadata: { specId, versionLabel },
  });

  return rows[0];
}

export async function listSpecVersions(
  specId: string,
  page = 1,
  limit = 20,
): Promise<{ versions: SpecVersion[]; total: number }> {
  await getApiSpec(specId);
  const offset = (page - 1) * limit;
  const { rows: versions } = await query<SpecVersion>(
    `SELECT id, spec_id AS "specId", version_label AS "versionLabel",
            uploaded_by AS "uploadedBy", uploaded_at AS "uploadedAt", file_size AS "fileSize"
     FROM spec_versions WHERE spec_id = $1 ORDER BY uploaded_at DESC LIMIT $2 OFFSET $3`,
    [specId, limit, offset],
  );
  const { rows: countRows } = await query<{ count: string }>(
    'SELECT COUNT(*) FROM spec_versions WHERE spec_id = $1',
    [specId],
  );
  return { versions, total: parseInt(countRows[0].count, 10) };
}

export async function getSpecVersionById(versionId: string): Promise<{ rawSpec: Record<string, unknown> } & SpecVersion> {
  const { rows } = await query<SpecVersion & { rawSpec: Record<string, unknown> }>(
    `SELECT id, spec_id AS "specId", version_label AS "versionLabel",
            uploaded_by AS "uploadedBy", uploaded_at AS "uploadedAt", file_size AS "fileSize",
            raw_spec AS "rawSpec"
     FROM spec_versions WHERE id = $1`,
    [versionId],
  );
  if (!rows[0]) throw createError('Spec version not found', 404, 'NOT_FOUND');
  return rows[0];
}
