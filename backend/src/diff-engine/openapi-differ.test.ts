/**
 * diff-engine/openapi-differ.test.ts
 * ============================================================
 * Regression tests using fixture spec pairs.
 * Each test verifies that the diff engine + classifier produce
 * the exact expected classifications for known spec changes.
 * These tests MUST pass in CI before merging any changes to
 * the diff engine or classification rules.
 * ============================================================
 */

import { diffSpecs } from './openapi-differ';
import { classifyChanges } from '../classification-rules';
import userV1 from './fixtures/user-service-v1.json';
import userV2 from './fixtures/user-service-v2.json';
import ordersV1 from './fixtures/orders-api-v1.json';
import ordersV2 from './fixtures/orders-api-v2.json';
import paymentsV1 from './fixtures/payments-api-v1.json';
import paymentsV2 from './fixtures/payments-api-v2.json';

// ── Scenario 1: User Service v1 → v2 ─────────────────────────

describe('User Service v1 → v2 fixture', () => {
  const changes = classifyChanges(diffSpecs(userV1, userV2));

  it('detects DELETE /users/{id} endpoint removal (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'endpoint_removed' && c.endpointPath === '/users/{id}' && c.httpMethod === 'DELETE',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects name field becoming required on POST /users (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'request_field_now_required' &&
        c.endpointPath === '/users' &&
        c.httpMethod === 'POST' &&
        c.fieldPath?.includes('name'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects auth added on GET /users (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'auth_tightened' && c.endpointPath === '/users' && c.httpMethod === 'GET',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects 401 status code removed from GET /users (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'status_code_removed' &&
        c.endpointPath === '/users' &&
        c.httpMethod === 'GET' &&
        c.oldValue === '401',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects createdAt response field removed from POST /users (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'response_field_removed' &&
        c.endpointPath === '/users' &&
        c.httpMethod === 'POST' &&
        c.fieldPath?.includes('createdAt'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects legacyId type change integer→string on GET /users/{id} (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'field_type_changed' &&
        c.endpointPath === '/users/{id}' &&
        c.fieldPath?.includes('legacyId'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
    expect(found!.oldValue).toBe('integer');
    expect(found!.newValue).toBe('string');
  });

  it('detects legacyId deprecated on GET /users/{id} (WARNING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'field_deprecated' &&
        c.endpointPath === '/users/{id}' &&
        c.fieldPath?.includes('legacyId'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('WARNING');
  });

  it('detects enum values added (moderator) on POST /users (WARNING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'enum_values_added' && c.endpointPath === '/users',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('WARNING');
  });

  it('detects new endpoint GET /users/{id}/settings (NON_BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'endpoint_added' && c.endpointPath === '/users/{id}/settings',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('NON_BREAKING');
  });

  it('detects new optional response field socialLinks on GET /users/{id}/profile (NON_BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'response_field_added' &&
        c.endpointPath === '/users/{id}/profile' &&
        c.fieldPath?.includes('socialLinks'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('NON_BREAKING');
  });

  it('produces at least 3 BREAKING changes', () => {
    const breaking = changes.filter((c) => c.classification === 'BREAKING');
    expect(breaking.length).toBeGreaterThanOrEqual(3);
  });
});

// ── Scenario 2: Orders API v1 → v2 ───────────────────────────

describe('Orders API v1 → v2 fixture', () => {
  const changes = classifyChanges(diffSpecs(ordersV1, ordersV2));

  it('detects shippingAddress becoming required on POST /orders (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'request_field_now_required' &&
        c.endpointPath === '/orders' &&
        c.fieldPath?.includes('shippingAddress'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects DELETE /orders/{orderId} removed (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'endpoint_removed' && c.endpointPath === '/orders/{orderId}' && c.httpMethod === 'DELETE',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects totalPrice type change number→integer on GET /orders/{orderId} (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'field_type_changed' &&
        c.endpointPath === '/orders/{orderId}' &&
        c.fieldPath?.includes('totalPrice'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects estimatedDelivery response field removed from POST /orders (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'response_field_removed' &&
        c.endpointPath === '/orders' &&
        c.fieldPath?.includes('estimatedDelivery'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects 400 status code removed from POST /orders (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'status_code_removed' &&
        c.endpointPath === '/orders' &&
        c.httpMethod === 'POST',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects enum values added on GET /orders/{orderId} status field (WARNING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'enum_values_added' && c.endpointPath === '/orders/{orderId}',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('WARNING');
  });
});

// ── Scenario 3: Payments API v1 → v2 ─────────────────────────

describe('Payments API v1 → v2 fixture', () => {
  const changes = classifyChanges(diffSpecs(paymentsV1, paymentsV2));

  it('detects POST /payments/{paymentId}/refund removed (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'endpoint_removed' && c.endpointPath?.includes('refund'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects redirectUrl removed from POST /payments response (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'response_field_removed' &&
        c.endpointPath === '/payments' &&
        c.fieldPath?.includes('redirectUrl'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects amount type change integer→number on POST /payments (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'field_type_changed' &&
        c.endpointPath === '/payments' &&
        c.fieldPath?.includes('amount'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects 402 status code removed from POST /payments (BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'status_code_removed' &&
        c.endpointPath === '/payments' &&
        c.oldValue === '402',
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('BREAKING');
  });

  it('detects new optional metadata field on POST /payments (NON_BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'request_field_added_optional' &&
        c.endpointPath === '/payments' &&
        c.fieldPath?.includes('metadata'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('NON_BREAKING');
  });

  it('detects new optional failureReason on GET /payments/{paymentId}/status (NON_BREAKING)', () => {
    const found = changes.find(
      (c) => c.changeType === 'response_field_added' &&
        c.endpointPath?.includes('status') &&
        c.fieldPath?.includes('failureReason'),
    );
    expect(found).toBeDefined();
    expect(found!.classification).toBe('NON_BREAKING');
  });

  it('has no false-positive warnings on non-changed fields', () => {
    // currency field unchanged — should not appear as BREAKING
    const falsePositive = changes.find(
      (c) => c.fieldPath?.includes('currency') && c.classification === 'BREAKING',
    );
    expect(falsePositive).toBeUndefined();
  });
});

// ── General diff correctness ──────────────────────────────────

describe('diffSpecs edge cases', () => {
  it('returns empty array when both specs are identical', () => {
    const changes = diffSpecs(userV1, userV1);
    // May produce description_changed items if descriptions differ, but no structural changes
    const structural = changes.filter((c) => c.changeType !== 'description_changed');
    expect(structural).toHaveLength(0);
  });
});
