import SwaggerParser from 'swagger-parser';
import YAML from 'yaml';
import { createError } from '../middleware/errorHandler';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Parse a raw string (JSON or YAML) into a plain object and validate it as OpenAPI 3.0.
 * Returns the parsed document if valid, throws AppError if invalid.
 */
export async function parseAndValidateSpec(raw: string): Promise<Record<string, unknown>> {
  if (Buffer.byteLength(raw, 'utf8') > MAX_FILE_SIZE_BYTES) {
    throw createError('Spec file exceeds 5 MB limit', 413, 'FILE_TOO_LARGE');
  }

  let parsed: Record<string, unknown>;
  try {
    // Try JSON first, then YAML
    parsed = raw.trimStart().startsWith('{') ? JSON.parse(raw) : (YAML.parse(raw) as Record<string, unknown>);
  } catch {
    throw createError('Could not parse spec — must be valid JSON or YAML', 400, 'PARSE_ERROR');
  }

  // Validate as OpenAPI 3.x (swagger-parser bundles validation)
  try {
    await SwaggerParser.validate(structuredClone(parsed) as Parameters<typeof SwaggerParser.validate>[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'OpenAPI validation failed';
    throw createError(`Invalid OpenAPI spec: ${msg}`, 422, 'INVALID_SPEC');
  }

  // Enforce OpenAPI 3.0 — reject 2.x (Swagger)
  const version = (parsed as { openapi?: string }).openapi ?? '';
  if (!version.startsWith('3.')) {
    throw createError('Only OpenAPI 3.x specs are supported', 422, 'UNSUPPORTED_VERSION');
  }

  return parsed;
}
