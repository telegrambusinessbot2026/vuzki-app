# VUZKI - Penetration Test Preparation

This document is the **internal preparation checklist and authorization plan**
for security testing VUZKI. VUZKI does **not** perform external,
unsanctioned penetration testing, and nothing in this file authorizes anyone to
attack systems they do not own or are not explicitly permitted to test (this
includes production and any third-party provider).

All penetration testing activities here are carried out only:

- by internal security engineers or an authorized external assessor under a
  signed agreement;
- against **staging** (or a dedicated isolated environment that mirrors
  staging), never production, without production user data;
- with a scoped, written authorization (this plan + an approved engagement
  record) that names the engineer, target range, dates, and limits.

Test accounts are synthetic; any data created by security testing is cleaned up
afterwards. Findings are triaged via the standard severity model and tracked to
remediation before release (see docs/PRODUCTION-CHECKLIST.md).

## Scope and rules of engagement

- Approved targets: staging API (`https://api.staging.vuzki.app`), staging
  Socket.IO endpoint, staging web/admin apps. DNS + subdomains of the staging
  environment only.
- Out of scope: production, third-party SaaS (payment providers, RTC, SMS,
  push, AI moderation, cloud providers), and any data belonging to real users.
- Approved actions: the exact test cases in this file, executed with synthetic
  accounts and fixtures. No destructive actions, no denial-of-service against
  other customers, no data exfiltration beyond what is necessary to prove a
  finding (and always stored encrypted, deleted at the end).
- Every test case records: date, tester, target endpoint, step, observed
  result, and pass/fail status. This file doubles as the runbook template.

## Test case catalog

Each row: how to test it, what a secure result looks like, and where the
defense lives in the codebase.

### T1 - Authentication bypass

- Test: access protected REST routes (`/api/v1/users/me`, `/wallet`,
  `/subscriptions`) and socket namespace with no token, expired token, token
  signed with a wrong secret, `alg:none` JWT, and `HS256`-signed-token when the
  server expects RS256.
- Defense: `apps/api/src/middleware/auth.ts` requires `Bearer`, verifies with
  `config.jwtSecret`, checks account status (SUSPENDED/BANNED -> 403) and
  deleted accounts. Real time socket auth rejects missing/invalid tokens
  (`apps/api/src/realtime/index.ts`).
- Secure result: 401 `UNAUTHORIZED` on every variant; no endpoint leaks data
  without a valid token.

### T2 - IDOR (insecure direct object references)

- Test: with user A's token, request/replay `/api/v1/users/:id`,
  `/wallet/transactions/:userId`, `/gifts/:id`, conversations and reports that
  belong to user B; attempt to read another user's messages by joining their
  conversation socket room; mutate a gift/call/report row by guessing ids.
- Defense: service/route-level ownership checks (conversation membership,
  `conversation.userAId/userBId`), wallet/gift routes scoped by `req.auth`.
- Secure result: 403/404 on foreign resources; never other users' PII, balances
  or messages. Verify a denied read produces no partial data in the response
  body.

### T3 - Privilege escalation

- Test: regular-user token called against `/api/v1/admin/*`; an admin of a
  low role (e.g. `SUPPORT_AGENT`) calling `finance.read`/`analytics.read`
  endpoints; an admin creating another admin (`POST /admin/create`);
  self-granting creator/verified badges (see T6, T7); user changing another
  user's role/status.
- Defense: `apps/api/src/guards/index.ts` `requireAdmin`,
  `requirePermission`, `requireRole` (SUPER_ADMIN only for `admin/create`);
  verification badge grant is server-controlled
  (`apps/api/src/services/verification.ts`).
- Secure result: 401/403 on cross-role access; role matrix enforced; no
  self-service privilege grant.

### T4 - Account takeover

- Test: password-reset via OTP guessing/bruteforce,
  `/auth/reset-password` with a replayed/borrowed OTP; refresh-token replay
  after `/auth/logout` or device revoke; session fixation across devices;
  OAuth `providerId` collision / email-reuse binding to an existing account.
- Defense: OTP verify+expiry in `apps/api/src/services/otp.ts`, rate-limited
  send (`/auth/send-otp` limiter 8/15min), session deactivation on logout and
  `/auth/reset-password` (all sessions invalidated), device scoping on
  `/auth/devices/:id`.
