# VUZKI - API Reference Overview

The VUZKI backend is an Express + Socket.IO API that serves the user web app
and the admin dashboard. Router mounting is defined in
`apps/api/src/routes/index.ts`; all business routes live under the
`/api/v1` prefix. This document is an overview - the **full endpoint catalog
must be validated against the code** in `apps/api/src/routes/` before relying
on it for client implementation, since surface details change as the product
evolves.

## Base URL

```
https://api.vuzki.app/api/v1
```

In local development the API runs on `http://localhost:4000/api/v1`
(dev API port `4000`, see `API_PORT` / `API_PUBLIC_URL` in `.env.example`).

## Authentication

### User (Bearer JWT)

Except for the explicitly public endpoints (auth login/register/OTP flows,
provider webhooks, health probes), every endpoint requires a signed JWT access
token:

```
Authorization: Bearer <access_token>
```

- Tokens are issued by `POST /api/v1/auth/register` and
  `POST /api/v1/auth/login` (a `tokens` object with `accessToken`/"refreshToken"
  fields) and refreshed via `POST /api/v1/auth/refresh`.
- Access tokens are short-lived (default `ACCESS_TOKEN_TTL=15m`); refresh
  tokens persist for `REFRESH_TOKEN_TTL_DAYS=30`.
- The JWT carries `{ userId, sessionId }`. `authenticate()` (in
  `apps/api/src/middleware/auth.ts`) verifies the signature, rejects deleted
  accounts and returns `403 BANNED` / `403 SUSPENDED` for restricted statuses.
- Missing/invalid/expired tokens yield `401 UNAUTHORIZED`.

### Admin (admin JWT)

Admin endpoints (`/admin/*`) authenticate against the `Admin` table with a
12-hour admin JWT issued by `POST /api/v1/admin/login`:

```
Authorization: Bearer <admin_jwt>
```

`requireAdmin` validates the token; `requireRole('SUPER_ADMIN')` and
`requirePermission('resource.action')` further gate endpoints (e.g.
`users.read`, `finance.write`, `flags.write`). Role/permission enforcement
lives in `apps/api/src/guards` and the `AdminRoleModel` schema.

## Response envelope

Successful responses use:

```json
{
  "success": true,
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fieldErrors": { "email": "Invalid email" },
    "details": {}
  }
}
```

Errors are produced by `apps/api/src/middleware/errors.ts`. `fieldErrors`
appear on Zod validation failures; `details` may be attached to any error.

## Error codes

Common codes include (not exhaustive - validate against code):

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod body/query validation failed; see `fieldErrors`. |
| 400 | `INVALID_IDENTIFIER` / `INVALID_EMAIL` / `INVALID_PHONE` / `WEAK_PASSWORD` / `INVALID_OTP` / `CREDENTIAL_REQUIRED` / `IDENTIFIER_REQUIRED` / `ALREADY_CLAIMED` / `NO_DATA` | Auth/claims/payload problems. |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token. |
| 401 | `INVALID_CREDENTIALS` / `INVALID_REFRESH` / `REFRESH_EXPIRED` | Bad credentials or refresh token. |
| 401 | `INVALID_ADMIN_CREDENTIALS` | Bad admin login. |
| 403 | `FORBIDDEN` | Authenticated but not permitted. |
| 403 | `BANNED` / `SUSPENDED` | Account restricted. |
| 404 | `NOT_FOUND` | Route not found; entity lookups often use scoped codes (`USER_NOT_FOUND`, `DEVICE_NOT_FOUND`, `REPORT_NOT_FOUND`, `WITHDRAWAL_NOT_FOUND`, `NOT_CREATOR`). |
| 409 | `ACCOUNT_EXISTS` | Duplicate identity on registration. |
| 500 | `INTERNAL_ERROR` | Unhandled server error (message is generic in production). |

## Rate limiting

- Global defaults from `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`
  (express-rate-limit).
