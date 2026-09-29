/**
 * diff-engine/openapi-differ.ts
 * ============================================================
 * Parses two OpenAPI 3.x spec objects and produces a list of AtomicChange items.
 * Uses structural comparison (does NOT shell out to external tools, keeping the
 * engine fast and testable). The classification-rules module then assigns
 * BREAKING / WARNING / NON_BREAKING to each item.
 *
 * Performance target: <5s for 200-endpoint specs.
 * ============================================================
 */

import type { AtomicChange, ChangeType } from '../classification-rules';

// ── OpenAPI 3.x minimal type shapes ───────────────────────────

interface OASOperation {
  summary?: string;
  description?: string;
  security?: unknown[];
  parameters?: OASParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OASSchema }>;
  };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: OASSchema }> }>;
}

interface OASParameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: OASSchema;
  description?: string;
  deprecated?: boolean;
}

interface OASSchema {
  type?: string;
  properties?: Record<string, OASSchema>;
  required?: string[];
  enum?: unknown[];
  deprecated?: boolean;
  description?: string;
  default?: unknown;
  items?: OASSchema;
  $ref?: string;
}

interface OASSpec {
  openapi?: string;
  paths?: Record<string, Record<string, OASOperation>>;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

// ── Helper: get a flattened set of endpoint keys ──────────────

function getEndpoints(spec: OASSpec): Map<string, OASOperation> {
  const map = new Map<string, OASOperation>();
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (methods[method]) {
        map.set(`${method.toUpperCase()}:${path}`, methods[method]);
      }
    }
  }
  return map;
}

// ── Helper: extract schema properties recursively (flat dot-path) ──

function flattenSchema(
  schema: OASSchema | undefined,
  prefix = '',
  required: string[] = [],
): Map<string, { type?: string; required: boolean; deprecated?: boolean; enumValues?: unknown[]; default?: unknown }> {
  const result = new Map<string, { type?: string; required: boolean; deprecated?: boolean; enumValues?: unknown[]; default?: unknown }>();
  if (!schema?.properties) return result;

  for (const [key, prop] of Object.entries(schema.properties)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    result.set(fullPath, {
      type: prop.type,
      required: required.includes(key),
      deprecated: prop.deprecated,
      enumValues: prop.enum,
      default: prop.default,
    });
    // Recurse into nested objects
    if (prop.type === 'object' || prop.properties) {
      const nested = flattenSchema(prop, fullPath, prop.required ?? []);
      for (const [np, nv] of nested) result.set(np, nv);
    }
  }

  return result;
}

// ── Helper: get response schemas for a given operation ────────

interface RespFieldInfo {
  type?: string;
  statusCode: string;
  deprecated?: boolean;
  enumValues?: unknown[];
}

function getResponseFields(op: OASOperation): Map<string, RespFieldInfo> {
  const result = new Map<string, RespFieldInfo>();
  for (const [status, response] of Object.entries(op.responses ?? {})) {
    const schema = response.content?.['application/json']?.schema;
    const flat = flattenSchema(schema, '', schema?.required ?? []);
    for (const [path, info] of flat) {
      result.set(`${status}:${path}`, {
        type: info.type,
        statusCode: status,
        deprecated: info.deprecated,
        enumValues: info.enumValues,
      });
    }
  }
  return result;
}

// ── Helper: get response status codes ────────────────────────

function getStatusCodes(op: OASOperation): Set<string> {
  return new Set(Object.keys(op.responses ?? {}));
}

// ── Helper: has security requirements ────────────────────────

function hasSecurity(op: OASOperation): boolean {
  return Array.isArray(op.security) && op.security.length > 0;
}

// ── Core differ ───────────────────────────────────────────────

