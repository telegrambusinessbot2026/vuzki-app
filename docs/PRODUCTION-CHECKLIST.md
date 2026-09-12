# VUZKI - Production Launch Checklist

This checklist is the gate for promoting VUZKI to production. The platform is
**NOT yet production-ready** (see docs/README.md) - a release advances only when
every item below is verifiably done. Items are grouped by area; each has the
owner role that must acknowledge it. Use this file for every release: it
documents the state at the time of the promote (checkboxes are not a substitute
for the acceptance evidence).

## HTTPS and domain

- [ ] TLS terminates at the CDN/load balancer; `https://vuzki.app`,
  `https://www.vuzki.app`, `https://api.vuzki.app`, `https://admin.vuzki.app`
  all resolve with valid certs (no mixed-content warnings).
- [ ] HSTS preload-ready header present in production
  (`strictTransportSecurity` enabled in `apps/api/src/app.ts` when
  `NODE_ENV=production`).
- [ ] Redirects are canonical (apex -> www or www -> apex, one TLD) and
  HTTP->HTTPS for all frontends.
- [ ] `CORS_ORIGINS` allow-list contains exactly the approved web/admin/website
  origins; credentials flag matches the auth model.
- [ ] DNS records and subdomains owned and transferrable (registrar admin
  access documented).

## Database

- [ ] Staging-production parity: same Postgres 16, same schema (migrations
  versioned in `packages/database/prisma/migrations`).
- [ ] Migrations tested on staging (`scripts/migrate.sh`,
  `prisma migrate deploy`); no `db push`/reset against shared databases.
- [ ] Least-privilege: API user has only the schema/table grants it needs;
  migration role separate; no public exposure (private VPC/security group).
- [ ] Encryption in transit (`sslmode=require`) and at rest enabled.
- [ ] Connection limits + pool (`connection_limit`) sized; `pg_stat_statements`
  + slow-query logging on.
- [ ] Backups: `scripts/backup.sh` scheduled nightly, encrypted, offsite
  (S3 + local retention); restore **tested** this release window
  (`scripts/restore.sh` against a disposable target).
- [ ] PITR/WAL archiving enabled (managed instance) for RPO <= 15 minutes.
- [ ] Reconciliation: `wallet.balance` == summed `walletTransaction.amount`
  per user; run the query against prod-scale seed on staging.

## Redis

- [ ] Redis 7 configured, private network only; password/ACL enforced.
- [ ] Redis-backed Socket.IO adapter + KV store confirmed working across >= 2
  API replicas (presence, rate limits, socket fan-out).
- [ ] Memory headroom and eviction policy configured (no silent key eviction
  that silently resets rate limits/presence).
- [ ] Graceful degradation verified: with Redis down, API stays up using the
  in-process fallback (`apps/api/src/realtime/store.ts`) and `/ready` reports
  degraded; rehydration path exercised.
- [ ] Persistence (RDB/AOF) and backup policy for Redis defined.

## Storage / media

- [ ] Object storage with versioning + lifecycle; `STORAGE_PROVIDER=s3`
  bucket configured (`vuzki-uploads`), region + endpoint correct, access keys
  in the secret manager.
- [ ] CDN configured in front of storage (`CDN_BASE_URL`); cache rules set;
  content-type never attacker-controlled.
- [ ] Upload validation enabled (MIME/content sniff, size caps, path
  sanitization) in `apps/api/src/services/storage.ts`.
- [ ] Image variants (thumbnails/watermarks for creators) generate and serve
  correctly.
- [ ] Corrupt/missing object replay path defined (re-process job described in
  docs/DISASTER-RECOVERY.md).

## CDN / static

- [ ] All web/admin/website builds uploaded and cache-busted by `BUILD_ID`.
- [ ] Long-lived hashed assets immutable-cached; index/HTML short TTL.
- [ ] Fallback SPA routing correct at CDN layer; 404s for unknown assets.

## Backend API

- [ ] `@vuzki/api` built purely from source (image `vuzki-api`) with
  non-root user, healthcheck (`/health`), `node dist/server.js`.
- [ ] Multi-replica deployment (>= 2) behind an LB; sockets sticky via Redis
  adapter; graceful drain on rollout.
- [ ] `GET /health` (liveness) and `GET /ready` (Postgres + Redis) wiring
  verified; orchestrator probes use them
  (`apps/api/src/health.ts`).
- [ ] Env surface locked to `.env.example`: secrets injected from the secret
  manager at deploy time, never in the repo or image.
- [ ] Structured logging (`LOG_LEVEL=info`) to a centralized sink; `BUILD_ID`
  recorded.
- [ ] `scripts/smoke-test.sh` and `scripts/health-check.sh` pass post-deploy.

## Frontend / web app

- [ ] `@vuzki/web` production build (`npm run build:web`) with
  `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` correct.
