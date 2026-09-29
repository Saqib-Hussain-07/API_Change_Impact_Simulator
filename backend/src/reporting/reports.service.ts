import { query } from '../db/client';
import { getDiffRunById } from '../diff-engine/diffs.service';
import { createError } from '../middleware/errorHandler';
import { auditLog } from '../utils/audit';

/**
 * Generate (or retrieve) the migration checklist report for a diff run.
 * Aggregates: breaking changes, affected consumers, test results, recommended actions.
 */
export async function generateReport(
  diffRunId: string,
  format: 'json' | 'csv' = 'json',
): Promise<unknown> {
  const diffResult = await getDiffRunById(diffRunId);

  // Get test runs
  const { rows: testRuns } = await query<{
    id: string;
    status: string;
    team_name: string;
    results: unknown;
    completed_at: string;
  }>(
    `SELECT tr.id, tr.status, ct.name AS team_name, tr.results, tr.completed_at
     FROM test_runs tr
     JOIN test_collections tc ON tr.test_collection_id = tc.id
     JOIN consumer_teams ct ON tc.consumer_team_id = ct.id
     WHERE tr.diff_run_id = $1`,
    [diffRunId],
  );

  // Compute summary
  const breakingChanges = diffResult.changes.filter((c) => c.classification === 'BREAKING');
  const warningChanges = diffResult.changes.filter((c) => c.classification === 'WARNING');
  const nonBreakingChanges = diffResult.changes.filter((c) => c.classification === 'NON_BREAKING');

  // Unique affected consumers
  const affectedTeams = new Set<string>();
  for (const c of breakingChanges) {
    for (const impact of c.affectedConsumers) affectedTeams.add(impact.teamId);
  }

  const failedTestRuns = testRuns.filter((tr) => tr.status === 'failed' || tr.status === 'error');

  // Recommendations
  const recommendations: string[] = [];
  if (breakingChanges.length > 0) {
    recommendations.push(`⚠️ ${breakingChanges.length} breaking change(s) detected — coordinate with ${affectedTeams.size} affected team(s) before release.`);
  }
  if (failedTestRuns.length > 0) {
    recommendations.push(`🔴 ${failedTestRuns.length} consumer test suite(s) failing against the new API — block release until resolved.`);
  }
  if (warningChanges.length > 0) {
    recommendations.push(`⚡ ${warningChanges.length} warning(s) — review with consumers; may require migration steps.`);
  }
  if (breakingChanges.length === 0 && failedTestRuns.length === 0) {
    recommendations.push('✅ No breaking changes detected and all tests passing — safe to release.');
  }

  const summary = {
    diffRunId,
    generatedAt: new Date().toISOString(),
    overview: {
      totalChanges: diffResult.changes.length,
      breaking: breakingChanges.length,
      warnings: warningChanges.length,
      nonBreaking: nonBreakingChanges.length,
      affectedConsumers: affectedTeams.size,
      testRunsTotal: testRuns.length,
      testRunsFailing: failedTestRuns.length,
    },
    breakingChanges: breakingChanges.map((c) => ({
      id: c.id,
      type: c.changeType,
      endpoint: `${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''}`,
      field: c.fieldPath ?? null,
      explanation: c.explanation,
      affectedConsumers: c.affectedConsumers.map((ac) => ({
        team: ac.teamName,
        severity: ac.severity,
      })),
    })),
    warnings: warningChanges.map((c) => ({
      id: c.id,
      type: c.changeType,
      endpoint: `${c.httpMethod?.toUpperCase() ?? ''} ${c.endpointPath ?? ''}`,
      explanation: c.explanation,
    })),
    testResults: testRuns.map((tr) => ({
      team: tr.team_name,
      status: tr.status,
      completedAt: tr.completed_at,
    })),
    recommendations,
  };

  // Upsert migration report
  await query(
    `INSERT INTO migration_reports(diff_run_id, summary)
     VALUES($1, $2)
     ON CONFLICT (diff_run_id) DO UPDATE SET summary = EXCLUDED.summary, generated_at = NOW()`,
    [diffRunId, JSON.stringify(summary)],
  );

  if (format === 'csv') {
    return toCSV(summary);
  }

  return summary;
}

/** Sign off on a migration report (admin action) */
export async function signOffReport(
  diffRunId: string,
  userId: string,
  decision: 'approved' | 'blocked',
) {
  const { rows } = await query<{ id: string }>(
    `UPDATE migration_reports
     SET approved_by = $1, approved_at = NOW(), decision = $2
     WHERE diff_run_id = $3
     RETURNING id`,
    [userId, decision, diffRunId],
  );
  if (!rows[0]) throw createError('Migration report not found — generate report first', 404, 'NOT_FOUND');

  await auditLog({
    userId,
    actionType: `REPORT_${decision.toUpperCase()}`,
    entityType: 'migration_report',
    entityId: rows[0].id,
    metadata: { diffRunId, decision },
  });

  return { id: rows[0].id, decision };
}

/** Convert report summary to a flat CSV string */
function toCSV(summary: ReturnType<typeof buildSummaryShape>): string {
  const lines: string[] = ['Change Type,Classification,Endpoint,Field,Explanation,Affected Teams'];

  for (const c of summary.breakingChanges) {
    const teams = c.affectedConsumers.map((ac: { team: string }) => ac.team).join(';');
    lines.push([
      'breaking',
      'BREAKING',
      csvEscape(c.endpoint),
      csvEscape(c.field ?? ''),
      csvEscape(c.explanation),
      csvEscape(teams),
    ].join(','));
  }

  for (const c of summary.warnings) {
    lines.push([
      'warning',
      'WARNING',
      csvEscape(c.endpoint),
      '',
      csvEscape(c.explanation),
      '',
    ].join(','));
  }

  return lines.join('\n');
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// Type helper for TypeScript inference
function buildSummaryShape(s: ReturnType<typeof generateReport>) { return s as never; }
