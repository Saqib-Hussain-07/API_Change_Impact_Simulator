/**
 * classification-rules/index.test.ts
 * ============================================================
 * Unit tests for every classification rule — positive AND negative cases.
 * These form the regression suite referenced in spec Section 12 CI pipeline.
 * ============================================================
 */

import { classifyChange, classifyChanges, type AtomicChange } from './index';

const BASE: Pick<AtomicChange, 'endpointPath' | 'httpMethod'> = {
  endpointPath: '/users/{id}',
  httpMethod: 'GET',
};

// ── BREAKING rules ────────────────────────────────────────────

describe('R01 – endpoint_removed → BREAKING', () => {
  it('classifies endpoint removal as BREAKING', () => {
    const change: AtomicChange = { ...BASE, changeType: 'endpoint_removed' };
    const result = classifyChange(change);
    expect(result.classification).toBe('BREAKING');
    expect(result.explanation).toContain('removed');
  });

  it('explanation includes endpoint path and method', () => {
    const change: AtomicChange = { changeType: 'endpoint_removed', endpointPath: '/orders', httpMethod: 'DELETE' };
    const result = classifyChange(change);
    expect(result.explanation).toContain('/orders');
    expect(result.explanation.toUpperCase()).toContain('DELETE');
  });
});

describe('R02 – request_field_now_required → BREAKING', () => {
  it('classifies optional→required field change as BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'request_field_now_required',
      fieldPath: 'body.email',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('BREAKING');
    expect(result.explanation).toContain('body.email');
    expect(result.explanation).toContain('required');
  });

  it('is NOT classified as NON_BREAKING', () => {
    const change: AtomicChange = { ...BASE, changeType: 'request_field_now_required', fieldPath: 'x' };
    expect(classifyChange(change).classification).not.toBe('NON_BREAKING');
  });
});

describe('R03 – response_field_removed → BREAKING', () => {
  it('classifies response field removal as BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'response_field_removed',
      fieldPath: 'response.data.userId',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('BREAKING');
    expect(result.explanation).toContain('removed');
    expect(result.explanation).toContain('response.data.userId');
  });
});

describe('R04 – field_type_changed → BREAKING', () => {
  it('classifies type change as BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'field_type_changed',
      fieldPath: 'response.id',
      oldValue: 'string',
      newValue: 'integer',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('BREAKING');
    expect(result.explanation).toContain('string');
    expect(result.explanation).toContain('integer');
  });

  it('explanation includes old and new type values', () => {
    const change: AtomicChange = {
      changeType: 'field_type_changed',
      endpointPath: '/products',
      httpMethod: 'POST',
      fieldPath: 'body.price',
      oldValue: 'integer',
      newValue: 'number',
    };
    const result = classifyChange(change);
    expect(result.explanation).toContain('integer');
    expect(result.explanation).toContain('number');
  });
});

describe('R05 – status_code_removed → BREAKING', () => {
  it('classifies status code removal as BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'status_code_removed',
      oldValue: 204,
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('BREAKING');
    expect(result.explanation).toContain('204');
  });
});

describe('R06 – auth_tightened → BREAKING', () => {
  it('classifies auth tightening as BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'auth_tightened',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('BREAKING');
    expect(result.explanation).toContain('401');
  });
});

// ── WARNING rules ─────────────────────────────────────────────

describe('W01 – field_deprecated → WARNING', () => {
  it('classifies deprecated field as WARNING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'field_deprecated',
      fieldPath: 'response.legacyId',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('WARNING');
    expect(result.explanation).toContain('deprecated');
    expect(result.explanation).toContain('legacyId');
  });

  it('is NOT classified as BREAKING', () => {
    const change: AtomicChange = { ...BASE, changeType: 'field_deprecated', fieldPath: 'x' };
    expect(classifyChange(change).classification).not.toBe('BREAKING');
  });
});

describe('W02 – required_field_with_default → WARNING', () => {
  it('classifies new required field with default as WARNING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'required_field_with_default',
      fieldPath: 'body.locale',
      newValue: 'en-US',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('WARNING');
    expect(result.explanation).toContain('locale');
  });
});

describe('W03 – enum_values_added → WARNING', () => {
  it('classifies new enum values as WARNING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'enum_values_added',
      fieldPath: 'body.status',
      newValue: ['ARCHIVED'],
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('WARNING');
    expect(result.explanation).toContain('enum');
  });
});

// ── NON_BREAKING rules ────────────────────────────────────────

describe('N01 – endpoint_added → NON_BREAKING', () => {
  it('classifies new endpoint as NON_BREAKING', () => {
    const change: AtomicChange = {
      changeType: 'endpoint_added',
      endpointPath: '/v2/users',
      httpMethod: 'GET',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('NON_BREAKING');
    expect(result.explanation).toContain('added');
  });
});

describe('N02 – response_field_added → NON_BREAKING', () => {
  it('classifies new optional response field as NON_BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'response_field_added',
      fieldPath: 'response.avatarUrl',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('NON_BREAKING');
    expect(result.explanation).toContain('avatarUrl');
  });
});

describe('N03 – request_field_added_optional → NON_BREAKING', () => {
  it('classifies new optional request field as NON_BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'request_field_added_optional',
      fieldPath: 'body.tags',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('NON_BREAKING');
    expect(result.explanation).toContain('optional');
  });
});

describe('N04 – description_changed → NON_BREAKING', () => {
  it('classifies description-only change as NON_BREAKING', () => {
    const change: AtomicChange = {
      ...BASE,
      changeType: 'description_changed',
      fieldPath: 'body.name',
    };
    const result = classifyChange(change);
    expect(result.classification).toBe('NON_BREAKING');
    expect(result.explanation.toLowerCase()).toContain('documentation');
  });
});

// ── classifyChanges (batch) ───────────────────────────────────

describe('classifyChanges (batch)', () => {
  it('processes an array of changes in order', () => {
    const changes: AtomicChange[] = [
      { changeType: 'endpoint_removed', endpointPath: '/a', httpMethod: 'GET' },
      { changeType: 'endpoint_added', endpointPath: '/b', httpMethod: 'POST' },
      { changeType: 'field_deprecated', endpointPath: '/c', httpMethod: 'PUT', fieldPath: 'x' },
    ];
    const results = classifyChanges(changes);
    expect(results).toHaveLength(3);
    expect(results[0].classification).toBe('BREAKING');
    expect(results[1].classification).toBe('NON_BREAKING');
    expect(results[2].classification).toBe('WARNING');
  });

  it('returns empty array for empty input', () => {
    expect(classifyChanges([])).toEqual([]);
  });
});

// ── Unknown change type fallback ──────────────────────────────

describe('unknown changeType fallback', () => {
  it('falls back to WARNING for unrecognized types', () => {
    const change = { changeType: 'something_new_and_weird' as never };
    const result = classifyChange(change);
    expect(result.classification).toBe('WARNING');
    expect(result.explanation).toContain('manual review');
  });
});
