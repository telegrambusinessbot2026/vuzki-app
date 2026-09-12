# VUZKI - Production Architecture

This document describes the intended production architecture for the VUZKI
platform: environments, components, scaling model, data flow and deployment
topology. It deliberately reflects the infrastructure actually shipped in this
repo (`infrastructure/docker/`, `scripts/`, `apps/api/src/`) so engineers can
reason about how the system runs in production.

## Environments

Three fully separate environments are required: `development`, `staging` and
`production`. Each environment owns its own infrastructure and credentials so
that nothing is ever shared between them.

| Environment | Purpose | Isolation guarantees |
| --- | --- | --- |
| development | Local/fast iteration, demo provider values allowed. | Local DB, local-or-demo payment/RTC/storage/AI/OTP providers, `PAYMENT_PROVIDER=demo` acceptable. |
| staging | Mirrors production config; acceptance and validation ground. | Separate Postgres, Redis, storage bucket, secrets, payment sandbox credentials, RTC/API keys. `PAYMENT_PROVIDER` must NOT be `demo`. |
| production | Live traffic and real money. | Separate Postgres, Redis, storage, CDN, TURN, payment live keys, secret-managed credentials. `PAYMENT_PROVIDER` must NOT be `demo`. |

Rule of thumb: never reuse a database, bucket, Redis instance, or set of
payment/API/RTC/admin credentials across environments. Production credentials
are managed through a secret manager (see `SECRETS_MANAGER_ARN` in
`.env.example`) and only injected at deploy time.

Each environment is further parameterized via env vars: `NODE_ENV`,
`ENVIRONMENT`, `BUILD_ID`, `LOG_LEVEL`, plus the full set in `.env.example`.

## Components

