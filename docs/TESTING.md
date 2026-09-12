# VUZKI - Testing Strategy

This document describes how VUZKI is tested: the implemented unit suite, the
integration setup against a real Postgres in CI, how to run the checks, and the
test plans (not yet implemented) for end-to-end journeys, security, wallet and
call-billing invariants, mobile, browsers and accessibility.

Every section is explicitly labeled **Implemented** or **Planned**. Anything
labeled Planned is a specification for work that still needs to be written -
it must not be confused with already-passing coverage.

## How to run

All commands run from the repository root unless noted.

| Check | Command | Notes |
| --- | --- | --- |
| Unit + integration tests | `npm run test --workspace @vuzki/api` | Runs `vitest run` with `apps/api/vitest.config.ts` (includes `src/**/*.{test,spec}.ts`). |
| API tests from root | `npm run test:api` | Turbo filter for `@vuzki/api`. |
| All workspaces | `npm test` | Turbo. |
| Typecheck | `npm run typecheck --workspace @vuzki/api` | `tsc --noEmit`. |
| Build | `npm run build --workspace @vuzki/api` | `tsc -p tsconfig.json`; requires `prisma generate` first (`npm run db:generate`). |
| Lint | `npm run lint` | Not configured per workspace yet (echo placeholder); run `turbo` or prettier (`npm run format`). |
| Integration (CI) | see `.github/workflows/ci.yml` "integration" job | Real Postgres 16 service container. |

The `DATABASE_URL` env is required at build time only for `prisma generate`
(CI sets a dummy URL; no live DB is touched). Unit tests that do contact the
database are mocked at the `@vuzki/database` boundary (see below).

## Unit tests - implemented

The suite lives in `apps/api/src/__tests__/` and is run by Vitest in Node
environment (`environment: 'node'`). The `@` path alias resolves to
`apps/api/src` (`vitest.config.ts`).

What is covered today:

### Presence (`presence.test.ts` -> `apps/api/src/realtime/presence.ts`)

- A user with no recorded state reports `OFFLINE`/null.
- `setPresence` records `ONLINE` with `sessionId` and `lastActive`.
- State transitions `ONLINE -> AWAY -> BUSY -> OFFLINE`, including clearing the
  session id.
- `setCurrentCall` flips state to `IN_CALL` and back to `ONLINE`.
- `getUsersPresence` returns snapshots for a batch, defaulting absent users to
  `OFFLINE`.

### Messages (`messages.test.ts` -> `apps/api/src/services/messages.ts`)

- `sendMessage` deliverability: `SENT` when the recipient is offline,
  `DELIVERED` (with timestamp + server-side status update) when online.
- `peerOnline` override used by tests without a socket registry.
- Blocked pairs are rejected (`BLOCKED`) and the message is not persisted.
- Deterministic AI-moderation `flagged: true` is rejected (`MOD_FLAGGED`).
- The `onMessage` hook fires once with the created DTO.
- Helpers: `toMessageDto` wire-shaping and `normalizeStatus` mapping.

### Matching (`matching.test.ts` -> `apps/api/src/realtime/matching.ts`)

- `startMatchmaking` enters `WAITING` when no candidate is online.
- Matching a compatible online user reports `matchedWith` and a score.
- `cancelMatchmaking` transitions the entry to `CANCELLED`.
- Queue expiry behavior at poll time.

### Call tracker (`call-tracker.test.ts` -> `apps/api/src/realtime/call-tracker.ts`)

- Session starts `RINGING` with only the caller peer.
- `ACCEPT -> CONNECTED` only when both peers report connected; `connectedAt`
  set.
- `RECONNECTING with reconnectDeadlineMs -> back to CONNECTED` clears the
  deadline.
- `endCallSession` ends the session; `isCallActive` is false afterwards.
- `otherPeer` resolves caller/receiver correctly.
- Call billing helpers (`services/calls.ts`): `computeCallBilling` bills
  per-minute with a 1-minute minimum, splits creator share vs platform fee, and
  a short call still bills the 1-minute minimum.

### Wallet (`wallet.test.ts` -> `apps/api/src/services/wallet.ts`)

- `creditCoins` upserts the wallet and records a `COMPLETED` transaction with
  `balanceAfter` and `referenceId`.
- `debitCoins` rejects non-positive amounts (`INVALID_AMOUNT`), missing wallets
  and insufficient balance (`INSUFFICIENT_BALANCE`, 402 with balance/required
  details), and never writes when the check fails.
