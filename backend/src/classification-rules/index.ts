/**
 * classification-rules/index.ts
 * ============================================================
 * THE SINGLE SOURCE OF TRUTH for all breaking-change classification rules.
 *
 * Rules are implemented as pure functions (no DB access) to ensure:
 * - Testability (every rule has its own unit test)
 * - Auditability (each rule returns a human-readable explanation)
 * - Determinism (same inputs → same classification, always)
 *
 * DO NOT scatter classification logic outside this module.
 *
 * Rule set (from spec Section 6):
 *
 * BREAKING:
 *   R01 – Endpoint removed (path + method combination no longer exists)
 *   R02 – Optional request field becomes required
 *   R03 – Response field removed
 *   R04 – Field data type changed
 *   R05 – Supported response status code removed
 *   R06 – Auth/security requirements added or tightened
 *
 * WARNING:
 *   W01 – Field deprecated but still present
 *   W02 – New required request field with documented default
 *   W03 – Enum gains new values (strict consumers may break)
 *
 * NON_BREAKING:
 *   N01 – New endpoint added
 *   N02 – New optional response field added
 *   N03 – New optional request field added
 *   N04 – Description/documentation-only change
 * ============================================================
 */

export type Classification = 'BREAKING' | 'WARNING' | 'NON_BREAKING';

export type ChangeType =
  | 'endpoint_removed'           // R01
  | 'request_field_now_required' // R02
  | 'response_field_removed'     // R03
  | 'field_type_changed'         // R04
  | 'status_code_removed'        // R05
  | 'auth_tightened'             // R06
  | 'field_deprecated'           // W01
  | 'required_field_with_default'// W02
  | 'enum_values_added'          // W03
  | 'endpoint_added'             // N01
  | 'response_field_added'       // N02
  | 'request_field_added_optional'// N03
  | 'description_changed';       // N04

export interface AtomicChange {
  changeType: ChangeType;
  endpointPath?: string;
  httpMethod?: string;
  fieldPath?: string;
  /** Old value as a serializable primitive for the report */
  oldValue?: unknown;
  /** New value as a serializable primitive for the report */
  newValue?: unknown;
  /** Optional extra context from the raw diff */
  context?: Record<string, unknown>;
}

export interface ClassifiedChange extends AtomicChange {
  classification: Classification;
  /** Human-readable plain-language explanation for release managers */
  explanation: string;
}

// ── Individual rule functions ─────────────────────────────────

function classifyEndpointRemoved(c: AtomicChange): ClassifiedChange {
  // R01 – BREAKING
  return {
    ...c,
    classification: 'BREAKING',
    explanation: `The endpoint ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} has been removed. ` +
      `Any consumer calling this endpoint will receive a 404 after the change is deployed.`,
  };
}

function classifyRequestFieldNowRequired(c: AtomicChange): ClassifiedChange {
  // R02 – BREAKING
  return {
    ...c,
    classification: 'BREAKING',
    explanation: `The request field "${c.fieldPath}" on ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} ` +
      `changed from optional to required. Consumers that omit this field will receive a 400/422 error.`,
  };
}

function classifyResponseFieldRemoved(c: AtomicChange): ClassifiedChange {
  // R03 – BREAKING
  return {
    ...c,
    classification: 'BREAKING',
    explanation: `The response field "${c.fieldPath}" on ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} ` +
      `has been removed. Consumers reading this field will encounter undefined/null after the change.`,
  };
}

function classifyFieldTypeChanged(c: AtomicChange): ClassifiedChange {
  // R04 – BREAKING
  return {
    ...c,
    classification: 'BREAKING',
    explanation: `The data type of field "${c.fieldPath}" on ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} ` +
      `changed from "${c.oldValue}" to "${c.newValue}". Type mismatches will cause serialization or validation failures.`,
  };
}

function classifyStatusCodeRemoved(c: AtomicChange): ClassifiedChange {
  // R05 – BREAKING
  return {
    ...c,
    classification: 'BREAKING',
    explanation: `The response status code ${c.oldValue} on ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} ` +
      `is no longer documented. Consumers that handle this status code specifically may behave incorrectly.`,
  };
}

