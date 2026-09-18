# VUZKI Deployment Guide

This document describes how VUZKI is built, deployed, and verified across environments. It covers
Docker images, docker-compose, database migrations, CI/CD pipelines, health checks, smoke tests,
rollback, and environment/secret handling.

---

## 1. Environments

| Environment   | Branch       | Purpose                                                        |
| ------------- | ------------ | -------------------------------------------------------------- |
| Development   | `develop`\*  | Local `docker compose` / `npm run dev`; external providers disabled. |
| Staging       | `develop`    | Pre-production; real integrations (payments/RTC/storage) with test credentials. |
| Production    | `main`        | Live traffic; manual approvals required; verified acceptance.  |

Each environment has its own `.env` file (`.env`, `.env.staging`, `.env.production`) loaded via
docker-compose `--env-file`. Secrets are delivered from a secret manager and injected at runtime
(see Section 8). Production go-live requires verified acceptance.

---

## 2. Docker images

Images are multi-stage, minimal, and run as a non-root user. They live under
`infrastructure/docker/`.

| Image         | Dockerfile                        | Purpose                                          |
| ------------- | --------------------------------- | ------------------------------------------------ |
| `vuzki-api`   | `Dockerfile.api`                  | Express API (HTTP, port 4000).                   |
| `vuzki-worker`| `Dockerfile.worker`               | Background worker (deletion, retention, stale calls). |
| `vuzki-web`   | `Dockerfile.web`                  | Next.js user-facing app (port 3000).             |
| `vuzki-admin` | `Dockerfile.admin`                | Next.js admin dashboard (port 3001).             |

### Build from repo root

```bash
# Single image
docker build -f infrastructure/docker/Dockerfile.api    -t vuzki-api:latest .
docker build -f infrastructure/docker/Dockerfile.worker -t vuzki-worker:latest .
docker build -f infrastructure/docker/Dockerfile.web    -t vuzki-web:latest --build-arg NEXT_PUBLIC_API_URL=https://api.vuzki.app/api/v1 --build-arg NEXT_PUBLIC_SOCKET_URL=https://api.vuzki.app .
docker build -f infrastructure/docker/Dockerfile.admin  -t vuzki-admin:latest --build-arg NEXT_PUBLIC_API_URL=https://api.vuzki.app/api/v1 .
```

Notes:

- Build web/admin with the **externally reachable** `NEXT_PUBLIC_API_URL` /
  `NEXT_PUBLIC_SOCKET_URL` baking at build time.
- `npm ci` and Prisma generate run inside the images; `DATABASE_URL` placeholder is used only during
  build (no live DB needed).
- CI builds/pushes `api worker web admin` targets via `docker bake` from
  `infrastructure/docker/docker-compose.yml`.

---

## 3. docker-compose

`infrastructure/docker/docker-compose.yml` defines the services. Locally:

```bash
# Bring up only backing stores for local dev
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis

# Full stack
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env up --build
```

Service roles:

- `postgres` / `redis`: local backing stores (for managed deployments these are provisioned
  externally via `DATABASE_URL` / `REDIS_URL`).
- `migrations`: one-shot container that runs `prisma migrate deploy`; never auto-drops tables.
- `api`: the API, depends on healthy postgres/redis; includes a `/health` healthcheck.
- `worker`: background worker.
- `web` / `admin`: frontends built with public build args.

Remove host port mapping for `postgres`/`redis` in production; they are private.

---

## 4. Database migrations

Migrations are managed by Prisma; version-controlled under
`packages/database/prisma/migrations`. Use `scripts/migrate.sh`:

```bash
DATABASE_URL=... scripts/migrate.sh
```

Rules:

- Use **deploy mode** (`prisma migrate deploy`), which is safe and **never auto-drops** tables.
- Migrations must **pass staging** before being applied to production.
- Verify DB drift/readiness before applying to production (see production workflow).
- Backups must be tested before relying on them (`scripts/backup.sh`, `scripts/restore.sh`).

---

## 5. CI/CD

### CI (`ci.yml`) — quality gate on PR/push to `main` and `develop`

- **quality** job (matrix `web`, `admin`, `api`, `website`): install, `prisma generate`,
  typecheck, lint, unit tests (api), and production build per workspace.
- **integration** job: spins up Postgres 16, runs `db:generate` + `db:migrate` + seed, runs the API
  integration test suite against a real database.
- **security** job: `npm audit` (high/critical) plus Trivy filesystem secret + vulnerability scan
  (`severity: HIGH,CRITICAL`, `exit-code: 1`).

### Staging (`staging.yml`) — deploy on push to `develop` or manual dispatch

- Builds and pushes images (`api worker web admin`) to the registry.
- SSHes to the staging host, pulls images, runs the one-shot `migrations` container, then brings up
  `api worker web admin`.
- Runs smoke/health checks against `staging-api.vuzki.app` (`/health`, `/ready`) and the staging app.
- Sends a failure notification if the deploy fails.

### Production (`production.yml`) — manual dispatch, gated by environment approvals

- Uses the `production` GitHub Environment with required reviewers — a human must approve.
- Accepts an optional `image_tag` input (default `latest`).
- Builds and pushes images with production secrets.
- **Verifies DB compatibility** (`prisma migrate diff` against migrations) before touching data.
- Runs **staging-tested** migrations via `prisma migrate deploy`.
- Deploys services, then runs post-deploy health checks (`/health`, `/ready`).
- **Verifies critical services**: API liveness, running containers, DB connectivity (`SELECT 1`).
- Notifies on success; rollback guidance referenced in Section 7.

---

## 6. Deployment steps

### Staging