- Successful debit decrements and records a negative transaction.
- `getBalance` returns 0 with no wallet.
- `recordCreatorEarning` records `PENDING` earnings with coins.

### Payments (`payments.test.ts` -> `apps/api/src/services/payments.ts`)

- `handlePaymentSuccess` credits coins + bonus exactly once on the first
  webhook.
- Retried webhooks are idempotent (`alreadyProcessed`, no re-credit).
- Unknown order id throws `ORDER_NOT_FOUND` and nothing is credited.

## Mock pattern (implemented)

Unit tests mock the database and other boundaries with Vitest hoisted mocks.
The pattern is strict: `vi.mock` factories are hoisted above imports, so any
closure state they reference must be created with `vi.hoisted`.

```ts
const mocks = vi.hoisted(() => {
  const walletUpsert = vi.fn();
  const tx = { wallet: { upsert: walletUpsert } };
  return { walletUpsert, tx };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    $transaction: vi.fn(async (fn) => fn(mocks.tx)),
    wallet: { findUnique: vi.fn(), upsert: mocks.walletUpsert },
    // ...only the models under test
  },
}));
```

Rules followed in the existing suite:

- Mock `@vuzki/database` (`prisma`) per test file: fake only the models the
  test exercises, and stub `$transaction` to invoke the callback with an
  in-memory `tx` object.
- Mock sibling modules at their real relative path (e.g.
  `../services/ai-moderation`, `../services/notification`,
  `../realtime/metrics`) when a service imports them.
- `vi.clearAllMocks()` in `beforeEach`; match module-kind mocks once at
  hoist time and then shape per-test results via `mockResolvedValue`.
- Keep a `beforeEach`/`afterEach` that closes the realtime KV store
  (`kv.close()`) and cancels matchmaking so tests do not leak state.
- Where the realtime store is required, tests run against the in-memory
  fallback (`apps/api/src/realtime/store.ts`), never a live Redis.
- Assert on error codes/status (`status`, `code`) and on absence of writes
  when a guard fails - do not only assert success paths.

TS type warning: parameter `any` types in mock `tx` objects are intentional
test fixtures; do not widen production signatures to satisfy them.

## Integration tests with real Postgres (implemented / CI)

The CI integration job in `.github/workflows/ci.yml`:

1. Starts `postgres:16-alpine` as a service container
   (`POSTGRES_USER=vuzki`, DB `vuzki_test`).
2. Runs `npm run db:generate` then `npm run db:migrate`
   (Prisma Migrate deploy mode).
3. Runs the API test suite:
   `npm run test --workspace @vuzki/api`.

This verifies that committed migrations apply cleanly and the API
typechecks/builds against a real database, but note the unit tests themselves
still mock `@vuzki/database`. The plan below must add dedicated integration
tests that run against `DATABASE_URL` without mocking. Suggested suite:

`apps/api/src/__tests__/integration/` with files such as:

- `auth.integration.test.ts` - register/login/refresh/logout, OTP verify,
  password reset, device revocation - all against Postgres.
- `wallet-transactions.integration.test.ts` - concurrent credit/debit race
  checks (the real `$transaction` is exercised here; the mock cannot prove
  serializable isolation).
- `payments-webhook.integration.test.ts` - full webhook -> wallet credit flow
  with the real payment/wallet tables; retry idempotency at the database level.
- `calls-billing.integration.test.ts` - `initiateCall` -> `acceptCall` ->
  `endCall` producing a call row, wallet debit, creator earning, status reset.
- `withdrawals.integration.test.ts` - KYC gating, duplicate-withdrawal
  rejection, pending-to-available move, FIFO locking of earnings.
- `admin-flows.integration.test.ts` - report review, creator approval with
  moderation actions and audit log rows.

These tests should be tagged (e.g. `describe.runIf(!!process.env.DATABASE_URL)`)
or skipped unless a real `DATABASE_URL` is present, so `vitest run` still works
without infrastructure.

## End-to-end test plans - planned

E2E journeys are specified below and belong in a Playwright suite
(`apps/web/e2e/`, `apps/admin/e2e/`) executed against a staging deployment.
Each step asserts both the UI state and the API invariant (via inspectable
responses or DB checks). Status: **Planned** - no automated E2E suite exists yet.

### User journey

