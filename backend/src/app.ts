import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './auth/auth.router';
import { specsRouter } from './specs/specs.router';
import { diffsRouter } from './diff-engine/diffs.router';
import { consumersRouter } from './consumer-registry/consumers.router';
import { reportsRouter } from './reporting/reports.router';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'api-impact-simulator' });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/specs', specsRouter);
app.use('/api/v1/diffs', diffsRouter);
app.use('/api/v1/consumers', consumersRouter);
app.use('/api/v1/reports', reportsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found', details: null } });
});

// Global error handler
app.use(errorHandler);

export default app;
