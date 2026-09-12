# VUZKI

**VUZKI - Meet • Talk • Connect** is a social & stranger-connect platform.

VUZKI lets people create rich profiles, discover and match with nearby people and
creators, chat in real time, make audio/video calls, jump into instant "Talk Now"
sessions with listeners/creators, send gifts, run paid subscriptions, and earn via
a coins, wallet, referrals and rewards economy. The platform is safety-first:
AI moderation, human moderation tooling, anti-fraud and bot detection run across
every surface.

This repository is the full VUZKI monorepo. It contains the public marketing
website, the end-user web application, the admin dashboard, the backend API, a
background worker, and the shared database, types, utils and feature-flag
packages.

## Modules

| Area | Description |
| --- | --- |
| Public website (`apps/website`) | Marketing and landing site. |
| User app (`apps/web`) | The end-user Next.js web application. |
| Auth | Registration/login with email/phone + OTP, Google and Apple OAuth, refresh tokens, device/session management, password reset. |
| Profiles | Onboarding, bio, photos, preferences, interests, languages, location, online status. |
| Discovery | Feed, search, Talk Now candidate queue, filters. |
| Matching | Likes, super-likes, passes, matches, matching service (AI-assisted matching engine exists). |
| Chat | Conversations, messages, reactions, read receipts, delivery via Socket.IO. |
| Audio/video calls | Call initiation, join/end, billing by cost, RTC backed by WebRTC/Twilio/Agora/LiveKit. |
| Talk Now | Instant stranger-connect sessions with listeners/creators, coin-billed per minute. |
| Coins | Coin packages, purchases, balances, spend (boosts, super-likes, gifts, calls). |
| Wallet | Per-user wallet ledger with transactions, purchase and verify flows. |
| Payments | Razorpay / Stripe / Cashfree with provider webhooks (demo provider for local dev). |
| Subscriptions | Plans (FREE/PLUS/PREMIUM/VIP tiers), purchase, verify, upgrade, cancel, history. |
| Gifts | Catalog, sending, received list, gift ledger. |
| Creators/Listeners | Creator applications, KYC, availability, dashboard, browse. |
| Earnings | Per-call and gift-based earnings, claim, recording. |
| Withdrawals | Request balance payout, admin review/approval/rejection. |
| Referrals | Referral codes, pending/eligible/paid states, coin rewards. |
| Rewards | Daily login streaks, reward schedule, boost purchases. |
| AI matching | Matching/feed ranking service (behind feature flags). |
| Safety | Account bans/suspensions, blocks, restrictions, age gating (18+), account deletion. |
| Moderation | Reports, moderation cases/actions, AI text/image moderation (OpenAI/local). |
| Anti-fraud | Fraud detection, bot detection, risk scoring, safety signals (all optional). |
| Admin dashboard (`apps/admin`) | Analytics, user/creator/report/withdrawal management, finance, coin packages, subscription plans, gifts, feature flags, broadcast notifications, realtime metrics. |
| Production security/devops | Docker images, CI/staging/production pipelines, backup/restore, health and readiness probes, secret management. |

## Quick start (development)

Requirements: Node.js >= 18 (Node 20/22 recommended), PostgreSQL, and optionally Redis.

```bash
# 1. Install workspace dependencies
npm install

# 2. Configure environment (copy and fill in values; NEVER commit .env)
cp .env.example .env

# 3. Generate the Prisma client
npm run db:generate

# 4. Create the database schema
npm run db:push        # development only - use npm run db:migrate for migrations

# 5. Optionally seed
npm run db:seed

# 6. Run everything with turbo (or a single app via dev:<name>)
npm run dev            # web, admin, api, worker with hot reload
```

The `dev:*` scripts run a single workspace:

- `npm run dev:web` - user app on port 3000
- `npm run dev:admin` - admin dashboard on port 3001
- `npm run dev:api` - API on port 4000
- `npm run dev:website` - marketing website

The API is mounted at `/api/v1`; liveness at `/health` and readiness at `/ready`.

Verify: `npm run typecheck`, `npm run lint`, `npm test` (or `npm run test:api`
for the API suite only).

## Project structure

```
apps/
  web/        # end-user Next.js web application (@vuzki/web)
  admin/      # admin dashboard (@vuzki/admin)
  website/    # public marketing website (@vuzki/website)
  api/        # Express + Prisma + Socket.IO backend (@vuzki/api)
packages/
  database/   # Prisma schema, migrations, seed, client (@vuzki/database)
  shared/     # shared constants/enums used across apps (@vuzki/shared)
  types/      # shared TypeScript types incl. API envelope (@vuzki/types)
  utils/      # shared helpers (@vuzki/utils)
infrastructure/
  docker/     # Dockerfiles (api, worker, web, admin) + docker-compose.yml
scripts/      # migrate.sh, backup.sh, restore.sh, smoke-test.sh, health-check.sh
.github/workflows/
  ci.yml            # pull-request checks (lint, typecheck, test, build)
  staging.yml       # deploy to staging
  production.yml    # deploy to production
infrastructure/     # (see above)
docs/               # documentation (this directory)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run all apps in watch mode (turbo). |
| `npm run dev:web` / `dev:admin` / `dev:api` / `dev:website` | Run a single app in watch mode. |
| `npm run build` | Build all workspaces. |
| `npm run build:<app>` | Build a single app. |
| `npm run lint` | Lint all workspaces. |
| `npm run typecheck` | Typecheck all workspaces. |
| `npm test` / `npm run test:api` | Run tests (all / API only). |
| `npm run db:generate` | Generate the Prisma client. |
| `npm run db:push` | Push schema to the database (development only). |
| `npm run db:migrate` | Create/apply dev migrations. |
| `npm run db:seed` | Seed the database. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run format` | Format all files with Prettier. |

Deployment/ops scripts: `scripts/migrate.sh`, `scripts/backup.sh`,
`scripts/restore.sh`, `scripts/smoke-test.sh`, `scripts/health-check.sh`
(see docs/ARCHITECTURE.md and docs/DATABASE.md).

## Documentation

- [docs/ARCHITECTURE.md](ARCHITECTURE.md) - production architecture, environments, scaling, deployment topology.
- [docs/DATABASE.md](DATABASE.md) - Prisma schema, migrations, backups, security, data model overview.
- [docs/API.md](API.md) - API reference overview, auth, response envelope, error codes, endpoints.

## Production-readiness

VUZKI is **NOT yet declared production-ready**. The platform must first pass the
acceptance criteria tracked for production (security review, fraud/abuse controls,
payment provider configuration, monitoring/alerting, backup-restore verification,
and load/soak tests against staging). Do not promote a release to production
until those criteria pass and the release has been validated on staging.