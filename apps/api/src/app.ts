import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFound } from './middleware/errors';
import { routes } from './routes';
import { auditLogger } from './middleware/audit';
import { xssGuard, corsOrigin, allowedOrigins } from './middleware/security';
import { httpLogger, logger } from './middleware/logger';
import { liveness, readiness } from './health';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security headers: strict by default. CSP is applied for the API surface
  // (it only serves JSON, so a restrictive default-src is safe); the HSTS
  // header is only meaningful over HTTPS in production.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: config.isProd ? [] : null,
        },
      },
      strictTransportSecurity: config.isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Strict CORS: only approved VUZKI domains, credentials only when configured.
  app.use(
    cors({
      origin: corsOrigin,
      credentials: config.enableCorsCredentials,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // XSS sanitization of text-like fields on the request body.
  app.use(xssGuard);

  // Structured HTTP request logging.
  app.use(httpLogger);

  if (config.logLevel === 'debug') {
    logger.debug('cors_origins', { origins: allowedOrigins() });
  }

  // Liveness + readiness probes (outside /api/v1 so they remain unauthenticated).
  app.get('/health', liveness);
  app.get('/ready', readiness);

  app.use('/api/v1', auditLogger, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
