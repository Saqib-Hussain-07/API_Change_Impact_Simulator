import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize, type AuthRequest } from '../auth/auth.middleware';
import {
  createApiSpec,
  listApiSpecs,
  getApiSpec,
  uploadSpecVersion,
  listSpecVersions,
} from './specs.service';

export const specsRouter = Router();

// Multer: accept text/file upload in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/json', 'application/x-yaml', 'text/yaml', 'text/plain', 'application/yaml'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.yaml') || file.originalname.endsWith('.yml') || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON and YAML files are accepted'));
    }
  },
});

// ── List & create specs ─────────────────────────────────────

specsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10);
    const limit = parseInt(req.query.limit as string ?? '20', 10);
    const result = await listApiSpecs(page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

specsRouter.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name required', details: null } });
    const spec = await createApiSpec(name, description, req.user!.sub);
    res.status(201).json({ spec });
  } catch (err) { next(err); }
});

specsRouter.get('/:specId', authenticate, async (req, res, next) => {
  try {
    const spec = await getApiSpec(req.params.specId);
    res.json({ spec });
  } catch (err) { next(err); }
});

// ── Spec Versions ────────────────────────────────────────────

/**
 * POST /api/v1/specs/:specId/versions
 * Accepts multipart/form-data with a "spec" file OR JSON body with { versionLabel, rawSpec }
 */
specsRouter.post(
  '/:specId/versions',
  authenticate,
  authorize('admin'),
  upload.single('spec'),
  async (req: AuthRequest, res, next) => {
    try {
      const { specId } = req.params;
      const { versionLabel } = req.body;

      if (!versionLabel) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'versionLabel required', details: null } });
      }

      // Get raw content from uploaded file or JSON body
      let rawContent: string;
      if (req.file) {
        rawContent = req.file.buffer.toString('utf8');
      } else if (req.body.rawSpec) {
        rawContent = typeof req.body.rawSpec === 'string' ? req.body.rawSpec : JSON.stringify(req.body.rawSpec);
      } else {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'spec file or rawSpec body required', details: null } });
      }

      const version = await uploadSpecVersion(specId, versionLabel, rawContent, req.user!.sub);
      res.status(201).json({ version });
    } catch (err) { next(err); }
  },
);

/**
 * GET /api/v1/specs/:specId/versions
 */
specsRouter.get('/:specId/versions', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10);
    const limit = parseInt(req.query.limit as string ?? '20', 10);
    const result = await listSpecVersions(req.params.specId, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});
