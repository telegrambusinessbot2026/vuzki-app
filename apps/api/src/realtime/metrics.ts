/**
 * Server-side aggregates for Admin realtime metrics. Uses simple counters /
 * sets bounded to recent data (ring-buffer style). Backed by the same KV store
 * so multiple API instances report into the same aggregate when Redis is up.
 */

import { kv } from './store';

interface RealtimeMetrics {
  connections: {
    total: number;
    active: number;
    peak: number;
  };
  messages: {
    total: number;
    conversationsActive: Set<string>;
  };
  calls: {
    active: number;
    total: number;
    missed: number;
    failed: number;
    reconnections: number;
    maxConcurrent: number;
  };
  moderation: {
    flagged: number;
    blocked: number;
  };
  occupancy: Map<string, number>;
}

const M = Symbol('metrics');

class Metrics implements RealtimeMetrics {
  connections = { total: 0, active: 0, peak: 0 };
  messages = { total: 0, conversationsActive: new Set<string>() };
  calls = { active: 0, total: 0, missed: 0, failed: 0, reconnections: 0, maxConcurrent: 0 };
  moderation = { flagged: 0, blocked: 0 };
  occupancy = new Map<string, number>();

  trackCallStarted() {
    this.calls.total++;
  }
  trackCallFailed() {
    this.calls.failed++;
  }
}

let instance: Metrics | null = null;

export function getMetrics(): Metrics {
  if (!instance) instance = new Metrics();
  return instance;
}

export const realtimeMetrics: RealtimeMetrics = getMetricsObject();

function getMetricsObject(): RealtimeMetrics {
  return getMetrics();
}

export async function snapshotRealtimeMetrics() {
  const m = getMetrics();
  const activeUsers = await kv.list('presence:active-users').catch(() => []);
  return {
    connections: { ...m.connections },
    messages: {
      total: m.messages.total,
      conversationsActive: m.messages.conversationsActive.size,
    },
    calls: { ...m.calls },
    moderation: { ...m.moderation },
    activeUsers: activeUsers.length,
    occupancy: Object.fromEntries(m.occupancy),
    updatedAt: new Date().toISOString(),
  };
}

export async function trackActiveUser(userId: string) {
  await kv.push('presence:active-users', userId);
  await kv.expire('presence:active-users', 12 * 60 * 60 * 1000);
}
