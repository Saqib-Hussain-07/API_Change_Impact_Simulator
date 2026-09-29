import { Router } from 'express';
import { loginUser, refreshUserToken, registerUser } from './auth.service';

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email and password required', details: null } });
    }
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/refresh
 * Body: { refreshToken }
 */
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'refreshToken required', details: null } });
    }
    const result = await refreshUserToken(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/register
 * Admin-only in production; open for demo/seeding
 * Body: { email, password, role, teamId? }
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, role, teamId } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email, password, role required', details: null } });
    }
    const user = await registerUser(email, password, role, teamId);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});