`Signup -> Verify -> Profile -> Discover -> Like -> Match -> Chat -> Call -> Gift -> Coins -> Premium -> Logout`

1. Signup: `POST /api/v1/auth/send-otp` + `POST /auth/register` (or
   OAuth provider), account created with wallet row; rate limits apply.
2. Verify: complete OTP verification
   (`POST /auth/verify`); email/phone marked verified.
3. Profile: onboarding completed (`OnboardingStep.COMPLETE`); age gate (18+),
   photos uploaded, interests/languages/location set; profile appears in
   discovery.
4. Discover: feed loads from `GET /discovery`; filters and search
   (`GET /search`) return ranked results.
5. Like/SuperLike: `POST` a like; mutual like produces a `Match`; super-like
   consumes coins (wallet debited, ledger row).
6. Match: match event delivered over Socket.IO (`match:found`); conversation
   auto-created.
7. Chat: `message:send` -> `message:received` on peer socket; read receipts;
   reaction; unsend; moderation blocks flagged content.
8. Call: `call:initiate` -> `call:accept` -> both peers `CONNECTED` ->
   billing; `call:end` debits caller exactly once, credits creator earning.
9. Gift: `call:gift` / gift route debits sender and records gift transaction +
   receiver earning.
10. Coins: purchase package `POST /wallet/purchase`, webhook
    `POST /admin/payments/webhook`, wallet balance increases by
    coins + bonus exactly once.
11. Premium: purchase recurring subscription; tier reflects
    (`premiumTier != FREE`); cancel stops renewal.
12. Logout: `POST /auth/logout` deactivates refresh session; access to
    protected endpoints returns 401 afterwards.

### Creator journey

`Apply -> Verification -> Approval -> Go Online -> Receive Call -> Earn -> Receive Gift -> Withdrawal -> Completion`

1. Apply: submit creator application (bio, category, KYC docs uploaded).
2. Verification: request creator verification badge
   (`services/verification.ts` - badge is server-controlled, KYC-gated).
3. Approval: admin approves creator application
   (`PATCH /admin/creators/:id` -> `APPROVED`, `isCreator=true`).
4. Go online: `creatorStatus=AVAILABLE`, presence `ONLINE`; appears in
   creator/Talk Now browsing.
5. Receive call: user initiates, creator accepts; rate from
   `@vuzki/shared` constants; creator marked `BUSY` during call.
6. Earn: call end credits `creatorEarning` (PENDING) with per-minute rate
   and share (assert `creatorEarnings == cost * share`, platform fee =
   remainder).
7. Receive gift: gift transaction credited as earning.
8. Withdrawal: `movePendingToAvailable` then `POST /withdrawals` with
   verified KYC; duplicate pending withdrawal rejected (409); admin
   approve/process/complete; balance locked via FIFO `WITHDRAWN` marking.
9. Completion: withdrawal `COMPLETED`; earnings summary reflects totals and
   available balance decreased.

### Admin journey

`Login -> Dashboard -> Review user -> Review report -> Approve creator -> Review payment -> Review withdrawal -> Audit logs`

1. Login: `POST /admin/login` with valid admin credentials (12h JWT).
2. Dashboard: `GET /admin/dashboard` aggregates users, calls, messages,
   payments, pending reports/withdrawals.
3. Review user: `GET /admin/users/:id` shows wallet, reports, moderation list;
   suspend/ban writes a `moderationAction`.
4. Review report: `GET /admin/reports`, `PATCH /admin/reports/:id` (resolve /
   action / dismiss, optional ban).
5. Approve creator: `GET /admin/creators`, `PATCH /admin/creators/:id`
   (approve/reject/suspend/revoke).
6. Review payment: `GET /admin/finance`, verify coin revenue, subscription
   revenue, gifts, completed vs pending withdrawals.
7. Review withdrawal: `GET /admin/withdrawals`,
   `PATCH /admin/withdrawals/:id` (approve/process/reject/complete) - each
   writes an `auditLog`.
8. Audit logs: verify `auditLog` rows exist for the write actions above with
   actor, entity, and redacted metadata (`middleware/audit.ts` redacts
   passwords/otp/tokens).
9. Cross-cutting: every admin action asserts permissions
   (`guards/index.ts` `requirePermission`); a non-privileged admin token gets
   403 on forbidden resources.

## Security test cases - planned

Automated security tests (in the integration or a separate `@vuzki/api`
security suite, or a Playwright suite targeting staging). For each: goal,
example payload, and the expected (secure) outcome.