- Sensitive flows are more strictly limited inline, e.g.
  `POST /auth/send-otp` (8/15min), `POST /auth/register` (5/15min),
  `POST /auth/login` (10/15min), `POST /auth/refresh` (60/min),
  `POST /auth/forgot-password` and `reset-password` (5/15min).
- Redis-backed rate limits (`realtime/ratelimit.ts`) also guard Socket.IO
  events and presence.
- Excessive requests to protected actions return `429`. Clients must back off
  on `429`/`Retry-After`.

## CORS

Strict CORS in `apps/api/src/middleware/security.ts` - only approved VUZKI
origins are allowed (from `CORS_ORIGINS`, default
`https://app.vuzki.app,https://admin.vuzki.app,https://vuzki.app`).
Credentials (`CORS_CREDENTIALS=true` in prod) are reflected only when
configured. Non-approved origins are rejected at the middleware.

## Security headers

`helmet` applies at `apps/api/src/app.ts`:

- CSP with restrictive `default-src 'none'` (API is JSON-only), `frame-ancestors
  'none'`, `object-src 'none'`.
- HSTS (max-age 1y, includeSubDomains, preload) in production.
- `crossOriginResourcePolicy: { policy: 'cross-origin' }` for media responses.
- Body limits (`2mb` JSON / `1mb` urlencoded), XSS sanitization of text fields,
  structured request logging, `trust proxy` set for correct client IPs behind
  the LB.

## Health and readiness probes

Unauthenticated, intentionally outside `/api/v1`:

- `GET /health` - liveness. Returns `{ status, service, timestamp, uptime, build }`.
- `GET /ready` - readiness. Executes `SELECT 1` against Postgres and pings Redis
  (when `REDIS_URL` set); returns `200 { status: "ok", checks: [...] }` or
  `503 { status: "degraded", checks: [...] }`.

## Endpoint groups

All under `/api/v1`. Auth column: `User` = user Bearer JWT, `Admin` = admin
Bearer JWT, `Public` = no auth required.

### Auth (`/auth`)
Login, register, OTP, refresh, logout, password reset and session/device
management.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/send-otp` | Public | Send OTP for registration/login/password_reset. |
| POST | `/auth/register` | Public | Create account (local email/phone or Google/Apple), returns tokens + user. |
| POST | `/auth/login` | Public | Password or OTP login, returns tokens + user. |
| POST | `/auth/refresh` | Public | Rotate tokens via refresh token. |
| POST | `/auth/logout` | User | Deactivate the session's refresh token. |
| POST | `/auth/forgot-password` | Public | Send password-reset OTP (no user enumeration). |
| POST | `/auth/reset-password` | Public | Reset password with OTP. |
| POST | `/auth/verify` | Public | Verify email/phone with registration OTP. |
| GET | `/auth/me` | User | Current authenticated user (wallet, preferences, active subscription). |
| GET | `/auth/devices` | User | List active sessions/devices. |
| DELETE | `/auth/devices/:id` | User | Revoke a device session. |

### Users (`/users`)
Profiles, onboarding, location, super-likes, blocking, online status.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/users/:id` | User | Public view of another user. |
| GET | `/users/me/profile` | User | Own profile with onboarding data. |
| PUT | `/users/me/profile` | User | Update own profile. |
| POST | `/users/me/location` | User | Report location (discovery). |
| POST | `/users/:id/super-like` | User | Send a super-like. |
| PUT | `/users/:id/block` | User | Block another user. |
| DELETE | `/users/:id/block` | User | Unblock a user. |
| GET | `/users/me/blocked` | User | List blocked users. |
| PUT | `/users/me/online` | User | Set online/offline presence. |

