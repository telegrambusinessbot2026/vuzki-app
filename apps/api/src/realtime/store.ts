import { config } from '../config';

/**
 * Distributed key/value store with pub/sub used by the realtime subsystem for
 * presence, Talk Now matching queue and rate limiting.
 *
 * Backed by Redis (ioredis) when REDIS_URL is configured and reachable; falls
 * back to an in-process Map implementation otherwise so the server still runs
 * locally / in tests without extra infrastructure. All public methods are
 * async so callers are agnostic to the backing store.
 */

type Handler = (channel: string, message: string) => void;

type Listener = { channel: string; handler: Handler };

interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  // Returns true if the key did not already exist (like Redis SETNX).
  setNx(key: string, value: string, ttlMs?: number): Promise<boolean>;
  // Increment counter and return new value. Optional TTL applied on first create.
  incr(key: string, ttlMs?: number): Promise<number>;
  expire(key: string, ttlMs: number): Promise<void>;
  // In-memory "@vuzki/entities:<id>" -> JSON-wrapped entity for match queue.
  push(key: string, value: string): Promise<void>;
  list(key: string): Promise<string[]>;
  remove(key: string, value: string): Promise<void>;
  createLocker(name: string): Locker;
  subscribe(channel: string, handler: Handler): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  close(): void;
}

interface Locker {
  acquire(key: string, ttlMs?: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

class MemoryStore implements KvStore {
  private map = new Map<string, { v: string; exp: number; list?: string[] }>();
  private listeners = new Map<string, Set<Handler>>();
  private subscribers = new Map<string, MemorySub>();

  async get(key: string) {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return e.v;
  }

  async set(key: string, value: string, ttlMs?: number) {
    this.map.set(key, { v: value, exp: ttlMs ? Date.now() + ttlMs : 0 });
  }

  async del(key: string) {
    this.map.delete(key);
  }

  async setNx(key: string, value: string, ttlMs?: number) {
    if (await this.get(key)) return false;
    await this.set(key, value, ttlMs);
    return true;
  }

  async incr(key: string, ttlMs?: number) {
    const cur = Number(await this.get(key)) || 0;
    const next = cur + 1;
    await this.set(key, String(next), ttlMs);
    return next;
  }

  async expire(key: string, ttlMs: number) {
    const e = this.map.get(key);
    if (e) e.exp = Date.now() + ttlMs;
  }

  async push(key: string, value: string) {
    const e = this.map.get(key);
    if (e && e.list) {
      if (!e.list.includes(value)) e.list.push(value);
    } else {
      await this.set(key, '', 0);
      const ne = this.map.get(key)!;
      ne.list = [value];
    }
  }

  async list(key: string) {
    const e = this.map.get(key);
    if (e?.list) return e.list;
    return [];
  }

  async remove(key: string, value: string) {
    const e = this.map.get(key);
    if (e?.list) e.list = e.list.filter((v) => v !== value);
  }

  createLocker(name: string): Locker {
    const locks = this.map;
    return {
      async acquire(lockKey: string, ttlMs = 15000) {
        const k = `lock:${name}:${lockKey}`;
        if (await thisLocksHas(locks, k)) return false;
        locks.set(k, { v: '1', exp: Date.now() + ttlMs });
        return true;
      },
      async release(lockKey: string) {
        locks.delete(`lock:${name}:${lockKey}`);
      },
    };
  }

  async subscribe(channel: string, handler: Handler) {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(handler);
    const sub = new MemorySub(channel, () => {
      const hs = this.listeners.get(channel);
      if (hs) for (const h of hs) h(channel, lastMessage);
    });
    this.subscribers.set(channel, sub);
  }

  async publish(channel: string, message: string) {
    lastMessage = message;
    const sub = this.subscribers.get(channel);
    if (sub) sub.dispatch(message);
  }

  close() {
    this.map.clear();
  }
}

let lastMessage = '';
function thisLocksHas(map: Map<string, any>, k: string) {
  const e = map.get(k);
  if (!e) return false;
  if (e.exp && e.exp < Date.now()) {
    map.delete(k);
    return false;
  }
  return true;
}

class MemorySub {
  constructor(
    public channel: string,
    public cb: () => void
  ) {}
  dispatch(message: string) {
    this.cb();
  }
}

// ---------------------------------------------------------------------------
// Redis-backed store (used when REDIS_URL present & reachable)
// ---------------------------------------------------------------------------

let redisClient: any = null;
let redisSubClient: any = null;
let tryingRedis = false;

function getRedis() {
  if (redisClient) return redisClient;
  if (!config.redisUrl || tryingRedis) return null;
  tryingRedis = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    redisClient = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    redisSubClient = redisClient.duplicate();
    redisSubClient.on('message', (channel: string, message: string) => {
      const hs = redisSubHandlers.get(channel);
      if (hs) for (const h of hs) h(channel, message);
    });
    const ready = redisClient.connect().then(() => true).catch(() => {
      redisClient = null; redisSubClient = null; return false;
    });
    // non-blocking; if it fails we fall back to memory lazily
    return redisClient;
  } catch {
    redisClient = null;
    redisSubClient = null;
    return null;
  }
}

const redisSubHandlers = new Map<string, Set<Handler>>();
let redisReady = false;

async function redisConnectPromise(): Promise<boolean> {
  if (redisReady) return true;
  const r = getRedis();
  if (!r) return false;
  try {
    await r.ping();
    redisReady = true;
    return true;
  } catch {
    redisClient = null;
    redisSubClient = null;
    return false;
  }
}

class RedisStore implements KvStore {
  private mem = new MemoryStore();

