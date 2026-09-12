import { prisma } from '@vuzki/database';
import { Request, Response } from 'express';
import { config } from './config';
import { logger } from './middleware/logger';

// Liveness: process is up and able to serve HTTP. Does not probe dependencies.
export function liveness(_req: Request, res: Response) {
  res.json({
    status: 'ok',
    service: 'vuzki-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    build: process.env.BUILD_ID || 'dev',
  });
}

// Readiness: verifies required dependencies (DB, and Redis when configured)
// before signal that the instance may accept traffic. Used by orchestrators
// to gate routing and rolling restarts.
export async function readiness(_req: Request, res: Response) {
  const checks: { name: string; ok: boolean; latencyMs?: number; note?: string }[] = [];
  let ok = true;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: 'postgres', ok: true, latencyMs: Date.now() - start });
  } catch {
    checks.push({ name: 'postgres', ok: false });
    ok = false;
  }

  if (config.redisUrl) {
    const start = Date.now();
    try {
      const Redis = require('ioredis');
      const client = new Redis(config.redisUrl, {
        connectTimeout: 2500,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await client.ping();
      checks.push({ name: 'redis', ok: true, latencyMs: Date.now() - start });
      client.disconnect();
    } catch {
      checks.push({ name: 'redis', ok: false });
      ok = false;
    }
  } else {
    checks.push({ name: 'redis', ok: true, note: 'not_configured' });
  }

  const status = ok ? 'ok' : 'degraded';
  if (!ok) {
    logger.warn('readiness_check_failed', { checks });
  }

  res.status(ok ? 200 : 503).json({ status, service: 'vuzki-api', checks, timestamp: new Date().toISOString() });
}