### Discovery (`/discovery`)
Feed, Talk Now candidate queue, likes/passes, matches.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/discovery/feed` | User | Discovery feed of potential matches. |
| GET | `/discovery/talk-now` | User | Talk Now queue candidates. |
| POST | `/discovery/like` | User | Like a user (creates a match when mutual). |
| POST | `/discovery/pass` | User | Pass on a user. |
| GET | `/discovery/likes-received` | User | Users who liked you. |
| GET | `/discovery/matches` | User | Your matches. |

### Chat (`/chat`)
Conversations and messages (with realtime delivery over Socket.IO).

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/chat/conversations` | User | List conversations. |
| GET | `/chat/:conversationId/messages` | User | Paginated messages in a conversation. |
| GET | `/chat/with/:userId` | User | Get/create conversation with a user. |
| POST | `/chat/messages/:id/reaction` | User | React to a message. |
| DELETE | `/chat/messages/:id` | User | Delete a message. |

### Calls (`/calls`)
Audio/video calls and Talk Now sessions (RTC provider).

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/calls/talk-now/start` | User | Start a Talk Now session. |
| GET | `/calls/talk-now/status` | User | Current Talk Now session status. |
| POST | `/calls/talk-now/cancel` | User | Cancel Talk Now session. |
| GET | `/calls/talk-now/listeners` | User | Available listeners. |
| POST | `/calls/initiate` | User | Initiate an audio/video call. |
| GET | `/calls/history` | User | Past calls. |
| GET | `/calls/cost` | User | Per-minute call cost. |
| POST | `/calls/:id/join` | User | Join a call (returns RTC credentials). |
| POST | `/calls/:id/end` | User | End a call and settle billing. |

### Wallet (`/wallet`)
Coins, packages, purchases, ledger.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/wallet` | User | Current balance. |
| GET | `/wallet/packages` | User | Coin packages for sale. |
| POST | `/wallet/purchase` | User | Create a payment order for coins. |
| POST | `/wallet/verify` | User | Verify a completed purchase. |
| GET | `/wallet/history` | User | Wallet transaction history. |

### Subscriptions (`/subscriptions`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/subscriptions/plans` | User | Available plans. |
| GET | `/subscriptions/me` | User | Current subscription. |
| POST | `/subscriptions` | User | Subscribe to a plan. |
| POST | `/subscriptions/verify` | User | Verify subscription payment. |
| POST | `/subscriptions/upgrade` | User | Upgrade tier. |
| POST | `/subscriptions/cancel` | User | Cancel subscription. |
| GET | `/subscriptions/history` | User | Subscription history. |

### Gifts (`/gifts`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/gifts` | User | Gift catalog. |
| POST | `/gifts/send` | User | Send a gift (debits sender, credits receiver). |
| GET | `/gifts/received` | User | Gifts received by the current user. |

### Creators (`/creators`)
Creator applications, availability, dashboard, earnings, KYC.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/creators/browse` | User | Browse creators/listeners. |
| POST | `/creators/apply` | User | Apply to become a creator. |
| GET | `/creators/me/status` | User | Own creator application status. |
| POST | `/creators/me/availability` | User | Set online/offline availability. |
| GET | `/creators/me/dashboard` | User | Creator performance dashboard. |
| GET | `/creators/me/earnings` | User | Earnings breakdown. |
| POST | `/creators/me/earnings/claim` | User | Claim earned coins. |
| POST | `/creators/me/kyc` | User | Submit KYC details. |

### Withdrawals (`/withdrawals`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/withdrawals/meta` | User | Withdrawal methods and limits. |
| POST | `/withdrawals` | User | Request a withdrawal. |
| GET | `/withdrawals` | User | Own withdrawal requests. |

### Referrals (`/referrals`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/referrals` | User | Referral code, stats, eligible rewards. |
| POST | `/referrals/claim-reward` | User | Claim eligible referral coins. |

### Reports (`/reports`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/reports` | User | Report a user (category, description). |
| GET | `/reports/my` | User | Own report history. |

### Notifications (`/notifications`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/notifications` | User | User notifications. |
| GET | `/notifications/unread-count` | User | Unread count. |
| POST | `/notifications/read` | User | Mark items read. |
| POST | `/notifications/read-all` | User | Mark all read. |

