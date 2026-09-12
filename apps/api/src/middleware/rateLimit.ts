import rateLimit from 'express-rate-limit';

export function rateLimiter(windowMs: number, max: number, message?: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: message || 'Too many requests, please try again later' },
    },
  });
}

export function publicRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
