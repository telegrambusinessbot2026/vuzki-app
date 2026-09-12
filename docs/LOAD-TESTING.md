# VUZKI - Load Testing Plan

This document specifies how VUZKI is load tested: realistic scenarios, tooling
(k6 or Artillery), example scenario scripts, metrics to track, how to run
against staging, how to interpret bottlenecks, and performance thresholds. It
is written for the production stack described in docs/ARCHITECTURE.md (API
replicas, Postgres, Redis-backed Socket.IO + in-process KV fallback,
background worker, external payment/RTC/AI providers).

Status: **Plan** - no load-test scripts exist in the repo yet. The scripts below
should be committed under `load-tests/` and wired into a CI/manual staging job.

## Principles

- Load tests run against **staging**, never production. Staging must mirror
  production sizing (replicas, Postgres, Redis) to be meaningful; record that
  baseline on every run.
- Every run stamps a label: scenario, environment, commit / `BUILD_ID`, date,
  replica count, DB/Redis instance type, and the RTC/payment provider mode
  (payment/RTC external calls are stubbed or use sandbox credentials).
- Test one variable at a time (shape of traffic first, then soak).
- Data is pre-seeded deterministically (users, profiles, gifts, coin packages)
  so results are comparable between runs.
- External dependencies (payments webhook, RTC token issuance, AI moderation)
  are the top candidates for being the real bottleneck - measure their latency
  separately from the API's own work.

## Tooling

Two acceptable tools; pick one and commit the config so runs are reproducible.

- **k6** (Grafana): scripted in JS, built-in load/vu ramp, HTTP + WebSocket
  (`k6/x/websockets`), thresholds, Prometheus/Influx/Grafana friendly.
- **Artillery**: Node-based, YAML/JS scenarios, supports `socket.io` protocol
  directly and `supertest`-style engines; good for realtime scenarios.

Both run headless in CI. Use --vus/--duration/ramp stages rather than static
load where possible.

## Metric vocabulary

Every scenario prints and alerts on:

- **Throughput**: requests (RPS) and events (events/s) per scenario; overall
  aggregate.
- **Latency percentiles**: p50, p95, p99, and max per HTTP endpoint and per
  socket event. Watch p95/p99 specifically - mean hides tail latency.
- **Error rate**: HTTP >= 5xx, socket ack `ok:false`, calls that never reach
  `CONNECTED`, webhook failures - as percent of total.
- **WebSocket connections**: peak concurrent, connect/disconnect rate,
  reconnect storm after a network blip.
- **DB / Redis load**: connection pool saturation, max connections, slow
  queries (> 250 ms), transaction commit latency, Redis memory + OPS, backlog
  on subscribed channels. Pull from `pg_stat_statements` and `INFO cpu`/`INFO
  memory`, plus the app's `/ready` dependency latencies.

## Scenarios

### S1: Thousands of concurrent active users (baseline)

- Shape: 5,000 simulated users, ramp to 5k over 10 minutes, hold 30 minutes.
- Behavior mix (per user): signup/login once, then browse discovery feed,
  view profiles, poll presence, check wallet - a read-heavy realistic mix.
- Assertions: p95 HTTP latency < 300 ms for non-wallet reads; error rate < 0.5%;
  zero 500s; sockets connect at >= 95% success.

### S2: Chat message volume

- Shape: 2,000 users split into pairs; each emits `message:send` at the
  sustained rate until 5M cumulative messages (10 min).
- Mix: text, media (mediaUrl), replies, reactions, read receipts.
- Watch: per-message pipeline latency (DB write + `message:received` fan-out),
  room fan-out shape, message backlog in Redis store, SpamGuard/ratelimit
  counters not firing below the configured max (30 msg/10 s per user).
- Assertions: p95 send-to-deliver latency < 500 ms end-to-end; ack failures
  < 0.1%; no message lost (DB count == acked count in DB check step).

### S3: Concurrent calls

- Shape: 1,000 concurrent call sessions (audio + video mix), each 3 minutes
  average, staggered start/end so CONNECTED peak ~800.
- Simulate the full flow: `call:initiate` -> `call:accept` -> both peers
  `call:connection CONNECTED` -> `call:gift` a few times -> `call:end`.
- Watch: call-tracker state transitions, billing correctness under load
  (every `CONNECTED` session ends with exactly one wallet debit + one creator
  earning), TURN/ICE signaling latency, and presence `IN_CALL` flux.
- Assertions: call connect success (both peers CONNECTED) >= 99%; p95
  initiate-to-connected < 2 s; billing rows match sessions 1:1; zero duplicate
  debits (reconciliation check).

### S4: High discovery traffic

- Shape: 5,000 users hammering `GET /discovery`, `GET /search`, filters and
  pagination at 2x S1 discovery rate.
- Watch: feed queries, LIKE/PASS write load, matching queue latency, index
  usage (missing indexes appear as slow queries).
- Assertions: p95 discovery/search < 400 ms; like rate sustained without 429
  (windowed at 50/min); error rate < 0.5%.

### S5: Payment spikes

- Shape: burst purchase flow at provider webhook peak (e.g. 100
  purchases/sec for 5 minutes): `createCoinsOrder` then webhook
  `handlePaymentSuccess`.
- Also test **webhook double-delivery** at scale (replay every webhook once) to
  prove idempotency under load.
- Watch: webhook verification cost, wallet transaction writes, coin-package
  lookups, `$transaction` contention on the same user's wallet.
- Assertions: p95 create-order < 400 ms; p95 webhook-handled < 500 ms;
  exactly one wallet credit per order even with replays; no wallet table lock
  buildup (avg transaction latency flat as load rises).

