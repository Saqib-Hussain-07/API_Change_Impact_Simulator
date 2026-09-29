import { Router } from 'express';
import { authenticate, authorize, type AuthRequest } from '../auth/auth.middleware';
import { generateReport, signOffReport } from './reports.service';
import { query } from '../db/client';

export const reportsRouter = Router();

/** GET /api/v1/reports/:diffId — retrieve migration checklist */
reportsRouter.get('/:diffId', authenticate, async (req, res, next) => {
  try {
    const format = (req.query.format as string) ?? 'json';
    const report = await generateReport(req.params.diffId, format as 'json' | 'csv');
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.diffId}.csv"`);
      return res.send(report);
    }
    res.json(report);
  } catch (err) { next(err); }
});

/** POST /api/v1/reports/:diffId/sign-off — admin approve/block */
reportsRouter.post('/:diffId/sign-off', authenticate, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const { decision } = req.body;
    if (!['approved', 'blocked'].includes(decision)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'decision must be approved or blocked', details: null } });
    }
    const result = await signOffReport(req.params.diffId, req.user!.sub, decision);
    res.json(result);
  } catch (err) { next(err); }
});

/** GET /api/v1/reports — list all reports */
reportsRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT mr.id, mr.diff_run_id, mr.generated_at, mr.decision,
              u.email AS approved_by_email, mr.approved_at,
              mr.summary->'overview' AS overview
       FROM migration_reports mr
       LEFT JOIN users u ON mr.approved_by = u.id
       ORDER BY mr.generated_at DESC LIMIT 50`,
    );
    res.json({ reports: rows });
  } catch (err) { next(err); }
});

/** GET /api/v1/reports/audit — audit log */
reportsRouter.get('/audit/log', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit as string ?? '50', 10), 200);
    const offset = (page - 1) * limit;
    const { rows } = await query(
      `SELECT al.id, al.action_type, al.entity_type, al.entity_id, al.timestamp, al.metadata,
              u.email AS user_email
       FROM audit_log al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.timestamp DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    res.json({ logs: rows });
  } catch (err) { next(err); }
});
