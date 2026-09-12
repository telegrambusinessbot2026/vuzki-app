// Temporary startup diagnostic; must be the first import so it runs before
// the config/app modules are evaluated.
import './boot';
import { createServer } from 'http';
import { config } from './config';
import { createApp } from './app';
import { createRealtimeServer } from './realtime';
import { logger } from './middleware/logger';

const SHUTDOWN_TIMEOUT_MS = 5000;

async function bootstrap() {
  const app = createApp();
  const httpServer = createServer(app);

  const io = createRealtimeServer(httpServer);
  app.set('io', io);

  httpServer.listen(config.port, config.host, () => {
    logger.info('api_started', {
      host: config.host,
      port: config.port,
      env: config.env,
      build: process.env.BUILD_ID || 'dev',
      paymentProvider: config.paymentProvider,
      rtcProvider: config.rtcProvider,
      aiProvider: config.aiProvider,
      storageProvider: config.storageProvider,
      featureFlags: config.featureFlags,
    });
  });

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('api_shutdown_initiated', { signal });

    const forceExit = setTimeout(() => {
      logger.error('api_forced_exit_after_timeout', { timeoutMs: SHUTDOWN_TIMEOUT_MS });
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      io.close();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      logger.info('api_shutdown_complete');
      process.exit(0);
    } catch (err) {
      logger.error('api_shutdown_error', { err });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal('api_failed_to_start', { err });
  process.exit(1);
});