- [ ] Core flows verified on staging at production config: signup/login/OTP,
  onboarding, discovery, chat, calls, wallet, subscription, settings, logout.
- [ ] Client-side rendered pages hydrate without errors; console is clean.
- [ ] Analytics provider configured and confirming events (if enabled).

## Admin

- [ ] `@vuzki/admin` production build; admin auth enforced server-side
  (`requireAdmin`/`requirePermission`) - admin token never accepted on user
  routes.
- [ ] Roles provisioned (SUPER_ADMIN/ADMIN/MODERATOR/FINANCE_ADMIN/
  SUPPORT_AGENT) with correct permissions; no default/preset admin password.
- [ ] Dashboard/finance views load against prod-shaped data; audit log visible.
- [ ] Admin login rate-limited and MFA-eligible (MFA is a production
  requirement to add if not present).

## Authentication

- [ ] Production `JWT_SECRET` / `JWT_REFRESH_SECRET` generated + rotated policy
  documented; access TTLs sane (15m access / 30d refresh).
- [ ] OTP flow works with the production provider; OTPs single-use/expiring;
  limits on send/verify.
- [ ] Login/register/refresh/logout/device-revoke verified end to end;
  session invalidation on logout and password reset works.
- [ ] Banned/suspended users blocked at auth + socket layers
  (`middleware/auth.ts`).
- [ ] Google/Apple OAuth client ids registered and email binding verified
  (account-**takeover** safe).

## Email / OTP providers

- [ ] SMTP or transactional provider configured with verified sender domain;
  DKIM/SPF/DMARC in place; bounces monitored.
- [ ] OTP provider (Twilio/MSG91 etc.) credentialed for the environment;
  `OTP_PROVIDER != dev` in production.
- [ ] Email/OTP templates live; delivery monitored; no vendor secrets
  committed.

## Push notifications

- [ ] `PUSH_PROVIDER` configured (FCM/OneSignal); app/device tokens registered
  and tested (chat, call, gift, moderation notifications).
- [ ] Quiet-hour/logic and read-delivery suppression verified; token rotation/
  prune handled.

## Payments

- [ ] Live provider keys configured (Razorpay/Stripe/Cashfree);
  `PAYMENT_PROVIDER != demo` in staging AND production
  (`apps/api/src/config/index.ts`).
- [ ] Webhook endpoint (`POST /admin/payments/webhook`) signature-verified
  against the provider secret before `handlePaymentSuccess` (`verifyWebhookAuth`
  in `apps/api/src/routes/admin.ts` rejects unsigned/mismatched webhooks with
  401 before any fulfillment; fill in provider secrets in the environment and
  test end-to-end before launch).
- [ ] Purchase flow end-to-end on staging with sandbox keys: create order ->
  webhook -> wallet credit exactly once; retried webhooks idempotent.
- [ ] Refunds/chargebacks handled (ledger `ADJUSTMENT`, no silent balance
  edits); failed/cancelled orders never credit.
- [ ] Reconciliation queue / tooling available for missed webhooks; finance
  reconciliation SQL run periodically.

## Subscriptions

- [ ] Subscription plans live (FREE/PLUS/PREMIUM/VIP), purchase/verify/upgrade/
  cancel cycle works; recurring billing (webhook) honors idempotency.
- [ ] Feature gating by tier verified (premium unlocks correct features); no
  free-tier user bypasses gated features.
- [ ] Renewal failures (payment declined) handled with retry + notification,
  no silent downgrade data loss.

## Coins economy

- [ ] Coin packages live; purchase + bonus math correct (coins + bonus).
- [ ] Spend paths verified against ledger: super-likes, boosts, gifts, calls,
  Talk Now, premium features.
- [ ] Wallet invariants hold under load (docs/TESTING.md wallet invariants);
  no client-driven balance mutation; duplicate prevention via `referenceId`.

## Gifts

- [ ] Gift catalog live; send flow debits sender and credits receiver
  (earnings for creators); in-call gifts require an active session
  (`call:gift`).
- [ ] Gift ledger rows immutable; gift-to-self rejected; rate limits applied.

## Calls / RTC

- [ ] RTC provider credentials live (WebRTC + TURN, or Twilio/Agora/LiveKit);
  TURN reachable for NAT users; provider failover documented
  (docs/DISASTER-RECOVERY.md).
- [ ] Call lifecycle verified: initiate -> ring -> accept/reject/miss ->
  connect -> end; creator status BUSY/AVAILABLE transitions correct.
- [ ] Billing verified per docs/TESTING.md call-billing: rate per type,
  duration rounding, 1-min minimum, creator share + platform fee, interruption
  (disconnect) and reconnection handling, exactly-once billing, min-balance
  gate at initiate.
- [ ] Stale `RINGING` calls fail via worker; no stuck calls after restarts.

