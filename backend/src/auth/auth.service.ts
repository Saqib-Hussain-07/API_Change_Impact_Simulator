import bcrypt from 'bcryptjs';
import { query } from '../db/client';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  type UserRole,
} from './jwt';
import { createError } from '../middleware/errorHandler';
import { auditLog } from '../utils/audit';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: UserRole; teamId?: string };
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const { rows } = await query<{
    id: string;
    email: string;
    role: UserRole;
    password_hash: string;
    team_id: string | null;
  }>('SELECT id, email, role, password_hash, team_id FROM users WHERE email = $1', [email]);

  const user = rows[0];
  if (!user) throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    teamId: user.team_id ?? undefined,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Persist hashed refresh token
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1, $2, $3)',
    [user.id, tokenHash, expiresAt],
  );

  await auditLog({ userId: user.id, actionType: 'USER_LOGIN', entityType: 'user', entityId: user.id });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, teamId: user.team_id ?? undefined },
  };
}

export async function refreshUserToken(token: string): Promise<{ accessToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw createError('Refresh token invalid or expired', 401, 'TOKEN_INVALID');
  }

  const tokenHash = hashToken(token);
  const { rows } = await query<{ user_id: string; expires_at: string }>(
    'SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );

  if (!rows[0] || new Date(rows[0].expires_at) < new Date()) {
    throw createError('Refresh token revoked or expired', 401, 'TOKEN_REVOKED');
  }

  const accessToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    teamId: payload.teamId,
  });

  return { accessToken };
}

export async function registerUser(
  email: string,
  password: string,
  role: UserRole,
  teamId?: string,
): Promise<{ id: string; email: string; role: UserRole }> {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw createError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await query<{ id: string; email: string; role: UserRole }>(
    `INSERT INTO users(email, password_hash, role, team_id)
     VALUES($1, $2, $3, $4)
     RETURNING id, email, role`,
    [email, passwordHash, role, teamId ?? null],
  );

  return rows[0];
}
