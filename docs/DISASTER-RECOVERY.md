# VUZKI - Disaster Recovery Plan

This document defines how VUZKI recovers from infrastructure and dependency
outages, the failover and data-verification steps for each failure mode, and the
incident-response process (severity, escalation, post-incident review).

It is grounded in the components that actually exist in the repo:
`apps/api/src/health.ts` (liveness/readiness), `scripts/backup.sh`,
`scripts/restore.sh`, `scripts/migrate.sh`, `scripts/smoke-test.sh`,
`scripts/health-check.sh`, the in-process Redis fallback in
`apps/api/src/realtime/store.ts`, the payment webhook handler
(`apps/api/src/services/payments.ts`), and the RTC provider switch in
`apps/api/src/services/calls.ts`.

## Objectives and targets

- RPO (Recovery Point Objective): target 15 minutes using point-in-time
  recovery; logical nightly backups cover long-horizon recovery.
- RTO (Recovery Time Objective): target 60 minutes for the API serving read +
  realtime traffic after a datastore outage; faster for a single replica loss.
- All backups are encrypted; recovery artifacts live outside the primary
  environment.
- A backup is only considered valid after a restore has been **tested**
  (`scripts/restore.sh` against a disposable database, never production in
  place).

## Incident response process

### Severity classification

| Severity | Definition | Examples |
| --- | --- | --- |
| P0 | Critical: money or trust affected at scale; active data breach; platform unusable. | Payment corruption / wallet underflow, mass account compromise, major security breach (data exfiltration), core database loss with failing backups. |
| P1 | Major: a core user feature is down for a meaningful fraction of users, or payments unavailable. | API outage for a region, calls/chat reliably failing, payment provider outage rejections, withdrawal processing blocked. |
| P2 | Degraded: non-critical feature degraded or single-replica issue with redundancy absorbing it. | Slow discovery, subscription renewal delay, one API replica failing over, Redis degradation with in-process fallback active. |
| P3 | Minor: cosmetic, single-user, or easily worked around. | One report queue stuck, stale dashboard metric, typo in a notification. |

### Roles

- **Incident Commander (IC)**: owns the incident until resolution; assigns
  responders; decides severity; one person.
- **Communications**: drafts stakeholder/status updates (internal + public as
  warranted).
- **Responders (on-call engineers)**: execute the runbooks below.
- **Subject-matter experts**: payments/finance, realtime/calls, security,
  database - called in by the IC as needed.

### Escalation procedure

1. Any engineer can declare an incident and page the on-call IC.
2. IC confirms severity, opens a channel (dedicated comms channel + a draft
   post-mortem doc), and assigns responders.
3. Escalation ladder if the IC/lead responder is stuck:
   - Tier 1 on-call engineer -> Tier 2 (senior engineer) within 15 minutes of
     no progress on a P0/P1.
   - Tier 2 -> engineering lead / CTO within 30 minutes for P0.
   - P0 breaches or money-impacting ambiguity -> finance/legal notified
     through the IC (payments, user PII, regulatory).
4. Status updates: every 15 minutes on P0, 30 minutes on P1, as agreed on
   P2/P3 (to a fixed status channel; public status page if users are affected).
5. No unauthorized fixes during P0/P1 without IC sign-off - coordinated rollout
   avoids masking root causes with partial patches.

### Post-incident review

- Required for every P0/P1; recommended for P2. Within 72 hours: timeline,
  5-whys / root cause, blast radius, what worked/what didn't, and a tracked
  remediation list with owners and due dates (bugs, alerts, tests, docs).
- Every incident incident must link the verification evidence used (dashboards,
  logs, DB checks) so the DR steps below remain testable.

## Failure-mode runbooks

### Database failure (Postgres)

Symptoms: `/ready` returns 503 with `postgres: ok=false`, API 5xx, Prisma
connect errors.

Recovery steps:

1. Confirm health: `scripts/health-check.sh` against the region to scope the
   blast radius; open `/ready` and inspect checks.
2. Keep the API in read-degraded mode only if writable paths can be turned off
   safely (feature flags); otherwise stop traffic shift to a healthy region.