export function diffSpecs(oldSpec: OASSpec, newSpec: OASSpec): AtomicChange[] {
  const changes: AtomicChange[] = [];

  const oldEndpoints = getEndpoints(oldSpec);
  const newEndpoints = getEndpoints(newSpec);

  // ── R01: Endpoint removed, N01: Endpoint added ──────────────
  for (const [key, _op] of oldEndpoints) {
    if (!newEndpoints.has(key)) {
      const [method, ...pathParts] = key.split(':');
      changes.push({
        changeType: 'endpoint_removed',
        endpointPath: pathParts.join(':'),
        httpMethod: method,
      });
    }
  }

  for (const [key, _op] of newEndpoints) {
    if (!oldEndpoints.has(key)) {
      const [method, ...pathParts] = key.split(':');
      changes.push({
        changeType: 'endpoint_added',
        endpointPath: pathParts.join(':'),
        httpMethod: method,
      });
    }
  }

  // ── Diff existing endpoints ──────────────────────────────────
  for (const [key, oldOp] of oldEndpoints) {
    const newOp = newEndpoints.get(key);
    if (!newOp) continue; // already handled as removed

    const [method, ...pathParts] = key.split(':');
    const endpointPath = pathParts.join(':');
    const httpMethod = method;

    // R06: Auth tightened
    if (!hasSecurity(oldOp) && hasSecurity(newOp)) {
      changes.push({ changeType: 'auth_tightened', endpointPath, httpMethod });
    }

    // R05: Status codes removed
    const oldCodes = getStatusCodes(oldOp);
    const newCodes = getStatusCodes(newOp);
    for (const code of oldCodes) {
      if (!newCodes.has(code)) {
        changes.push({ changeType: 'status_code_removed', endpointPath, httpMethod, oldValue: code });
      }
    }

    // ── Request body schema diff ──────────────────────────────
    const oldSchema = oldOp.requestBody?.content?.['application/json']?.schema;
    const newSchema = newOp.requestBody?.content?.['application/json']?.schema;
    const oldReqFields = flattenSchema(oldSchema, '', oldSchema?.required ?? []);
    const newReqFields = flattenSchema(newSchema, '', newSchema?.required ?? []);

    for (const [fieldPath, oldInfo] of oldReqFields) {
      const newInfo = newReqFields.get(fieldPath);
      if (!newInfo) {
        // Field removed from request — generally non-breaking for requests (server ignores)
        // But check if it was required — if required field removed, it's non-breaking
        continue;
      }

      // R02: Optional → required
      if (!oldInfo.required && newInfo.required) {
        if (newInfo.default !== undefined) {
          // W02: Required with default
          changes.push({
            changeType: 'required_field_with_default',
            endpointPath,
            httpMethod,
            fieldPath: `request.${fieldPath}`,
            newValue: newInfo.default,
          });
        } else {
          changes.push({
            changeType: 'request_field_now_required',
            endpointPath,
            httpMethod,
            fieldPath: `request.${fieldPath}`,
          });
        }
      }

      // R04: Type changed (request)
      if (oldInfo.type && newInfo.type && oldInfo.type !== newInfo.type) {
        changes.push({
          changeType: 'field_type_changed',
          endpointPath,
          httpMethod,
          fieldPath: `request.${fieldPath}`,
          oldValue: oldInfo.type,
          newValue: newInfo.type,
        });
      }

      // W01: Field deprecated
      if (!oldInfo.deprecated && newInfo.deprecated) {
        changes.push({
          changeType: 'field_deprecated',
          endpointPath,
          httpMethod,
          fieldPath: `request.${fieldPath}`,
        });
      }

      // W03: Enum values added
      if (oldInfo.enumValues && newInfo.enumValues) {
        const added = (newInfo.enumValues as unknown[]).filter(
          (v) => !(oldInfo.enumValues as unknown[]).includes(v),
        );
        if (added.length > 0) {
          changes.push({
            changeType: 'enum_values_added',
            endpointPath,
            httpMethod,
            fieldPath: `request.${fieldPath}`,
            oldValue: oldInfo.enumValues,
            newValue: added,
          });
        }
      }
    }

    // N03: New optional request fields / new required fields (R02 / W02 for brand-new fields)
    for (const [fieldPath, newInfo] of newReqFields) {
      if (!oldReqFields.has(fieldPath)) {
        if (!newInfo.required) {
          // N03: new optional field — non-breaking
          changes.push({
            changeType: 'request_field_added_optional',
            endpointPath,
            httpMethod,
            fieldPath: `request.${fieldPath}`,
          });
        } else if (newInfo.default !== undefined) {
          // W02: new required field but has a default — warning
          changes.push({
            changeType: 'required_field_with_default',
            endpointPath,
            httpMethod,
            fieldPath: `request.${fieldPath}`,
            newValue: newInfo.default,
          });
        } else {
          // R02: brand-new required field with no default — BREAKING
          changes.push({
            changeType: 'request_field_now_required',
            endpointPath,
            httpMethod,
            fieldPath: `request.${fieldPath}`,
          });
        }
      }
    }

    // ── Response schema diff ──────────────────────────────────
    const oldRespFields = getResponseFields(oldOp);
    const newRespFields = getResponseFields(newOp);

    for (const [key2, oldInfo] of oldRespFields) {
      const [statusCode, ...fpParts] = key2.split(':');
      const fieldPath2 = fpParts.join(':');
      const newInfo = newRespFields.get(key2);

      if (!newInfo) {
        // R03: Response field removed
        changes.push({
          changeType: 'response_field_removed',
          endpointPath,
          httpMethod,
          fieldPath: `response[${statusCode}].${fieldPath2}`,
          oldValue: oldInfo.type,
        });
      } else {
        // R04: Type changed (response)
        if (oldInfo.type && newInfo.type && oldInfo.type !== newInfo.type) {
          changes.push({
            changeType: 'field_type_changed',
            endpointPath,
            httpMethod,
            fieldPath: `response[${statusCode}].${fieldPath2}`,
            oldValue: oldInfo.type,
            newValue: newInfo.type,
          });
        }
        // W01: Response field deprecated
        if (!oldInfo.deprecated && newInfo.deprecated) {
          changes.push({
            changeType: 'field_deprecated',
            endpointPath,
            httpMethod,
            fieldPath: `response[${statusCode}].${fieldPath2}`,
          });
        }
        // W03: Enum values added in response
        if (oldInfo.enumValues && newInfo.enumValues) {
          const added = (newInfo.enumValues as unknown[]).filter(
            (v) => !(oldInfo.enumValues as unknown[]).includes(v),
          );
          if (added.length > 0) {
            changes.push({
              changeType: 'enum_values_added',
              endpointPath,
              httpMethod,
              fieldPath: `response[${statusCode}].${fieldPath2}`,
              oldValue: oldInfo.enumValues,
              newValue: added,
            });
          }
        }
      }
    }

    // N02: New optional response fields
    for (const [key2, newInfo] of newRespFields) {
      if (!oldRespFields.has(key2)) {
        const [statusCode, ...fpParts] = key2.split(':');
        const fieldPath2 = fpParts.join(':');
        changes.push({
          changeType: 'response_field_added',
          endpointPath,
          httpMethod,
          fieldPath: `response[${statusCode}].${fieldPath2}`,
          newValue: newInfo.type,
        });
      }
    }

    // N04: Description-only change (endpoint level)
    if (oldOp.description !== newOp.description && !changes.some(
      (c) => c.endpointPath === endpointPath && c.httpMethod === httpMethod && c.changeType !== 'description_changed',
    )) {
      if (oldOp.description !== undefined || newOp.description !== undefined) {
        changes.push({
          changeType: 'description_changed',
          endpointPath,
          httpMethod,
          oldValue: oldOp.description,
          newValue: newOp.description,
        });
      }
    }
  }

  return changes;
}
