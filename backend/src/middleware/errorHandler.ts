import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function createError(
  message: string,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown,
): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  return err;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const status = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  if (status >= 500) {
    logger.error({ err, code }, 'Unhandled error');
  }

  res.status(status).json({
    error: {
      code,
      message: err.message ?? 'An unexpected error occurred',
      details: err.details ?? null,
    },
  });
}
