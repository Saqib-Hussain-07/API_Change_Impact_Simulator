import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken, hashToken, type JwtPayload } from './jwt';
import { authenticate, authorize, type AuthRequest } from './auth.middleware';
import type { Response, NextFunction } from 'express';

describe('Auth JWT Utilities', () => {
  const payload: JwtPayload = {
    sub: 'user-123',
    email: 'dev@acme.dev',
    role: 'admin',
    teamId: 'team-456',
  };

  it('signs and verifies access token', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.teamId).toBe(payload.teamId);
  });

  it('signs and verifies refresh token', () => {
    const token = signRefreshToken(payload);
    expect(typeof token).toBe('string');
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
  });

  it('throws on invalid token verification', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('computes sha256 hash of a token', () => {
    const hash1 = hashToken('secret-token');
    const hash2 = hashToken('secret-token');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});

describe('Auth Middleware', () => {
  const mockRes = {} as Response;

  it('authenticates valid Bearer token', () => {
    const token = signAccessToken({ sub: 'u1', email: 'u1@test.com', role: 'admin' });
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as AuthRequest;
    const next = jest.fn() as unknown as NextFunction;

    authenticate(req, mockRes, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user?.sub).toBe('u1');
    expect(req.user?.role).toBe('admin');
  });

  it('rejects missing Authorization header', () => {
    const req = { headers: {} } as unknown as AuthRequest;
    const next = jest.fn() as unknown as NextFunction;

    authenticate(req, mockRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }));
  });

  it('rejects invalid Authorization header', () => {
    const req = { headers: { authorization: 'Bearer bad.token' } } as unknown as AuthRequest;
    const next = jest.fn() as unknown as NextFunction;

    authenticate(req, mockRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: 'TOKEN_INVALID' }));
  });

  it('authorizes allowed roles', () => {
    const req = { user: { sub: 'u1', email: 'u1@test.com', role: 'admin' } } as AuthRequest;
    const next = jest.fn() as unknown as NextFunction;

    authorize('admin')(req, mockRes, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('forbids unallowed roles', () => {
    const req = { user: { sub: 'u1', email: 'u1@test.com', role: 'consumer_rep' } } as AuthRequest;
    const next = jest.fn() as unknown as NextFunction;

    authorize('admin')(req, mockRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' }));
  });

  it('rejects unauthenticated requests in authorize', () => {
    const req = {} as AuthRequest;
    const next = jest.fn() as unknown as NextFunction;

    authorize('admin')(req, mockRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }));
  });
});