- Secure result: OTPs single-use/expiring; a logged-out or reset session cannot
  be reused; no way to bind an attacker provider id to a victim account.

### T5 - Payment manipulation

- Test: alter order amounts/package ids in the purchase request;
  replay a webhook (double delivery) after the order is `COMPLETED`; forge a
  webhook with an invalid/absent signature and a fake `orderId`; call
  `verifyPaymentClient` with `demo:true`-style flags on staging where
  `PAYMENT_PROVIDER != demo`; exploit integer/rounding in coins+bonus.
- Defense: server-side `createCoinsOrder` builds the amount from the DB
  package (client id only); webhook handler is idempotent on `orderId`
  (`alreadyProcessed`) and credits in a transaction
  (`apps/api/src/services/payments.ts`); `verifyWebhookAuth` in
  `apps/api/src/routes/admin.ts` verifies the provider signature (HMAC-SHA256,
  constant-time) or a shared webhook secret before `handlePaymentSuccess`,
  rejecting unsigned/mismatched webhooks with 401.
- Secure result: client cannot set price/coins; replayed webhooks do not
  double-credit; forged webhooks (no valid signature) are rejected in
  production.

### T6 - Wallet manipulation

- Test: send a balance/amount field in `/wallet` requests and attempt to
  credit/debit via gift, super-like, call, and purchase flows with negative or
  fractional amounts, overdrafts, gift-to-self; double-fire `call:gift` or a
  `call:end` to debit/credit twice.
- Defense: balances are server-only; `debitCoins` rejects `<= 0` and
  insufficient balance within `$transaction`; `endCall` is idempotent on
  `COMPLETED`; `call:gift` requires an active session and pays the exact gift
  price (`apps/api/src/realtime/index.ts`).
- Secure result: no client-influenced balance mutation; invariants hold (see
  docs/TESTING.md wallet invariants); a double-tap chat/gift never
  double-charges.

### T7 - Creator/verification abuse

- Test: self-approve a creator application or verification badge; bypass KYC
  requirement for withdrawal; create a second creator profile / impersonate;
  manipulate creator status.
- Defense: `requestVerification` only enqueues; `approveVerification` is
  admin-only and KYC-gated; withdrawal requires verified KYC and a creator
  profile (`apps/api/src/routes/withdrawals.ts`).
- Secure result: badges/approval happen only through admin review; a non-verified
  creator cannot withdraw; no duplicate/forged creator identity.

### T8 - WebSocket abuse

- Test: connect with a stolen/replayed socket token; join arbitrary rooms
  (`room:join "call:<id>"`, `conv:<id>`) without membership; send
  `call:signal`, `call:gift`, `call:end`, `message:read`/`delete` against
  conversations/calls the user does not own; flood `message:typing` and
  `match:start` to defeat rate limits; mass-connect to inflate presence.
- Defense: sockets authenticated by JWT; conversations membership-checked;
  call signaling only forwarded between the two session peers; rate limits via
  `allow()` (messages/calls/gifts/matches) in
  `apps/api/src/realtime/ratelimit.ts`; ack `ok:false` with a machine-readable
  error otherwise.
- Secure result: unauthorized events return `ok:false` (BLOCKED /
  NOT_PARTICIPANT / RATE_LIMITED / FORBIDDEN) and no state change occurs.

### T9 - File upload attacks

- Test: upload a polyglot (script disguised as image), an executable with a
  `.png` extension, an oversized file, a `text/html`/`application/x-php`
  payload, a file whose magic bytes mismatch the extension, and a filename with
  path traversal (`../../etc`), across profile photo, chat media, and KYC doc
  uploads.
- Defense: storage service validates MIME/content before persist
  (`apps/api/src/services/storage.ts`), body/JSON size limits (2mb/1mb in
  `apps/api/src/app.ts`), served as static content from the CDN with forced
  content-type and no executable handler.
- Secure result: only allow-listed image/media types at enforced limits;
  stored files are inert (verified by fetching the served URL - content-type
  not attacker-controlled, do not execute); traversal attempts normalized
  away.

### T10 - XSS

- Test: inject `<script>`, `<img onerror>`, `javascript:` URLs, and markup in
  display name, bio, interests, chat/message content, gift/reaction strings,
  and admin note fields; test both stored XSS (persist + view) and reflected
  XSS (query params echoed by search/filter).
