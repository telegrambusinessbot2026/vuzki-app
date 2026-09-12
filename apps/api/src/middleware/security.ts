import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

// ---------------------------------------------------------------------
// Defense-in-depth sanitization for user-generated content (bio, names,
// chat text, profile fields). React already escapes on render; this adds a
// server-side layer for any consumer that does not. Strips script/style tags,
// inline event handlers, and javascript:/data: URI schemes.
// ---------------------------------------------------------------------

const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|form|meta|link|base)\b[^>]*>/gi;

export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(DANGEROUS_TAGS, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '') // inline handlers
    .replace(/(?:javascript|vbscript|data)\s*:/gi, '') // URI schemes
    .trim();
}

// Recursively sanitize strings in a body object (depth-limited, arrays/clones safe).
export function sanitizeObject<T>(value: T, depth = 0): T {
  if (typeof value === 'string') return sanitizeString(value) as unknown as T;
  if (depth > 6) return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeObject(v, depth + 1)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeObject(v, depth + 1);
    }
    return out as unknown as T;
  }
  return value;
}

// Apply sanitization to text-like fields of the request body before routing.
export function xssGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// ---------------------------------------------------------------------
// Strict CORS. Only approved VUZKI origins are allowed for authenticated
// (credentialed) requests. Never sentinel '*' for credentialed requests.
// ---------------------------------------------------------------------

const FALLBACK_ORIGINS = [config.webUrl, config.adminUrl, config.websiteUrl];

export function allowedOrigins(): string[] {
  if (config.corsOrigins.length) return config.corsOrigins;
  return [...new Set(FALLBACK_ORIGINS)];
}

export function corsOrigin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  // Same-origin / non-browser requests (curl, servers, health checks) are fine.
  if (!origin) return cb(null, true);
  const allow = allowedOrigins().some((o) => o.toLowerCase() === origin.toLowerCase());
  return cb(null, allow);
}
