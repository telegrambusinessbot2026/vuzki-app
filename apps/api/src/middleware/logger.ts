import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// Structured JSON logger. Emits a single-line JSON record per log call so that
// stdout can be scraped/forwarded by the platform logging pipeline.
//
// SECURITY: sensitive fields are redacted before anything is written to stdout.
// We never log passwords, OTPs, full auth tokens, payment secrets or KYC docs.

const LEVELS: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 };

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'otp',
  'code',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'card',
  'cvv',
  'pan',
  'kyc',
  'aadhaar',
];

const REDACTED = '[REDACTED]';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[DEPTH]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)) ? REDACTED : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function log(level: keyof typeof LEVELS, msg: string, fields?: unknown) {
  // A placeholder for a transport that is a no-op in tests/dev noise levels.
  if ((LEVELS[level] ?? 20) < (LEVELS[config.logLevel] ?? 20) && level !== 'error') {
    return;
  }
  const record = {
    time: new Date().toISOString(),
    level,
    msg,
    service: 'vuzki-api',
    ...(fields !== undefined ? (redact(fields) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(record);
  if (LEVELS[level] >= LEVELS.error) {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  debug: (msg: string, fields?: unknown) => log('debug', msg, fields),
  info: (msg: string, fields?: unknown) => log('info', msg, fields),
  warn: (msg: string, fields?: unknown) => log('warn', msg, fields),
  error: (msg: string, fields?: unknown) => log('error', msg, fields),
  fatal: (msg: string, fields?: unknown) => log('fatal', msg, fields),
};

function ip(req: Request): string {
  return req.ip || req.socket?.remoteAddress || '';
}

// HTTP request logging middleware (replaces morgan in production). Logs method,
// path, status, duration and userId when authenticated. Body is deliberately
// NOT logged to avoid leaking sensitive parameters; key sanitization happens in audit.
export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const userId = (req as any).auth?.userId || (req as any).admin?.adminId || undefined;
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    if (res.statusCode >= 500) {
      logger.error('http_request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        userId,
        ip,
      });
    } else if (config.logLevel === 'debug') {
      logger.debug('http_request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        userId,
        ip,
      });
    } else {
      logger.info('http_request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        userId,
        ip,
      });
    }
  });
  next();
}