### S6: Notification spikes

- Shape: admin broadcast to near-all users + per-event triggers (likes,
  gifts, call alerts, moderation) sustained for 10 minutes.
- Watch: notification fan-out (push provider API latency, email/SMS cost),
  socket `notify` and store write throughput.
- Assertions: p95 notification enqueue < 300 ms; push provider errors < 1%;
  broadcast completes without OOM on the API replicas generating it.

## Example scripts

### k6 - HTTP baseline

```js
// load-tests/s1-baseline.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10m', target: 5000 },
        { duration: '30m', target: 5000 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.005'],
    http_reqs: ['rate>800'],
  },
};

const API = __ENV.API_BASE; // e.g. https://api.staging.vuzki.app

export default function () {
  const res = http.get(`${API}/api/v1/discovery?page=1`);
  check(res, { 'discovery ok': (r) => r.status === 200 });
  sleep(2 + Math.random() * 4);
}
```

### k6 + WebSocket (chat + calls)

```js
// load-tests/s3-calls.k6.js
import ws from 'k6/ws';
import { check } from 'k6';

// Custom VU handler authenticates a distinct user per VU, then drives:
//   call:initiate -> call:accept -> call:connection CONNECTED -> call:end
export const options = {
  scenarios: {
    calls: { executor: 'constant-vus', vus: 2000, duration: '10m' },
  },
  thresholds: {
    call_connect_ok: ['rate>=0.99'],
  },
};
```

### Artillery - socket.io chat

```yaml
# load-tests/s2-chat.yml
config:
  target: "https://api.staging.vuzki.app"
  socketio:
    transports: ["websocket"]
  phases:
    - duration: 600
      arrivalRate: 40       # ramp to sustained pair traffic
      rampTo: 120
  ensure:
    p95: 500
    maxErrorRate: 1
scenarios:
  - engine: "socket.io"
    flow:
      - emit:
          channel: "message:send"
          data: { conversationId: "{{ convId }}", content: "load" }
```

Run:

```bash
# k6
k6 run -e API_BASE=https://api.staging.vuzki.app load-tests/s1-baseline.k6.js

# artillery
artillery run load-tests/s2-chat.yml \
  --insecure \
  --output load-tests/results/s2-chat.json
```

## How to run against staging

1. Preflight: `scripts/migrate.sh` applied, seed data loaded, feature flags at
   production parity, payments/RTC in sandbox mode.
2. Preload VUs (SSO enabled for test accounts; disable rate limits on test
   users or seed the allowed window in advance so the test targets capacity,
   not intentional throttling).
3. Run each scenario separately; record the baseline of
   replica count / DB / Redis and external provider latencies.
4. Watch in real time: `/ready` latency breakdown, realtime metrics endpoint
   (`GET /admin/realtime` data), `pg_stat_statements`, count of live sockets.
5. After the run: reconcile DB rows (messages sent vs acked, call billing 1:1,
   wallet immutability) and capture graphs; publish results to the team.

## Identifying bottlenecks

Order of attack when a scenario fails thresholds:

1. **Client->LB/TLS**: TLS handshake cost, LB connection timeouts, head-of-line
   blocking; fix first - it pollutes every other signal.
2. **API CPU / event loop**: Node CPU at cap, socket.io callback lag;
   scale out or offload (worker already owns delete/retention/stale-call).
3. **Postgres**: slow queries from `pg_stat_statements`, index misses on
   `messages.conversationId(+receiverId)`, `walletTransaction(userId,
   createdAt)`, `call(status)` (worker poll), lock contention on `wallet` rows
   during payment bursts; tune indexes/connections, batch writes.
4. **Redis**: high OPS from ratelimit `incr` + presence pub/sub during S1/S2;
   memory pressure evicts keys and silently resets rate limits/expiry; bump
   instance or shard channels.
5. **External providers**: webhook, RTC token, push, AI moderation, OTP - these
   have their own latency and fail addresses; stub them during API-capacity
   tests and test them separately as (S5/S6 style) integration tests.
6. **Worker**: stale-call polling cadence interacting with call volume; watch
   `worker_*` logs for backlog.

## Performance thresholds (pass criteria)

| Scenario | Throughput floor | p95 latency | p99 latency | Error rate |
| --- | --- | --- | --- | --- |
| S1 baseline (5k VUs) | >= 800 RPS aggregate | <= 300 ms (reads) | <= 800 ms | <= 0.5% (0% 500s) |
| S2 chat (5M msgs) | >= 500 msg/s sustained | <= 500 ms send->deliver | <= 1.2 s | <= 0.1% acks failed |
| S3 calls (800 concurrent) | >= 800 connected calls | <= 2 s initiate->connected | <= 4 s | <= 1% connect fail; billing 1:1 |
| S4 discovery (5k VUs) | >= 600 RPS | <= 400 ms | <= 1 s | <= 0.5% |
| S5 payments (100/s) | >= 100 orders + 100 webhooks/s | <= 400/500 ms | <= 1 s | 0 duplicate credits |
| S6 notifications broadcast | broadcast <= 60 s | <= 300 ms enqueue | <= 1 s | <= 1% provider errors |

Thresholds above are starting points and must be re-baselined on staging after
each significant change (feature, migration, replica count, provider swap).
A regression against a past run fails the PR/threshold regardless of absolute
numbers.

## Soak

- Run S1 at 60% load for 24-48 hours before launch: leak growth (sockets,
  timers, memory), unbounded queues, Redis memory creep, slow-but-steady
  latency drift, worker backlog.
- Soak asserts: RSS stable (+-20%), socket counts stable, no payload backlog,
  p95 within baseline, zero OOM restarts.