## Talk Now / matching

- [ ] Talk Now queue works (match:start/poll/cancel), expiry honored, blocked/
  restricted pairs excluded.
- [ ] Matching excludes banned/suspended/deleted and misconfigured profiles;
  deterministic block/restriction/preference rules applied.
- [ ] Feature flag `FEATURE_TALK_NOW` deliberate per environment.

## Moderation / safety

- [ ] AI + deterministic text moderation live (`aiProvider` configured);
  hard-blocks enforced, flagged content queued for human review.
- [ ] Image/media moderation configured if enabled
  (`imageModerationEnabled`).
- [ ] Reports -> moderation cases pipeline works; admin resolution writes
  `ModerationAction` and user status changes (suspend/ban) take effect
  immediately (REST + socket).
- [ ] Blocks enforced across messages, calls, matching, gifts; restrictions
  (`CHAT`/`CALL`) applied.
- [ ] Age gating (18+) enforced at registration/onboarding.
- [ ] Safety/fraud/bot flags elevated to review; risk scores never exposed to
  users.

## Creator system

- [ ] Creator application -> admin review -> approve/reject/suspend/revoke
  verified; approval switches `isCreator` and sets status.
- [ ] Verified creator badge KYC-gated (manual review); creators can go online
  and appear in discovery/Talk Now.
- [ ] Earnings recorded per call/gift, PENDING -> AVAILABLE lifecycle,
  summary/dashboard correct.
- [ ] KYC required before withdrawals; `kyciStatus` verified state enforced.

## Withdrawals

- [ ] Withdrawal flow verified: minimum amount, method validation (UPI/bank),
  duplicate-in-progress rejection, FIFO earnings lock (`WITHDRAWN`), admin
  approve/process/complete/reject with audit log.
- [ ] Finance reconciliation: completed withdrawals equal payout records; no
  withdrawal allowed over available balance.
- [ ] Withdrawal operations restricted to finance role.

## Backups

- [ ] Nightly `scripts/backup.sh` verified in production layout (encrypted,
  offsite, retention 30d); restore drill passed this window.
- [ ] Backup key stored in secret manager, recoverable by on-call; restoration
  runbook rehearsed (docs/DISASTER-RECOVERY.md).
- [ ] Post-search data verification queries defined and exercised.

## Monitoring / alerting

- [ ] `/health` + `/ready` polled; alert on 5xx rate, p95 latency, error rate,
  socket connection drops, Redis/DB connect failures.
- [ ] Realtime metrics surfaced (connections, presence, calls active, messages,
  moderation flags) - available via `GET /admin/realtime`.
- [ ] Payment/webhook alerts (unprocessed `PENDING` orders older than an
  SLA window, webhook signature failures).
- [ ] Worker alerts (deletion backlog, retention errors, stale-call count).
- [ ] Capacity alerts (CPU, memory, connections, Redis OPS/memory, DB slow
  queries, storage used).

## Error tracking / logging

- [ ] Error tracker (e.g. Sentry) wired for API + frontends; source maps
  uploaded; alerts on new error groups.
- [ ] Centralized structured logs with `BUILD_ID`; request logs include route,
  latency, status; sensitive fields redacted (`middleware/audit.ts`).
- [ ] Log retention + access control defined.

## Security

- [ ] `npm audit --audit-level=high` and trivy secret/image scans clean at
  release time (CI gate in `.github/workflows/ci.yml`).
- [ ] Own-key JWT/refresh secrets; helmet + strict CORS verified
  (docs/PEN-TEST.md T14); session/token storage client-side reviewed.
- [ ] Penetration test preparation executed: auth bypass, IDOR, privilege
  escalation, account takeover, payment/wallet manipulation, WebSocket abuse,
  file upload, XSS, SQLi, CSRF, rate-limit bypass - all pass or criticals
  remediated (docs/PEN-TEST.md).
- [ ] Commercial/licensing review: third-party SDKs products compliant.

## Legal / compliance

- [ ] Privacy Policy live and linked (data collected, storage, deletion
  rights).
- [ ] Terms of Service live (coverage: payments/coins/refunds, creator
  earnings, prohibited conduct).
- [ ] Community Guidelines live (moderation, self-harm and explicit-content
  policies, 18+).
- [ ] Cookie/consent banners configured; GDPR/COPPA-aligned defaults.
- [ ] Account deletion flow meets legal retention obligations (deletion +
  anonymization job with `retentionUntil`).
- [ ] Creator/KYC terms; withdrawal and tax documentation links present.
- [ ] Support contact + reporting escalation channels documented.

## Final acceptance criteria

Before launch:

- [ ] All core features pass on staging at production config (signup through
  call, gift, coins, subscription, creator earning, withdrawal).