### Search (`/search`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/search` | User | Search users by query/filters. |

### Misc (`/`)
Boosts, super-likes, daily rewards, referral claims, uploads.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/boosts/pricing` | User | Boost options and coin costs. |
| POST | `/boosts` | User | Purchase a boost. |
| GET | `/boosts/active` | User | Active boosts. |
| GET | `/super-likes/status` | User | Daily super-like pool/remaining. |
| POST | `/super-likes/purchase` | User | Buy extra super-likes. |
| GET | `/rewards/daily` | User | Daily reward streak status. |
| POST | `/rewards/daily/claim` | User | Claim daily reward. |
| POST | `/referrals/claim-reward` | User | Claim referral rewards. |
| POST | `/upload` | User | Upload file (base64) to storage, returns CDN URL. |

### Admin (`/admin`)
All require `requireAdmin` (admin JWT) plus role/permission gates.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/admin/login` | Public | Admin login -> 12h admin JWT. |
| POST | `/admin/create` | Admin (SUPER_ADMIN) | Create an admin account. |
| GET | `/admin/me` | Admin | Current admin. |
| GET | `/admin/dashboard` | Admin | KPI dashboard (users, calls, revenue, reports...). |
| GET | `/admin/analytics?range=7d|30d` | Admin | Time series (signups, calls, messages, revenue). |
| GET | `/admin/users` | Admin | Search/list users. |
| GET | `/admin/users/:id` | Admin | Full user detail (wallet, reports, moderation, txns). |
| PATCH | `/admin/users/:id` | Admin | verify/unverify/suspend/ban/unban/restore. |
| GET | `/admin/creators` | Admin | List creators. |
| PATCH | `/admin/creators/:id` | Admin | approve/reject/suspend/revoke creator. |
| GET | `/admin/reports` | Admin | List reports. |
| PATCH | `/admin/reports/:id` | Admin | resolve/action/dismiss with moderation action. |
| GET | `/admin/withdrawals` | Admin | List withdrawal requests. |
| PATCH | `/admin/withdrawals/:id` | Admin | approve/process/reject/complete. |
| GET | `/admin/coin-packages` | Admin | List coin packages. |
| POST | `/admin/coin-packages` | Admin | Create coin package. |
| PATCH | `/admin/coin-packages/:id` | Admin | Update coin package. |
| DELETE | `/admin/coin-packages/:id` | Admin | Deactivate coin package. |
| GET | `/admin/subscription-plans` | Admin | List plans. |
| PATCH | `/admin/subscription-plans/:id` | Admin | Update plan. |
| GET | `/admin/gifts` | Admin | Gift catalog. |
| PATCH | `/admin/gifts/:id` | Admin | Update gift. |
| GET | `/admin/finance` | Admin | Financial overview (revenue, withdrawals, earnings). |
| POST | `/admin/notify` | Admin | Send a system notification to a user. |
| POST | `/admin/payments/webhook` | Public (provider) | Payment provider webhook (signature-verified in prod). |
| GET | `/admin/realtime` | Admin | Live WebSocket/presence/call/message metrics. |
| GET | `/admin/flags` | Admin | Feature-flag state. |
| PATCH | `/admin/flags/:key` | Admin | Toggle a feature flag. |
| POST | `/admin/flags/reset` | Admin | Reset flags to env baseline. |

## Real-time (Socket.IO)

Beyond REST, the API serves Socket.IO for chat delivery, presence, matching
and call events. Clients authenticate sockets with the same Bearer JWT. See
`apps/api/src/realtime/` (presence, matching, call-tracker, ratelimit, metrics)
for the current event surface.

## Validation note

This catalog reflects `apps/api/src/routes/*` at the time of writing. Before
shipping clients: run the app (`npm run dev:api`), diff the mounted routers in
`apps/api/src/routes/index.ts`, and confirm payload schemas against each route
before implementation.