| Component | Details | Notes |
| --- | --- | --- |
| Public website (web) | `apps/website`, Next.js build image `vuzki-web` | Served via CDN/LB. `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`. |
| User app (web) | `apps/web`, Next.js image `vuzki-web` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`; default ports 3000. |
| Admin dashboard | `apps/admin`, image `vuzki-admin` | `NEXT_PUBLIC_API_URL`; default port 3001; talks to admin API with admin JWT. |
| Backend API | `apps/api`, Express, image `vuzki-api` | Stateless HTTP + Socket.IO server. Health on 4000. |
| PostgreSQL | `postgres:16-alpine`, image `vuzki-postgres` | Primary datastore (Prisma). In managed deployments use RDS-equivalent reached via `DATABASE_URL`. |
| Redis | `redis:7-alpine`, image `vuzki-redis` | Rate limiting, presence, sessions, socket coordination (Socket.IO adapter/redis store), job coordination. Optional locally, required for multi-instance scaling. |
| Object storage | S3-compatible (`STORAGE_PROVIDER=s3`), bucket `vuzki-uploads` | Uploads (photos, call media, kyc docs). Local `storage/` provider for dev. |
| CDN | `CDN_BASE_URL` in front of storage | Serves media. |
| WebSocket infra | Socket.IO served by the API behind the load balancer | Sticky sessions via Redis adapter; presence and call tracking in Redis. |
| RTC/TURN | Provider-based: webrtc / twilio / agora / livekit | Signaling via API, media via provider; `TURN_URL` for restrictive NATs. |
| Background worker | `apps/api/src/worker.ts`, image `vuzki-worker` | Milliseconds-poll jobs: account deletions, retention sweeps, stale-call finalization. Idempotent; scales horizontally. |
| Monitoring | `/health` + `/ready` probes, structured logs, Sentry (optional) | Orchestrator healthchecks. |
| Logging | Morgan + winston-style structured logger (`httpLogger`) | `LOG_LEVEL` configurable. |

## Docker images and compose

Dockerfiles live in `infrastructure/docker/`:

- `Dockerfile.api` - multi-stage, non-root (`USER node`), Node 22 Alpine, runs
  `node dist/server.js`, tini init, `EXPOSE 4000`, `/health` HEALTHCHECK, Prisma
  client generated at build time.
- `Dockerfile.worker` - same base, runs `node dist/worker.js`.
- `Dockerfile.web` - Next.js user app, build args `NEXT_PUBLIC_API_URL` /
  `NEXT_PUBLIC_SOCKET_URL`.
- `Dockerfile.admin` - admin dashboard, build arg `NEXT_PUBLIC_API_URL`.

`infrastructure/docker/docker-compose.yml` models the full stack locally:

- `postgres` (16-alpine) and `redis` (7-alpine) with healthchecks and persisted
  volumes (`vuzki_pgdata`, `vuzki_redisdata`).
- `migrations` - one-shot `vuzki-api` container running
  `prisma migrate deploy` (guarantees deployments apply only committed
  migrations, never auto-drop).
- `api` - depends on healthy postgres+redis; requires `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`; `/health`
  healthcheck every 30s.
- `worker` - depends on postgres+redis; honors `RETENTION_ENABLED`.
- `web` and `admin` - frontends proxying to the API.

Local start:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

The compose file intentionally drops the `5432:5432` / `6379:6379` host port
exposures in production - Postgres and Redis must only be reachable on a private
network.

## Horizontal scaling

- **Stateless API**: the Express API keeps no in-memory session state beyond
  ephemeral (per-instance) Socket.IO adapters. All durable state lives in
  Postgres; all shared runtime state (rate-limit counts, presence, sessions,
  socket membership, job locks) lives in Redis. Any number of API replicas can
  sit behind the load balancer.
- **Redis-backed socket store**: Socket.IO is wired through Redis so
  presence/socket membership and payload relaying survive multiple API
  instances - a client connected to replica A can be messaged by replica B.
- **Worker autoscaling**: `worker.ts` polls in short intervals and processes
  jobs in batches. It is safe to run multiple worker instances because each job
  is claimed by status update (idempotency header/status-guarded, e.g.
  `AccountDeletionStatus.PENDING -> PROCESSING`), and stale calls are failed by
  time windows. Scale on queue depth/job lag.
- **Frontends**: web/admin/website are static Next.js builds; scale behind the
  CDN/LB and are cacheable.

## Data flow

### Typical user flow

1. Browser/App -> CDN/LB -> web app (static assets).
2. web app -> `https://api.<env>.vuzki.app/api/v1` with `Authorization: Bearer
   <access_token>`.
3. API validates JWT (Redis-checked session), executes business logic in
   Postgres transactions (wallet debits are transactional), and emits realtime
   events (chat, call, presence, notifications) through Socket.IO.
4. User corpus/media lives in object storage served through the CDN.
5. Worker processes background jobs (deletions, retention, stale calls) that
   would otherwise block the request path.

### Payments flow

`POST /api/v1/wallet/purchase` -> create `Payment` (PENDING) -> provider
(Razorpay/Stripe/Cashfree) -> provider webhook hits `POST /api/v1/admin/payments/webhook`
-> signature-verified (required in production) -> `handlePaymentSuccess` credits
coins/wallet in a transaction.

### Realtime / calls flow

- Presence and call state tracked in Redis; call billing is persisted to
  Postgres (`Call`, `CallParticipant`, `CallTracker`) and rate by the minute in
  the API's realtime call tracker.
- Worker finalizes calls stuck in `RINGING` older than 2 minutes -> `FAILED`.

## Deployment topology

```
                         +---------------------+
                         |  CDN + LB (TLS)     |
                         |  web/admin/website  |
                         +----------+----------+
                                    |
                       proxy /api/v1, /socket.io (sticky)
                                    |
                    +---------------+---------------+
                    |            API replicas       |
                    |  (Express + Socket.IO, ...N)  |
                    +----+----------------+----+----+
                         |                |    |
                 +-------+------+   +-----+-----+        +-------------------+
                 |  PostgreSQL  |   |  Redis     | ----->| RTC provider/     |
                 |  (Prisma)    |   |  socket     |        TURN, storage/S3, |
                 +--------------+   |  adapter/   |        CDN, payments, SMS,|
                                    |  presence/  |        AI moderation     |
                 +------------------+  ratelimit  |        (external)        |
                 |  Workers (...N)  ++------------+       +-------------------+
                 +------------------+
```

```
User -> CDN -> LB -> API replica(s) -> Postgres / Redis
                        ^
                        +-- WebSocket (Socket.IO over Redis adapter)
Workers (deletion, retention, stale-call) run beside the API on the same DB/Redis.
```

## Deployment and release process

- `migrations` container applies `prisma migrate deploy` before traffic shifts;
  deploy mode never auto-drops tables (see docs/DATABASE.md).
- Pipelines: `ci.yml` (lint, typecheck, test, build on PR), `staging.yml`
  (deploy to staging, run smoke tests), `production.yml` (deploy after staging
  validation; manual approval expected).
- Probes: `GET /health` (liveness), `GET /ready` (readiness: verifies Postgres
  and Redis) gate routing and rolling restarts.
- Post-deploy: `scripts/smoke-test.sh` and `scripts/health-check.sh` verify
  health and core flows.

## Related

- Ops scripts: `scripts/migrate.sh`, `scripts/backup.sh`, `scripts/restore.sh`.
- Schema/backups: docs/DATABASE.md.
- Environments/secrets: `.env.example` at the repo root.