- [ ] Realtime communications (chat + presence + calls + Talk Now) verified on
  >= 2 replicas with Redis adapter; reconnection behavior acceptable.
- [ ] Payments: sandbox live-credential flow passes; webhook signature
  verification implemented; idempotency proven (replayed webhook).
- [ ] Wallet accounting correct: balance == ledger sum; exactly-once on
  purchases, calls, gifts; no client-driven mutation.
- [ ] Subscriptions: purchase/upgrade/cancel/renewal all correct; gating
  enforced.
- [ ] Creator earnings + withdrawals: PENDING->AVAILABLE, FIFO lock,
  KYC-gated, admin finance review works.
- [ ] Moderation: reports, cases, suspensions/bans effect all surfaces;
  banned users blocked.
- [ ] Security tests pass (docs/PEN-TEST.md); critical/high findings closed.
- [ ] Backups work: restore drill succeeded this window.
- [ ] Monitoring works: alerts fire on the seeded test conditions; dashboards
  reflect traffic.
- [ ] Rollback works: a release can be reverted to the previous image +
  migrations without data loss (migrations additive; destroy migration
  rehearsed).
- [ ] Mobile UI works: responsive matrix + browser matrix passed
  (docs/TESTING.md).
- [ ] Accessibility passes WCAG 2.1 AA audit if applying it to the web/admin
  surfaces (documented pass or documented exemption).
- [ ] Critical vulnerabilities resolved (from pentest + dependency scan).
- [ ] Load testing on staging met the thresholds in docs/LOAD-TESTING.md
  (baseline + soak).

## Phased launch plan

Each phase has an explicit entry gate (all previous gates green) and an exit
criterion. Roll forward, do not skip; anomaly during any phase requires going
back to the previous gate and fixing before continuing.

1. **Internal testing (alpha/beta internal)**
   - Team + a small internal cohort (tens) on staging-equivalent production.
   - Goals: signup -> call -> tip/purchase -> earnings -> withdrawal acceptance;
   exercise admin moderation; capture every session for smoke of realtime and
   wallet.
   - Exit: no P0/P1 open; both journeys near-flawless for this cohort.

2. **Small public beta (invite-only capped cohort)**
   - Hundreds of invitees; payments live but low caps; marketing site live.
   - Goals: real market verification of payments (Razorpay/Stripe/Cashfree),
   OTP volumes, called billing edges (interruptions, reconnects), moderation
   queue throughput, support load.
   - Exit: payment reconciliation clean; wallet/call accounting zero
   discrepancies; moderate support volume; retention honored.

3. **Limited public launch (open registration, capped marketing)**
   - Regional / platform rollout day-1; feature-flag-sensitive (Talk Now,
   gifts, subscriptions) can be toggled gradually via
   `apps/api/src/services/feature-flags.ts`.
   - Goals: observe load vs staging (docs/LOAD-TESTING.md baselines), watch
   query plans/index usage, soak monitoring + alerting; scale replicas on
   demand.
   - Exit: error rate < targets for 7 days consecutive; spend/coin/payment
   reconciliation zero; call connect success stable; support response within
   SLA.

4. **Full launch**
   - Remaining geographies/marketing; concurrency limits raised by config.
   - Goals: demonstrate capacity at projected peak (S1-S6 thresholds), verify
   payout/withdrawal batch cadence, legal/compliance position maintained.
   - Exit: sustained green across the production checklist for 14 days.

## Post-launch monitoring focus

First 30 days the daily ops review watches, in priority order, with a
notification on any abnormal change from the 7-day moving baseline:

- API errors: 5xx rate, p95/p99 latency, errored request groups.
- Login failures: rate spikes (attack vs UX regression), wonky-OTP flow,
  brute-force attempt without limiting.
- Payment failures: initiation failures, webhook signature failures,
  `PENDING` order backlog, declined-retry-loops, refund/chargeback rate.
- Wallet discrepancies: reconciliation query diff > 0; double-credit events;
  negative-balance anomalies.
- Call failures: connect success rate drop, RECONNECT storm, billing mismatch
  (debits vs `COMPLETED` calls), stale `RINGING` counts.
- Chat failures: send-to-deliver latency, ack error rate, lost-message check,
  push delivery failures.
- Moderation reports: queue depth, resolution SLA, false-positive rate of
  AI flags, appeal volume.
- Creator withdrawals: request rate, payout failure rate, FX/chargeback on
  payouts, duplicate-withdrawal attempts.
- Server load: CPU/memory, DB connections + slow queries, Redis OPS/memory,
  socket connection count, worker backlog.
- Alerts: any active page, or threshold breach, is a triage ticket that day.

## Sign-off

Release owner signs when all gates pass and evidence is attached (this file +
CI runs + staging validation + monitoring screenshots). One line per gate
above requires an accountable owner. Any unchecked required item blocks
production promotion.