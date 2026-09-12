# VUZKI Monitoring & Observability

This document defines the monitoring and observability plan for VUZKI: structured logging, what to
log, the metrics to track, health/readiness probes, error tracking (Sentry), performance monitoring,
alerting, and recommended infrastructure.

---

## 1. Structured JSON logging

The API logs structured JSON via a logger middleware (using `morgan` for request logging plus the
application logger). `LOG_LEVEL` controls verbosity (`debug`, `info`, `warn`, `error`), automatically
defaulting to `info` in production and `debug` in development.

### Standard fields

Every log entry includes:

- `timestamp` — RFC3339 time.
- `level` — `debug` | `info` | `warn` | `error`.
- `service` — e.g. `api`, `worker`.
- `build_id` — from `BUILD_ID`, for correlating logs to a release.
- `requestId` / `traceId` — for correlating a single request across logs.
- `method`, `path`, `status`, `durationMs`, `ip`, `userAgent` — for request logs.
- Domain fields (`userId`, `event`, `entityId`, `provider`, etc.) as appropriate per event.

### Redaction (mandatory)

The logger redacts sensitive values before writing. **Never log**:

- Passwords or password hashes.
- OTPs / verification codes.
- Access/refresh tokens, session secrets, or JWTs.
- Payment secrets (API keys, webhook secrets, card/PAN data).
- Full KYC data or raw identity documents.

Sensitive fields are masked (e.g. `****` or partial masks) at the source; request-body capture in
middleware redacts these keys before emission.

---

## 2. What to log

Log the following event categories with structured entries:

- **Auth events**: login success/failure, signup, logout, token refresh (success and reuse/
  rotation misuse), OTP requested/verified, password reset, account lockout, suspicious-login flags.
- **API errors**: 4xx/5xx with error class; unexpected exceptions with stack (redacted) at `error`.
- **Payments**: order/checkout created, payment confirmed/failed, refunds, webhook received
  (verified signature), idempotency deduplication hits.
- **Webhooks**: for each provider, the event id, type, verification result, and handler outcome.
- **Wallet transactions**: credits, debits, ledger balance changes (with transaction ids).
- **Admin / moderation actions**: admin logins, profile/content moderation, role/permission changes,
  setting changes (audit trail).
- **Withdrawals**: request, KYC check result, fraud screening outcome, admin approval/rejection,
  payout success/failure.
- **Security events**: rate-limit exceeded, failed admin logins, token-family revocation, account
  deletion requests, sensitive-data access.

Logs feed both debugging and the audit trail (see `docs/SECURITY.md` — Audit logging).

---

## 3. Metrics

Track these core metrics per environment:

- **Infrastructure**: CPU, memory, disk, network (per container/host); Postgres (connections, cache
  hit rate, locks, slow queries); Redis (memory, evictions, hit rate, commands/sec).
- **API latency**: p50/p95/p99 response time per route.
- **Error rate**: 5xx rate and 4xx distribution per route.
- **Database**: query latency, connection pool utilization, migration status.
- **Redis**: throughput, latency, memory pressure.
- **WebSocket connections**: concurrent connections, connect/disconnect rates, message throughput.
- **RTC failures**: call connection failures, token issuance failures, call drop rates.
- **Payment failures**: provider errors, webhook verification failures, refund failures.
- **Queue / worker failures**: job retries, dead-letter queue, processing latency.

Use dashboards to compare across environments and alert on deviation from baseline.

---

## 4. Health and readiness probes

- `/health` — **liveness**: the process is up (status `ok`).
- `/ready` — **readiness**: the process can serve traffic (DB/Redis reachable and warmed).

Both return JSON with `"status":"ok"`. These are used by:

- container healthchecks in docker-compose/Dockerfiles.
- `scripts/health-check.sh` (polls both until success or retry limit).
- `scripts/smoke-test.sh` (asserts both return `ok`).
- the deploy pipelines (staging and production) to gate/verify deploys.

Probes must be externally reachable only on the API; do not expose them to the public without
authorization or rate limiting considerations.

---

## 5. Error tracking

Send unhandled exceptions and critical errors to **Sentry** via `SENTRY_DSN`. Configure:

- Source-map upload so stack traces are readable.
- Environment/release tagging (matches `BUILD_ID`).
- Grouping by error class and route.
- Alerts on new or high-volume errors, especially `5xx` spikes, payment failures, and auth errors.

Sentry complements structured logs: logs provide full context/redaction for audits; Sentry provides
fast triage of production exceptions.

---

## 6. Performance monitoring

Track end-user and system performance:

- **Page load** (web/admin): LCP, FCP, TTFB, and render timings (via the analytics provider,
  e.g. PostHog, or browser tracing).
- **API response time**: p95/p99 per endpoint (from request logs / metrics).
- **DB query latency**: slow-query reporting and per-query timing.
- **WebSocket latency**: round-trip latency and message delivery delay.
- **Call connection time**: time to establish an RTC/call session.
- **Message delivery time**: end-to-end latency for chat messages (send to receive).

Alert on regressions vs the performance baseline.

---

## 7. Alerting

Alert on abnormal changes relative to a per-environment baseline:

- API error rate / 5xx spike.
- API latency p95 above threshold.
- Payment failure rate or webhook verification failures.
- Call connection / drop rate anomalies.
- WebSocket disconnect rate spikes.
- Worker/queue failures or backlog growth.
- Redis memory pressure or evictions.
- DB connection/lock/latency anomalies and migration failures.
- Failed admin login bursts (security).
- Readiness probes failing (service down).

Alerts should be routed to the appropriate channel with severity and runbook pointers. Use
rolling/baseline-based thresholds (e.g. z-score or multiplier of the recent historical average) to
avoid alert fatigue.

---

## 8. Recommended infrastructure

Use a managed observability stack (preferred) or self-host Prometheus + Grafana:

- **Managed** (recommended for less operational overhead): cloud provider observability, or
  managed APM + logs + metrics (e.g. Datadog/New Relic equivalents) plus Sentry.
- **Self-hosted**: Prometheus for metrics/alerting, Grafana for dashboards, Loki for logs, Tempo or
  OpenTelemetry for traces.
- Kubernetes/container deployments benefit from node/container exporters and service-level dashboards.

Reference configuration:

- `LOG_LEVEL` — controls log verbosity across environments.
- `ANALYTICS_PROVIDER` (`posthog` | `mixpanel` | `amplitude`) — powers product/performance analytics
  (page load, user journeys). `POSTHOG_HOST`/`POSTHOG_KEY`, `MIXPANEL_TOKEN`, `AMPLITUDE_KEY`.
- `SENTRY_DSN` — error tracking.

These providers should be enabled in staging and production (`off` in local development) so that
observability data reflects real integrations.
