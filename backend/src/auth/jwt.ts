import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export type UserRole = 'admin' | 'consumer_rep' | 'reviewer';

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: UserRole;
  teamId?: string;
}

const ACCESS_SECRET = process.env.JWT_SECRET ?? 'dev_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me';
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

/** Hash a refresh token for safe storage (never store raw tokens) */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