  private async use(): Promise<boolean> {
    const ok = await redisConnectPromise();
    return ok && !!redisClient;
  }

  async get(key: string) {
    if (await this.use()) return (await redisClient.get(key)) ?? null;
    return this.mem.get(key);
  }
  async set(key: string, value: string, ttlMs?: number) {
    if (await this.use()) {
      if (ttlMs) await redisClient.set(key, value, 'PX', ttlMs);
      else await redisClient.set(key, value);
      return;
    }
    return this.mem.set(key, value, ttlMs);
  }
  async del(key: string) {
    if (await this.use()) { await redisClient.del(key); return; }
    return this.mem.del(key);
  }
  async setNx(key: string, value: string, ttlMs?: number) {
    if (await this.use()) {
      const r = ttlMs ? await redisClient.set(key, value, 'PX', ttlMs, 'NX') : await redisClient.set(key, value, 'NX');
      return r === 'OK';
    }
    return this.mem.setNx(key, value, ttlMs);
  }
  async incr(key: string, ttlMs?: number) {
    if (await this.use()) {
      const n = await redisClient.incr(key);
      if (n === 1 && ttlMs) await redisClient.pexpire(key, ttlMs);
      return n;
    }
    return this.mem.incr(key, ttlMs);
  }
  async expire(key: string, ttlMs: number) {
    if (await this.use()) { await redisClient.pexpire(key, ttlMs); return; }
    return this.mem.expire(key, ttlMs);
  }
  async push(key: string, value: string) {
    if (await this.use()) { await redisClient.sadd(key, value); return; }
    return this.mem.push(key, value);
  }
  async list(key: string) {
    if (await this.use()) return await redisClient.smembers(key);
    return this.mem.list(key);
  }
  async remove(key: string, value: string) {
    if (await this.use()) { await redisClient.srem(key, value); return; }
    return this.mem.remove(key, value);
  }
  createLocker(name: string): Locker {
    const memLocker = this.mem.createLocker(name);
    const useIt = this.use.bind(this);
    return {
      async acquire(key: string, ttlMs = 15000) {
        if (await useIt()) {
          const r = await redisClient.set(`lock:${name}:${key}`, '1', 'PX', ttlMs, 'NX');
          return r === 'OK';
        }
        return memLocker.acquire(key, ttlMs);
      },
      async release(key: string) {
        if (await useIt()) { await redisClient.del(`lock:${name}:${key}`); return; }
        return memLocker.release(key);
      },
    };
  }
  async subscribe(channel: string, handler: Handler) {
    if (!redisSubHandlers.has(channel)) redisSubHandlers.set(channel, new Set());
    redisSubHandlers.get(channel)!.add(handler);
    if (await this.use() && redisSubClient) {
      await redisSubClient.subscribe(channel).catch(() => {});
    } else {
      return this.mem.subscribe(channel, handler);
    }
  }
  async publish(channel: string, message: string) {
    if (await this.use() && redisClient) {
      await redisClient.publish(channel, message).catch(() => {});
      return;
    }
    return this.mem.publish(channel, message);
  }
  close() {
    this.mem.close();
  }
}

export const kv: KvStore = new RedisStore();

/**
 * Convenience helpers preserved for callers that already awaited a lock.
 */
export function getKv() {
  return kv;
}
