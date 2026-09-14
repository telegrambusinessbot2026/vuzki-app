/**
 * In-flight call timer registry.
 *
 * Single-process/in-memory scheduler for the three call lifecycle deadlines:
 *   - ring timeout      (RINGING  -> MISSED when the receiver never answers)
 *   - connect timeout   (ACCEPTED -> FAILED when WebRTC never establishes)
 *   - reconnect deadline(CONNECTED -> FAILED when a peer never returns)
 *
 * Timers are keyed by callId, fire once, auto-remove, and `.unref()` so they
 * never keep the process alive. Any terminal operation on a call MUST clear its
 * timers (see `clearCallTimers`). The system reaches in-memory semantics because
 * the live session itself lives in the KV store; the timer is only the trigger.
 */

type TimerKind = 'ring' | 'connect' | 'reconnect';

const timers = new Map<string, { kind: TimerKind; timer: NodeJS.Timeout }>();

function schedule(callId: string, kind: TimerKind, ms: number, fn: () => void) {
  replace(callId, kind, ms, fn);
}

export function replace(callId: string, kind: TimerKind, ms: number, fn: () => void) {
  disarm(callId);
  const timer = setTimeout(() => {
    timers.delete(callId);
    fn();
  }, Math.max(0, ms));
  timer.unref?.();
  timers.set(callId, { kind, timer });
}

export function armRingTimeout(callId: string, ms: number, fn: () => void) {
  schedule(callId, 'ring', ms, fn);
}

export function armConnectTimeout(callId: string, ms: number, fn: () => void) {
  schedule(callId, 'connect', ms, fn);
}

export function armReconnectDeadline(callId: string, ms: number, fn: () => void) {
  schedule(callId, 'reconnect', ms, fn);
}

export function disarm(callId: string) {
  const entry = timers.get(callId);
  if (!entry) return;
  clearTimeout(entry.timer);
  timers.delete(callId);
}

export function clearCallTimers(callId: string) {
  disarm(callId);
}

export function hasTimer(callId: string): boolean {
  return timers.has(callId);
}

export function activeTimerCount(): number {
  return timers.size;
}

export function clearAllTimers() {
  for (const { timer } of timers.values()) clearTimeout(timer);
  timers.clear();
}