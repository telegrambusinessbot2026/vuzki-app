import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@vuzki/types';
import { ZodError } from 'zod';
import { logger } from './logger';

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiErrorResponse) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        fieldErrors: err.fieldErrors,
      },
    });
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      fieldErrors[path] = issue.message;
    }
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fieldErrors },
    });
  }

  if (err instanceof Error) {
    logger.error('unhandled_error', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  } else {
    logger.error('unhandled_error', { err });
  }
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err as Error)?.message || 'Internal server error';
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
  });
}
