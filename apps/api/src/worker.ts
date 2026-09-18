import { logger } from './middleware/logger';
import { startWorkerLoops } from './worker-core';

// VUZKI background worker (standalone entrypoint).
//
// Runs time-based and queue-based jobs that must not block the API request
// path. Provides the entrypoint for the worker container/process. The loop
// implementation lives in `worker-core.ts` so the consolidated single-process
// server can start the exact same loops inside the main HTTP process.

async function main() {
  startWorkerLoops();

  const shutdown = () => {
    logger.info('worker_shutdown_initiated');
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.fatal('worker_failed_to_start', { err });
  process.exit(1);
});