function classifyAuthTightened(c: AtomicChange): ClassifiedChange {
  // R06 – BREAKING
  return {
    ...c,
    classification: 'BREAKING',
    explanation: `Authentication or authorization requirements have been added/tightened on ` +
      `${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''}. ` +
      `Consumers without the required credentials will now receive 401/403.`,
  };
}

function classifyFieldDeprecated(c: AtomicChange): ClassifiedChange {
  // W01 – WARNING
  return {
    ...c,
    classification: 'WARNING',
    explanation: `The field "${c.fieldPath}" on ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} ` +
      `is now marked as deprecated. It is still functional but will be removed in a future version.`,
  };
}

function classifyRequiredFieldWithDefault(c: AtomicChange): ClassifiedChange {
  // W02 – WARNING
  return {
    ...c,
    classification: 'WARNING',
    explanation: `A new required request field "${c.fieldPath}" with a default value has been added to ` +
      `${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''}. ` +
      `Consumers that omit it may receive the default, but strict request validators could reject the call.`,
  };
}

function classifyEnumValuesAdded(c: AtomicChange): ClassifiedChange {
  // W03 – WARNING
  return {
    ...c,
    classification: 'WARNING',
    explanation: `The enum for field "${c.fieldPath}" on ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} ` +
      `has gained new values: ${JSON.stringify(c.newValue)}. ` +
      `Consumers using exhaustive switch statements or strict enum parsing may fail on the new values.`,
  };
}

function classifyEndpointAdded(c: AtomicChange): ClassifiedChange {
  // N01 – NON_BREAKING
  return {
    ...c,
    classification: 'NON_BREAKING',
    explanation: `A new endpoint ${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} has been added. ` +
      `Existing consumers are unaffected.`,
  };
}

function classifyResponseFieldAdded(c: AtomicChange): ClassifiedChange {
  // N02 – NON_BREAKING
  return {
    ...c,
    classification: 'NON_BREAKING',
    explanation: `A new optional response field "${c.fieldPath}" has been added to ` +
      `${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''}. ` +
      `Existing consumers that ignore unknown fields are unaffected.`,
  };
}

function classifyRequestFieldAddedOptional(c: AtomicChange): ClassifiedChange {
  // N03 – NON_BREAKING
  return {
    ...c,
    classification: 'NON_BREAKING',
    explanation: `A new optional request field "${c.fieldPath}" has been added to ` +
      `${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''}. ` +
      `Consumers that don't send this field continue to work normally.`,
  };
}

function classifyDescriptionChanged(c: AtomicChange): ClassifiedChange {
  // N04 – NON_BREAKING
  return {
    ...c,
    classification: 'NON_BREAKING',
    explanation: `Documentation/description text changed on ` +
      `${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''} field "${c.fieldPath ?? '(endpoint level)'}". ` +
      `This is a documentation-only change with no runtime impact.`,
  };
}

// ── Main classification dispatcher ────────────────────────────

const RULE_MAP: Record<ChangeType, (c: AtomicChange) => ClassifiedChange> = {
  endpoint_removed: classifyEndpointRemoved,
  request_field_now_required: classifyRequestFieldNowRequired,
  response_field_removed: classifyResponseFieldRemoved,
  field_type_changed: classifyFieldTypeChanged,
  status_code_removed: classifyStatusCodeRemoved,
  auth_tightened: classifyAuthTightened,
  field_deprecated: classifyFieldDeprecated,
  required_field_with_default: classifyRequiredFieldWithDefault,
  enum_values_added: classifyEnumValuesAdded,
  endpoint_added: classifyEndpointAdded,
  response_field_added: classifyResponseFieldAdded,
  request_field_added_optional: classifyRequestFieldAddedOptional,
  description_changed: classifyDescriptionChanged,
};

/**
 * Classify a single atomic change.
 * This is a pure function — no side effects, no DB calls.
 */
export function classifyChange(change: AtomicChange): ClassifiedChange {
  const ruleFn = RULE_MAP[change.changeType];
  if (!ruleFn) {
    // Unknown change type — conservative fallback: treat as WARNING
    return {
      ...change,
      classification: 'WARNING',
      explanation: `Unknown change type "${change.changeType}" — manual review required.`,
    };
  }
  return ruleFn(change);
}

/**
 * Classify a batch of atomic changes.
 * Returns an array in the same order as input.
 */
export function classifyChanges(changes: AtomicChange[]): ClassifiedChange[] {
  return changes.map(classifyChange);
}
