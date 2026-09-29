import { Router } from 'express';
import { authenticate, authorize, type AuthRequest } from '../auth/auth.middleware';
import { triggerDiffRun, getDiffRunById } from './diffs.service';
import { triggerMockRun } from '../mock-orchestrator/mock.service';
import { generateReport } from '../reporting/reports.service';
import { acknowledgeImpact } from '../consumer-registry/consumers.service';
import { query } from '../db/client';

export const diffsRouter = Router();

/**
 * POST /api/v1/diffs
 * Body: { oldVersionId, newVersionId, force? }
 */
diffsRouter.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const { oldVersionId, newVersionId, force } = req.body;
    if (!oldVersionId || !newVersionId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'oldVersionId and newVersionId required', details: null } });
    }
    const result = await triggerDiffRun(oldVersionId, newVersionId, req.user!.sub, force === true);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/diffs
 */
diffsRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT dr.id, dr.old_version_id, dr.new_version_id, dr.run_at, dr.status,
              sv_old.version_label AS old_label, sv_new.version_label AS new_label,
              s.name AS spec_name
       FROM diff_runs dr
       JOIN spec_versions sv_old ON dr.old_version_id = sv_old.id
       JOIN spec_versions sv_new ON dr.new_version_id = sv_new.id
       JOIN api_specs s ON sv_old.spec_id = s.id
       ORDER BY dr.run_at DESC LIMIT 50`,
    );
    res.json({ diffs: rows });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/diffs/:diffId
 */
diffsRouter.get('/:diffId', authenticate, async (req, res, next) => {
  try {
    const result = await getDiffRunById(req.params.diffId);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/diffs/:diffId/mock-run
 */
diffsRouter.post('/:diffId/mock-run', authenticate, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const result = await triggerMockRun(req.params.diffId, req.user!.sub);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/diffs/:diffId/report
 */
diffsRouter.get('/:diffId/report', authenticate, async (req, res, next) => {
  try {
    const format = (req.query.format as string) ?? 'json';
    const report = await generateReport(req.params.diffId, format as 'json' | 'csv');
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="impact-report-${req.params.diffId}.csv"`);
      return res.send(report);
    }
    res.json(report);
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/diffs/:diffId/acknowledge
 * Body: { impactId, action: 'acknowledge' | 'dispute', reason? }
 */
diffsRouter.post('/:diffId/acknowledge', authenticate, authorize('consumer_rep'), async (req: AuthRequest, res, next) => {
  try {
    const { impactId, action, reason } = req.body;
    if (!impactId || !action) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'impactId and action required', details: null } });
    }
    const result = await acknowledgeImpact(impactId, req.user!.sub, action, reason);
    res.json(result);
  } catch (err) { next(err); }
});