| # | Category | Test case | Expected (secure) outcome |
| --- | --- | --- | --- |
| S1 | Auth bypass | Request protected routes (`/users/me`, `/wallet`) with no/expired/tampered JWT, wrong algorithm (`alg: none`, HS256 with RS256 key) | 401 `UNAUTHORIZED`; no data leaked |
| S2 | Auth bypass | Socket.IO connect with missing/expired token | connection rejected (`unauthorized`) |
| S3 | IDOR | User A reads/mutates `/users/:id`, conversation, wallet, gift, call of user B by ID | 403/404; never another user's PII or balances |
| S4 | IDOR | User A opens another user's `conversationId` socket room / reads messages | rejected; `getConversation` membership check |
| S5 | Privilege escalation | Regular user token calls `/admin/*` routes | 401/403 (`requireAdmin`) |
| S6 | Privilege escalation | Low-role admin (`SUPPORT_AGENT`) calls finance/analytics endpoints | 403 (`requirePermission`) |
| S7 | Account takeover | Login with stolen password vs OTP; refresh-token reuse after logout | refresh token invalid after session deactivation |
| S8 | Account takeover | `/auth/logout` must not invalidate other sessions implicitly; `/auth/devices/:id` only own devices | only targeted session deactivated |
| S9 | Payment manipulation | Client claims success via `verifyPaymentClient` with `demo:false` in prod | `requiresWebhook` - nothing credited without webhook |
| S10 | Payment manipulation | Forged/replayed webhook without valid signature | rejected; payment not credited (prod must verify signature) |
| S11 | Payment manipulation | Retried webhook after completion | idempotent `alreadyProcessed` |
| S12 | Wallet manipulation | Direct balance update via API body fields, negative purchase, gift to self | rejected at service layer; ledger immutable |
| S13 | Wallet manipulation | Concurrent debits must not overdraw | transactional check within `$transaction` |
| S14 | WebSocket abuse | Replay of `message:send` beyond rate limits (`allow` rules) | `RATE_LIMITED` |
| S15 | WebSocket abuse | Non-participant joins call room / sends `call:gift`/`call:signal` in a call | `NOT_PARTICIPANT`; signal only forwarded between peers |
| S16 | WebSocket abuse | Mass socket connects consuming presence | connection rate limiting / guardrails |
| S17 | File upload attacks | Upload polyglot/executable with image extension, oversized file, non-image MIME, file with script payload | rejected by MIME/content validation + size cap; served from CDN with forced content-type, not executable |
| S18 | XSS | Profile bio, display name, chat text with `<script>`, `javascript:` URLs, event handlers | sanitized by `xssGuard` (server) + React escaping (client); stored content re-read is inert |
| S19 | SQL injection | SQL fragments in q/filter/orderBy/pagination params | parameterized Prisma queries; zod validation rejects invalid types |
| S20 | CSRF | Cross-site POST without CORS-approved origin / credential cookie; state-changing endpoint from disallowed origin | blocked by strict CORS (`corsOrigin`) and token-in-header auth model |
| S21 | Rate-limit bypass | Rotate `X-Forwarded-For` to evade HTTP rate limits, OTP send hammering, brute-force login | rate limits keyed on stable identity + trust-proxy config; OTP limiter applies |
| S22 | Enumeration | `/auth/forgot-password` for unknown account | generic success, no account existence leak |

Also verify: admin JWT cannot be used as a user JWT and vice-versa, HSTS/security
headers present (helmet), secrets never appear in API responses or logs
(`auditLogger` redaction).

## Wallet invariant tests - planned (partially implemented)

The implemented `wallet.test.ts` covers non-positive amounts, insufficient
balance, missing wallet, single credit/debit accounting. The following
invariants must be covered by new tests (mock-level unit tests plus
integration tests against a real DB):

- **No client-side balance mutation**: balance is only ever changed by the
  server services (`creditCoins`/`debitCoins`/`handlePaymentSuccess`/`endCall`);
  assert no route accepts a balance value from the request body.
- **Atomic transactions**: a failed debit (e.g. wallet row write error) rolls
  back both the balance change and the ledger entry (assert using a real
  `$transaction` in integration).
- **Immutable ledger**: once a `walletTransaction` is written (with
  `balanceAfter`), no code path updates/deletes it; add a DB constraint/assert
  test for append-only behavior and unique `referenceId` per `(userId, type)`.
