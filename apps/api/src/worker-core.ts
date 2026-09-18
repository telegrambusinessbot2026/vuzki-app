import { prisma } from '@vuzki/database';
import { logger } from './middleware/logger';
import { config } from './config';
import { runDeletionJob, runRetentionSweep, listDeletionJobs } from './services/deletion';
import { AccountDeletionStatus } from '@vuzki/shared';

// VUZKI background worker loops.
//
// Runs time-based and queue-based jobs that must not block the API request
// path. Originally the body of `worker.ts` (the standalone worker entrypoint);
// extracted here so the consolidated single-process server can start the same
// loops inside the main HTTP process. Jobs are idempotent/guarded so that
// concurrent execution is safe (each row is claimed by status update).

const POLL_INTERVAL_MS = 15_000;
const RETENTION_INTERVAL_MS = 60 * 60 * 1000; // hourly
const STALE_CALL_INTERVAL_MS = 30 * 1000;

export async function processPendingDeletions(batch = 50) {
  const list = await listDeletionJobs({ status: AccountDeletionStatus.PENDING, limit: batch });
  for (const job of list.items) {
    await runDeletionJob(job.userId).catch(() => {});
  }
  if (list.total) {
    logger.info('worker_deletions_processed', { count: list.items.length, remaining: list.total });
  }
}

export async function failStaleCalls() {
  const staleWindow = new Date(Date.now() - 2 * 60 * 1000);
  const updated = await prisma.call.updateMany({
    where: { status: 'RINGING', createdAt: { lt: staleWindow } },
    data: { status: 'FAILED', endedAt: new Date() },
  });
  if (updated.count) {
    logger.info('worker_stale_calls_failed', { count: updated.count });
  }
}

export async function sweepRetention() {
  if (!config.retentionEnabled) return;
  const results = await runRetentionSweep();
  logger.info('worker_retention_sweep', results);
}

export async function tick() {
  await failStaleCalls();
  await processPendingDeletions();
}

export interface WorkerLoops {
  stop: () => void;
}

/**
 * Start all worker loops. Returns a handle whose `stop()` clears every timer.
 * The initial tick runs immediately (fire-and-forget, as the standalone worker
 * did) and each interval is scheduled after that.
 */
export function startWorkerLoops(): WorkerLoops {
  logger.info('worker_started', {
    env: config.env,
    build: process.env.BUILD_ID || 'dev',
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  void tick().catch((err) => logger.error('worker_initial_tick_error', { err }));

  const poll = setInterval(() => tick().catch((err) => logger.error('worker_tick_error', { err })), POLL_INTERVAL_MS);
  const retention = setInterval(() => sweepRetention().catch((err) => logger.error('worker_retention_error', { err })), RETENTION_INTERVAL_MS);
  const staleCalls = setInterval(() => failStaleCalls().catch((err) => logger.error('worker_stale_call_error', { err })), STALE_CALL_INTERVAL_MS);

  poll.unref?.();
  retention.unref?.();
  staleCalls.unref?.();

  return {
    stop() {
      clearInterval(poll);
      clearInterval(retention);
      clearInterval(staleCalls);
    },
  };
}