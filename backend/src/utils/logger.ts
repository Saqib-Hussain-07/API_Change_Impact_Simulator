import pino from 'pino';
import type { Request, Response, NextFunction } from 'express';

export const logger = pino({
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  level: process.env.LOG_LEVEL ?? 'info',
});

/** Express request-logging middleware */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
      },
      'http request',
    );
  });
  next();
}