- **Duplicate prevention**: retrying a purchase webhook, a call end, or a gift
  must not double-credit/debit; assert single ledger row per `referenceId`.
- **Refund handling**: failed/refunded payments (`paymentUpdate` to
  `FAILED`/`CANCELLED`) must not credit; refunds returned to wallet create an
  `ADJUSTMENT`/`REFUND` ledger row and never reverse-balance below zero
  inconsistently with the ledger trail.
- **Reconciliation**: a report query proves `wallet.balance` equals
  `SUM(walletTransaction.amount)` per user for all completed transactions; run
  it in CI against seeded data and in DR verification.

## Call-billing tests - planned (partially implemented)

Implemented: `computeCallBilling` per-minute rounding with 1-minute minimum,
rate lookup, and creator-share split asserting
`platformFeeCoins + creatorCoins == costCoins`. Expand to:

- **Rate**: correct rate per call type (`AUDIO_VIDEO` constants); rate applied
  at initiate (call `costCoins` seeded) and at end.
- **Duration**: billing based on `startedAt` (falls back to `answeredAt`, then
  `createdAt`); 0-second and sub-minute calls still bill 1 minute; overage
  rounds up.
- **Balance**: caller is charged exactly `costCoins` and never over-drawn
  (guarded with a MIN/floor in `endCall`).
- **Creator share / platform fee**: `creatorEarnings == cost * share`,
  remainder is platform fee; PENDING earning row created only when duration > 0
  and receiver is a creator.
- **Interruption**: disconnect during `RINGING` or mid-call -> call `FAILED` /
  ended and billing is consistent with the connected duration; creator status
  reset (`AVAILABLE`).
- **Reconnection**: `RECONNECTING` window is non-billable; billing continues
  only while `CONNECTED` (deadline in `call-tracker`).
- **Duplicate billing prevention**: `endCall` on an already-`COMPLETED` call
  returns `alreadyCompleted` without a second debit (`services/calls.ts`);
  assert exactly one wallet debit and one earning per call id.

## Mobile responsiveness - planned

Matrix to validate in the web app (target a staging build):

- Small phones (e.g. 320-375 CSS px), large phones (390-430 px), tablets
  (768-1024 px), desktop (1280+ px), in portrait and landscape.
- Key screens: signup/login, onboarding, profile edit, discovery feed/feed
  cards, chat thread, call screen (in-call controls), gift sheet, creator
  profile, Talk Now queue, wallet/subscription/purchase modals, settings.
- Checks per viewport: no horizontal scroll on core flows, tappable targets at
  least 44x44 px, sticky action bars do not cover content, call controls
  usable one-handed, media grids reflow, large text does not clip.

## Browser testing - planned

Validate in the current evergreen set (real or emulated browsers, at minimum
latest-major versions):

- Chrome, Safari, Firefox, Edge.
- Per browser: signup through first-call flow, chat delivery, call signaling
  (WebRTC attaches), audio/video toggles, gift animation, audio auto-play
  policy behavior, push/notification permission, tab focus/background
  behavior (messages and call state sent while tab inactive), reconnection on
  network drop.

## Accessibility - planned

Target WCAG 2.1 AA on the web and admin apps:

- **Keyboard navigation**: full flow operable with keyboard only - discovery,
  chat composer, call controls, modals/rollups, gift sheet, admin tables.
- **Screen reader labels**: every input, button, icon button, and live region
  (new message, incoming call, call state) has an accessible name;
  `aria-live` for chat/call/presence updates.
- **Focus states**: visible focus ring on all interactive elements; focus
  order logical; focus trapped correctly in modals.
- **Contrast**: text and UI components meet 4.5:1 (large text 3:1); status
  colors (online/offline, in-call, coin balance) also conveyed non-colorfully.
- **Form labels**: every form field labeled (not placeholder-only); validation
  errors announced and associated with the field.
- **Error messaging**: inline, specific, and recoverable; not only toast.
- **Reduced motion**: `prefers-reduced-motion` disables/tons down gift
  animations and match/chat transitions.

## Definition of done

A feature is "tested" only when: unit/integration tests cover the critical
paths and guards, the suite passes in CI, and any new user-visible surface has
a documented test plan in this file. Mark sections Implemented here as they
land; never promote a release to production with the security/E2E/load plans
incomplete (see docs/PRODUCTION-CHECKLIST.md).