import { Router } from 'express';
import { loginUser, refreshUserToken, registerUser } from './auth.service';
import type { UserRole } from './jwt';

export const authRouter = Router();
const VALID_ROLES: UserRole[] = ['admin', 'consumer_rep', 'reviewer'];

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
 * Body: { email, password, role?, teamId? }
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, role = 'consumer_rep', teamId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email and password required', details: null } });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'password must be at least 6 characters', details: null } });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role', details: null } });
    }
    const user = await registerUser(String(email).trim().toLowerCase(), password, role, teamId);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});