3. If the primary is unrecoverable, restore from the latest tested backup:
   ```bash
   TARGET_DATABASE_URL=<restored-endpoint> scripts/restore.sh
   ```
   Or, if PITR is enabled on the managed instance, replay WAL to the target RPO
   point instead of the nightly logical dump.
4. Point DNS/LB at the restored instance after readiness passes.
5. Failover alternative (managed): promote the replica (or use the managed
   provider's promote flow), confirm no split-brain (old primary fenced), then
   route traffic to it.

Data verification: `scripts/restore.sh` prints the `public` table count; then
verify with targeted queries:

```sql
SELECT count(*) FROM users WHERE deletedAt IS NULL;
SELECT sum(balance) FROM wallet;
SELECT sum(amount) FROM "walletTransaction" WHERE status = 'COMPLETED';
SELECT max("createdAt") FROM "walletTransaction";
```

Reconciliation invariant: `wallet.balance` equals the summed
`walletTransaction.amount` per user across all completed transactions; run a
reconciliation query and diff against pre-outage accounting exports before
re-enabling payments/wallet features.

Prevention: nightly `scripts/backup.sh` (encrypted, S3 + local retention),
restore testing on a scheduled cadence, PITR/WAL archiving, read replica for
reporting.

### Storage failure (object storage / CDN)

Symptoms: media (photos, KYC docs, call images) fails to load from the CDN or
uploads field errors.

Recovery steps:

1. Confirm the scope: CDN edge vs origin bucket vs upload path
   (`STORAGE_PROVIDER=s3`, bucket `vuzki-uploads`, static assets served with
   `CDN_BASE_URL`).
2. Object-storage failover: point the app's `S3_ENDPOINT`/`CDN_BASE_URL` at the
   secondary region or replica bucket (same key prefix), update env, redeploy
   config. Purge CDN cache for the affected prefixes.
3. Re-process images: re-encode/re-generate thumbnails and variants for objects
   that are corrupted or missing - a replay job keys on the affected `Photo`
   rows / media URLs, pulls originals from the backup bucket or source, and
   re-uploads the variants; assert each reprocessed object returns 200 with the
   expected content-type.
4. Missing objects documented as permanently lost are tracked per-kb in the
   post-incident review; never silently serve a 200 for a missing asset.

Data verification: sample `N` photo URLs from the DB and confirm the CDN
returns the correct content-type and byte-size; count reprocessed objects equal
to the failed-object count.

### Redis failure

Symptoms: `/ready` reports `redis: ok=false` (when `REDIS_URL` is set),
presence/match/rate-limit anomalies, realtime fan-out breaks across replicas.

Graceful degradation (already implemented in `apps/api/src/realtime/store.ts`):
the KV store lazily falls back to an in-process `MemoryStore` when Redis is
unreachable (connect failure, `retryStrategy: () => null`). Rate limiting and
presence continue to work per-instance.

Recovery steps:

1. Confirm Redis outage scope (instance vs network); keep API replicas up -
   degraded mode is expected and acceptable for short outages.
2. Restart/recover Redis; the store reconnects lazily on the next operation
   (subset state may have been served from memory during the outage).
3. Rehydrate from Postgres (source of truth) where required:
   - Presence: online states rebuild from live socket connections as clients
     rejoin (`setPresence` on every connection).
   - Rate-limit counters: reset is safe (only a temporary watchdog);
   - Talk Now match queue: cancel stale in-memory entries; users re-enter via
     `match:start`.
   - Call sessions: verify no active call is stuck as `CONNECTED`; the worker
     fails stale `RINGING` calls older than 2 minutes
     (`apps/api/src/worker.ts`).
4. During degraded memory-fallback mode, socket fan-out is per-instance, so if
   `REDIS_URL` is down and there is more than one replica, realtime rooms are
   not cross-instance: contain by pinning sessions to one replica or accept
   per-instance delivery for the outage window.

Data verification: `redis-cli ping`; after reconnect, presence list has the
same online user count as the live socket registry (gauge
`realtime.metrics.connections.active`); call sessions reflect DB `Call` states.

### API failure

Symptoms: LB 5xx, `scripts/smoke-test.sh` failures, `uptime` drops, readiness
503.

Recovery steps:

1. Confirm LBs see pods healthy: `/health` (liveness, process up) and `/ready`
   (dependency checks) gate routing; orchestrator auto-restarts unhealthy
   instances.
2. Multi-replica deployment: scale out and let the LB shift traffic; rolling
   restart one instance at a time; drain before terminating.
3. If readiness fails on Postgres/Redis, follow the DB/Redis runbooks first -
   the API cannot be read healthy while its dependencies are down.
4. Verify after restart with `scripts/health-check.sh` and
   `scripts/smoke-test.sh` (auth guard 401, 404 unknown route, oversized body
   rejection 413).

### Payment provider outage

Symptoms: payment initiation failures (`createCoinsOrder` errors), webhook
deliveries delayed/lost, `Payment` rows stuck `CREATED`/`PENDING`.

Recovery steps:

1. Confirm with the provider status page; begin provider->manual reconciliation
   queue (see below) for orders that have `CREATED` but no webhook after the
   outage window.
2. Idempotency protects replays: `handlePaymentSuccess` is idempotent on
   `orderId` (`alreadyProcessed` on `COMPLETED`) and credits coins in one
   transaction, so late/repeated webhooks are safe. Do not disable webhook
   ingestion - duplicates are secure.
3. Queue and process: providers that deliver late can be replayed by their
   dashboards/APIs; the reconciliation queue re-polls
   `payment WHERE status IN ('CREATED','PENDING')` in batches and re-triggers
   `handlePaymentSuccess` when the provider confirms capture.
4. Manual reconciliation: finance reviews any order that cannot be resolved by
   replay, against provider payout reports and the wallet/payment tables; the
   correction path uses the admin finance view and a ledger `ADJUSTMENT`
   transaction (never direct balance edits).
5. If the provider is fully down, consider a readable degradation message on
   the purchase flow; do not enable `PAYMENT_PROVIDER=demo` in any shared or
   production environment.

Data verification: reconcile
`count(payments) where status = 'COMPLETED'` equals the provider report total
for the window; every completed payment has exactly one wallet transaction with
`referenceId = orderId`; no `PENDING` payment is older than the outage window
plus SLA.

### RTC / call provider outage

Symptoms: `call:initiate` acks succeed but media never connects; clients stay
`RECONNECTING`; TURN relays fail for NAT-restricted users.

Recovery steps:

1. Confirm the RTC provider status (`RTC_PROVIDER` in
   `apps/api/src/config`): webrtc (self-hosted signaling), twilio, agora,
   livekit.
2. TURN fallback: when the primary TURN service is exhausted/down, point
   clients at the secondary TURN/STUN config (rotate `TURN_URL`/ICE servers in
   the signaling payload), then flips providers.
3. Provider failover: change `RTC_PROVIDER` env (e.g. `webrtc` -> `livekit`)
   and redeploy; `buildRtcConnection` already switches token schemes per
   provider, so clients must be compatible with at least the fallback provider.
4. In-flight calls: billing safety first - calls that cannot establish media
   must not be billed as connected minutes. Ensure the call session never
   reaches `CONNECTED` without both peers' `connection: CONNECTED`
   (`call-tracker.ts`), and manually review any calls whose session ended
   `CONNECTED` while the media provider was degraded.
5. Notify affected users only if the outage is long (status page / in-app
   banner); the worker fails stale `RINGING` calls automatically.

Data verification: active call sessions match DB `ONGOING` count; zero billed
calls with duration but no media events; RTC provider health metric green.

## Verification and drills

- Restore drill: monthly - restore the latest backup to a disposable DB, run
  the reconciliation queries above, report RTO.
- Partial failure drills: quarterly - shut down Redis, shut down one API
  replica, simulate a payment capture replay, and confirm degradation paths and
  idempotent handling.
- Security incident drill: with security team - user-data breach response,
  session revocation, backup/forensics handoff.

## What this plan does not yet cover

- No automated chaos tooling is wired into CI; drills are manual.
- No cross-region active-active replication is configured (staging/docs assume
  a single-region primary with PITR).
- Payment-provider replay automation is specified as a queue but not yet
  implemented as a runbook script.
- RTC provider failover requires a client-compatible secondary provider; the
  webrtc default keeps signaling local but media depends on ICE/TURN
  availability.

Promote to production only after the restore drill passes and P0 payment
reconciliation tooling exists (see docs/PRODUCTION-CHECKLIST.md).