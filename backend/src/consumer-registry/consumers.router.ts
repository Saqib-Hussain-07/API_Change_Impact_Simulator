import { Router } from 'express';
import { authenticate, authorize, type AuthRequest } from '../auth/auth.middleware';
import {
  createConsumerTeam,
  listConsumerTeams,
  registerDependency,
  listDependencies,
  registerTestCollection,
} from './consumers.service';

export const consumersRouter = Router();

/** GET /api/v1/consumers — list all consumer teams */
consumersRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const teams = await listConsumerTeams();
    res.json({ teams });
  } catch (err) { next(err); }
});

/** POST /api/v1/consumers — create a consumer team */
consumersRouter.post('/', authenticate, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name required', details: null } });
    const team = await createConsumerTeam(name, req.user!.sub);
    res.status(201).json({ team });
  } catch (err) { next(err); }
});

/** POST /api/v1/consumers/:consumerId/dependencies — register a dependency */
consumersRouter.post('/:consumerId/dependencies', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { endpointPath, httpMethod, fieldPath } = req.body;
    if (!endpointPath || !httpMethod) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'endpointPath and httpMethod required', details: null } });
    }
    const dep = await registerDependency(
      req.params.consumerId,
      endpointPath,
      httpMethod,
      fieldPath,
      req.user!.sub,
    );
    res.status(201).json({ dependency: dep });
  } catch (err) { next(err); }
});

/** GET /api/v1/consumers/:consumerId/dependencies — list dependencies */
consumersRouter.get('/:consumerId/dependencies', authenticate, async (req, res, next) => {
  try {
    const deps = await listDependencies(req.params.consumerId);
    res.json({ dependencies: deps });
  } catch (err) { next(err); }
});

/** POST /api/v1/consumers/:consumerId/test-collections — upload a test collection */
consumersRouter.post('/:consumerId/test-collections', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, collection } = req.body;
    if (!name || !collection) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and collection required', details: null } });
    }
    const tc = await registerTestCollection(req.params.consumerId, name, collection, req.user!.sub);
    res.status(201).json({ testCollection: tc });
  } catch (err) { next(err); }
});