1. Merge/push to `develop` (or run `Deploy Staging` manually).
2. CI builds and pushes images.
3. SSH deploy: pull images, run migrations (one-shot), start services.
4. Health checks pass against `/health` and `/ready`; staging app responds 200.

### Production

1. Sanity-check the target commit on staging and confirm migration/acceptance there.
2. Trigger `Deploy Production` with the desired `image_tag`.
3. Human approval via the GitHub `production` environment protection rules.
4. Pipeline: build/push → verify DB compatibility → apply staging-tested migrations → deploy
   services → health checks on `/health`/`/ready` → verify critical services (API liveness,
   containers running, `SELECT 1`, Redis reachable).
5. Run `scripts/smoke-test.sh` against the live endpoints as an additional gate.

---

## 7. Health checks and smoke tests

### `/health` (liveness) vs `/ready` (readiness)

- `/health` reports process liveness (status `ok` while the process is up).
- `/ready` reports readiness for traffic (dependencies such as DB/Redis reachable and warm).

The docker-compose `api` healthcheck and the deploy pipelines poll both. `scripts/health-check.sh`
polls both until success or retry limit:

```bash
HEALTH_CHECK_URL=https://api.vuzki.app scripts/health-check.sh
```

### Smoke tests

`scripts/smoke-test.sh` verifies the deployed API:

```bash
API_BASE_URL=https://api.vuzki.app APP_URL=https://vuzki.app scripts/smoke-test.sh
```

Checks: `/health` ok, `/ready` ok, public app 200, protected endpoint returns 401 unauthenticated,
unknown route 404, oversized body rejected 413. It exits non-zero if any check fails.

---

## 8. Rollback strategy

If a deploy causes an incident after the workflow reported success:

1. **Pin image tags** — every release is identified by an image tag (`BUILD_ID` / registry tag).
   Roll back to the last known-good tag.
2. **Revert migration considerations** — prefer forward-fix migrations over destructive DB
   reversals. Prisma `migrate deploy` never auto-drops; do not run data-destroying rollback
   migrations without review. Data-destructive operations require a tested backup restore
   (`scripts/restore.sh`).
3. **Restore previous image** — re-deploy the previous known-good image tag (e.g. set the
   `image_tag` input in `Deploy Production`), or `git revert` + re-deploy for code-level fixes.
4. **Verify health** — run `scripts/health-check.sh` and `scripts/smoke-test.sh` after rollback;
   confirm `/health`, `/ready`, protected/invalid-route behavior.
5. **Notify operators** — log the incident, record the rollback, and notify the on-call channel.
   Document root cause before promoting again.

Have a known-good image tag recorded for every environment so rollback is fast and deterministic.

---

## 9. Environment loading

- Each environment has its own `.env*` file loaded with docker-compose `--env-file`.
- App code reads env vars at startup via `dotenv` (`apps/api/src/config/index.ts`).
- Per-environment URLs (`API_PUBLIC_URL`, `WEB_URL`, `ADMIN_URL`, `WEBSITE_URL`), CORS origins, and
  provider selections differ; verify them per environment.

---

## 10. Secrets

- Secrets are never placed in the source, images, or the frontend; only public `NEXT_PUBLIC_*`
  build vars are exposed to clients.
- Production secrets are injected from a secret manager at runtime (see `SECRETS_MANAGER_ARN` in
  `.env.example`).
- CI injects secrets via GitHub Actions secrets/environments (`STAGING_*`, `PROD_*`, registry).

---

## 11. Production readiness

Production readiness requires **verified acceptance**: staging-tested migrations, passing CI
(typecheck/lint/tests/build/security scans), successful smoke tests, working health/readiness
probes, and confirmed external integrations (payments, RTC, storage, AI moderation, OTP/SMTP, push,
analytics). Do not ship to production without it.

---

## 12. Consolidated single-process deploy (current)

The production deploy (see `render.yaml`) uses the consolidated topology instead
of separate api/worker/admin containers:

- ONE web service, ONE process, ONE port. `apps/web/server.js` starts the Next.js
  app AND the Express API (`/api/v1`), Socket.IO (`/socket.io`), uploads
  (`/uploads`) and the worker loops (`apps/api/src/worker-core.ts`) in the same
  process.
- **Build:** `npm install --include=dev && npm run build:consolidated`
  (`turbo run build --filter=@vuzki/api --filter=@vuzki/web`).
- **Start:** `npm run start:consolidated` → `node apps/web/server.js`, binding
  `0.0.0.0:$PORT` (Render's `PORT`).
- **Health:** `/health` (liveness) and `/ready` (readiness) are served by the
  same process; the site root `/` is on the same origin.
- **Same-origin env:** `NEXT_PUBLIC_API_URL=https://vuzki.app/api/v1`,
  `NEXT_PUBLIC_SOCKET_URL=https://vuzki.app`, `CORS_ORIGINS=https://vuzki.app`,
  `WEB_URL/ADMIN_URL/WEBSITE_URL/API_PUBLIC_URL=https://vuzki.app`. The browser
  never calls `vuzki-api.onrender.com` in production.
- Secrets required in production (fail-fast if missing): `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `ADMIN_JWT_SECRET`, `DATABASE_URL`,
  `REDIS_URL` (see `apps/api/src/config/index.ts`).
- The separate `apps/admin` / `apps/website` apps and the `vuzki-worker` image
  are NOT deployed in this topology; they remain for rollback/reference.

Upload caveat: with `STORAGE_PROVIDER=local` media lives on the instance's local
filesystem and is lost across redeploys; use `STORAGE_PROVIDER=s3` for durable,
CDN-backed uploads.
