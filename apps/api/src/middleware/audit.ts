import { Request, Response, NextFunction } from 'express';
import { prisma } from '@vuzki/database';

export async function auditLogger(req: Request, _res: Response, next: NextFunction) {
  const method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // Logged asynchronously, non-blocking
    prisma.auditLog
      .create({
        data: {
          actorId: (req as any).auth?.userId || (req as any).admin?.adminId || 'anonymous',
          actorType: (req as any).auth ? 'USER' : (req as any).admin ? 'ADMIN' : 'SYSTEM',
          action: `${method} ${req.path}`,
          metadata: { body: pickSanitized(req.body) } as any,
          ipAddress: req.ip,
        },
      })
      .catch(() => {});

  next();
}

function pickSanitized(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (['password', 'passwordHash', 'otp', 'code', 'token', 'refreshToken', 'accessToken'].includes(k)) {
      safe[k] = '[REDACTED]';
    } else {
      safe[k] = v;
    }
  }
  return safe;
}
