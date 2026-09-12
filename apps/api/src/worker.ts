import { prisma } from '@vuzki/database';
import { logger } from './middleware/logger';
import { config } from './config';
import { runDeletionJob, runRetentionSweep, listDeletionJobs } from './services/deletion';
import { AccountDeletionStatus } from '@vuzki/shared';

// VUZKI background worker.
//
// Runs time-based and queue-based jobs that must not block the API request
// path. Provides the entrypoint for the worker container. Horizontal scaling is
// supported by running multiple instances; jobs are idempotent/guarded so that
// concurrent execution is safe (each row is claimed by status update).

const POLL_INTERVAL_MS = 15_000;
const RETENTION_INTERVAL_MS = 60 * 60 * 1000; // hourly
const STALE_CALL_INTERVAL_MS = 30 * 1000;

async function processPendingDeletions(batch = 50) {
  const list = await listDeletionJobs({ status: AccountDeletionStatus.PENDING, limit: batch });
  for (const job of list.items) {
    await runDeletionJob(job.userId).catch(() => {});
  }
  if (list.total) {
    logger.info('worker_deletions_processed', { count: list.items.length, remaining: list.total });
  }
}

async function failStaleCalls() {
  const staleWindow = new Date(Date.now() - 2 * 60 * 1000);
  const updated = await prisma.call.updateMany({
    where: { status: 'RINGING', createdAt: { lt: staleWindow } },
    data: { status: 'FAILED', endedAt: new Date() },
  });
  if (updated.count) {
    logger.info('worker_stale_calls_failed', { count: updated.count });
  }
}

async function sweepRetention() {
  if (!config.retentionEnabled) return;
  const results = await runRetentionSweep();
  logger.info('worker_retention_sweep', results);
}

async function tick() {
  await failStaleCalls();
  await processPendingDeletions();
}

async function main() {
  logger.info('worker_started', { env: config.env, build: process.env.BUILD_ID || 'dev', pollIntervalMs: POLL_INTERVAL_MS });

  // Initial run, then intervals.
  await tick().catch((err) => logger.error('worker_initial_tick_error', { err }));
  setInterval(() => tick().catch((err) => logger.error('worker_tick_error', { err })), POLL_INTERVAL_MS);
  setInterval(() => sweepRetention().catch((err) => logger.error('worker_retention_error', { err })), RETENTION_INTERVAL_MS);
  setInterval(() => failStaleCalls().catch((err) => logger.error('worker_stale_call_error', { err })), STALE_CALL_INTERVAL_MS);

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
