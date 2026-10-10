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
  const isApiError =
    err instanceof ApiErrorResponse ||
    (typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      'code' in err &&
      typeof (err as any).status === 'number' &&
      typeof (err as any).code === 'string');

  if (isApiError) {
    const apiErr = err as ApiErrorResponse;
    return res.status(apiErr.status).json({
      success: false,
      error: {
        code: apiErr.code,
        message: apiErr.message,
        details: apiErr.details,
        fieldErrors: apiErr.fieldErrors,
      },
    });
  }

  const isZodError =
    err instanceof ZodError ||
    (typeof err === 'object' &&
      err !== null &&
      ((err as any).name === 'ZodError' || Array.isArray((err as any).issues)));

  if (isZodError) {
    const zodErr = err as ZodError;
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(zodErr.issues)) {
      for (const issue of zodErr.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
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
