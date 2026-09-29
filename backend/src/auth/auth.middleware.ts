import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload, type UserRole } from './jwt';
import { createError } from '../middleware/errorHandler';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/** Middleware: validates JWT from Authorization header */
export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(createError('Missing or invalid Authorization header', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(createError('Token invalid or expired', 401, 'TOKEN_INVALID'));
  }
}

/** Middleware factory: restricts access to specific roles */
export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Not authenticated', 401, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403, 'FORBIDDEN'));
    }
    next();
  };
}