- Defense: server `xssGuard` sanitizes request bodies
  (`apps/api/src/middleware/security.ts`: strips script/style tags, inline
  handlers, `javascript:`/`data:` schemes), React escapes on render, messages
  go through AI + deterministic moderation
  (`apps/api/src/services/content-moderation.ts`).
- Secure result: all injected markup is neutralized at rest and in the DOM; no
  `alert()`/network callback fires in Chrome, Firefox, Safari, Edge.

### T11 - SQL injection

- Test: inject SQL fragments into query params (`q`, filters, `orderBy`,
  pagination) and string fields; try stacked queries, comment injection,
  time-based blind payloads via search/discovery/admin filters.
- Defense: all queries route through Prisma (parameterized); zod validation of
  route inputs (`z.enum`, `z.coerce.number`) rejects non-conforming types.
- Secure result: no schema/data exfiltration; filters treat input as opaque
  values; error responses never echo raw DB errors (error middleware returns
  the envelope).

### T12 - CSRF

- Test: from a malicious origin, attempt state-changing, credential-cookie
  requests (`POST /auth/*`, `/wallet/*`) with `Content-Type:
  application/json` and with `text/plain` pre-flight; cross-site iframe of the
  admin; check that CORS blocks credentialed cross-origin requests to
  non-approved origins.
- Defense: `corsOrigin` allow-list (approved VUZKI origins only, no wildcard
  for credentials), token-in-header auth model (no ambient cookie session for
  API), helmet frame-ancestors `'none'`, `credentials` only when configured
  (`apps/api/src/app.ts`).
- Secure result: cross-origin requests fail pre-flight or send no valid token;
  admin/app cannot be framed; state changes require a bearer token the attacker
  cannot obtain.

### T13 - Rate-limit bypass

- Test: rotate `X-Forwarded-For` / `X-Real-IP` to bypass per-IP limiters;
  hammer `/auth/send-otp`, `/auth/login`, search, discovery, and socket events;
  attempt concurrent distributed identity to stay under per-IP/per-key windows.
- Defense: `trust proxy = 1`, per-user + per-IP strategic limiters, realtime
  per-user `allow()` rules (message/call/gift/match windows) in
  `apps/api/src/realtime/ratelimit.ts`, spam guard escalates repeat violators.
- Secure result: no practical brute-force path remains for OTP/login; abuse
  eventually returns RATE_LIMITED across all surfaces regardless of
  source-IP spoofing.

### T14 - Security misconfiguration / leakage

- Test: check `/health`, `/ready`, error pages, and admin endpoints for stack
  traces/envelope internals; confirm helmet headers (CSP, HSTS in prod,
  X-Content-Type-Options, frame-ancestors) are returned; confirm admin tokens
  are not accepted on user routes and vice-versa; confirm `auditLog` never
  stores passwords/OTP/tokens (redaction in `apps/api/src/middleware/audit.ts`).
- Secure result: no sensitive internals in responses; headers present and
  strict; token classes isolated; logs redacted.

## Authorization plan

1. **Request**: security engineer opens a scoped engagement record - tester
   identities, target staging URLs, test windows, tooling, synthetic accounts
   to create, and the test cases from this file to run.
2. **Approval**: two-person rule - engineering lead/CTO and the security owner
   sign the record (in writing, with a timestamp) before any scan begins.
3. **Environment check**: verify the target is `staging`; production and
   provider URLs are explicitly excluded in the record.
4. **Execution**: run cases in a documented sequence; screenshot/record
   evidence; do not expand scope beyond the approved list mid-run without a
   new approval.
5. **Cleanup**: delete synthetic accounts, uploaded test files, and any
   captured evidence after triage; confirm cleanup with a query.
6. **Reporting**: findings to a private issue tracker with severity,
   reproducibility steps, affected endpoint, and proposed fix; severities align
   with docs/PRODUCTION-CHECKLIST.md acceptance (critical resolved before
   production launch).

## Remediation tracking

Every finding is tracked from report -> reproduce -> fix -> regression test ->
re-test. Re-test evidence (expected secure result above) is attached to the
closing comment. Only after the open critical/high findings are closed (or
accepted with documented mitigation by the security owner) may the
launch checklist pass the security gate.