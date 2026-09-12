# VUZKI Security Posture

This document describes the security model, controls, and operational guidance for the VUZKI
platform. It is a living document and must be kept in sync with the codebase. All secrets are
referenced as environment placeholders only (see `apps/api/src/config/index.ts` and `.env.example`);
actual secret values are never committed to the repository and are delivered via a secret manager in
production.

---

## 1. Authentication

### Password hashing (bcrypt)

User passwords are never stored in plaintext. The API hashes passwords with `bcryptjs`
(`bcryptjs` in `apps/api/package.json`) before persisting them. Use a cost factor appropriate for
the target hardware (at least 10) and never roll your own hashing. Verify on login with a
constant-time compare provided by bcrypt.

### OTP expiry and attempt limits

One-time passwords (OTPs) for phone/email verification and passwordless login:

- Are short-lived and expire after a fixed time window (configured per provider).
- Have a maximum number of verification attempts; exceeding the limit invalidates the OTP
  and forces a new one to be requested.
- Are consumed on successful use (single-use).
- For the `dev` OTP provider are only printed to the console; `twilio`/`msg91` delivery must be
  used for staging and production.

### Login rate limiting

Authentication endpoints are protected by rate limiting (see the Rate Limiting section) to slow
down credential stuffing and brute-force attacks. Login, OTP request, and OTP verify routes get
stricter per-account limits in addition to per-IP limits.

### Session revocation

Sessions are revocable. Revocation is tracked in Redis (and persisted back to the database where
required) so that logging out of one device or forcing logout from the account page invalidates the
corresponding refresh token and access token. Currently-active sessions can be listed and revoked
individually from the device/session management view.

### Refresh token rotation

Refresh tokens are rotated on every refresh: each refresh request returns a new refresh token and
invalidates the previous one. A refresh token can be used only once. If a previously rotated
(already used) token is presented again, it is treated as a token-reuse indicator and the entire
session family is revoked (defense-in-depth against token theft).

### Suspicious login detection

The API flags logins that look suspicious:

- Login from a new device or new IP/geo that differs from the user's established pattern.
- Rapid consecutive failed login attempts.
- Use of an already-rotated refresh token.

Flagged logins trigger a security notification to the account owner and may require additional
verification (re-request OTP, MFA challenge when available).

### Device / session management

Users can view the list of active devices and sessions for their account and revoke individual
sessions or all sessions ("sign out everywhere"). Session data (browser/device fingerprint, IP, and
timestamps) is stored to support this view and to power suspicious-login detection.

### Security notifications

Security-relevant events notify the account owner by email (and optionally push) via the configured
SMTP/push providers:

- New device or location login.
- Password changed or reset.
- Email/phone changed.
- OAuth account linked or removed.
- Session revoked elsewhere.
- Account locked due to too many failed attempts.

---

## 2. Admin Security

### Roles and permissions (RBAC)

Admin access is governed by role-based access control (RBAC). The supported roles and their intent:

| Role             | Intent                                                        |
| ---------------- | ------------------------------------------------------------- |
| `SUPER_ADMIN`    | Full access, incl. admin/user management and system settings. |
| `ADMIN`          | Broad operational access across users, moderation, finance.   |
| `MODERATOR`      | Content/user moderation only (no finance, no admin mgmt).     |
| `FINANCE_ADMIN`  | Payments, wallets, withdrawals, refunds/reversals.            |
| `SUPPORT_AGENT`  | Read/limited user support actions; no financial settlement.   |

Permissions are assigned per role. Roles are denied by default: every admin endpoint checks the
required permission explicitly, and a role without the matching permission is rejected even if the
route exists. Never grant broader permissions than a role needs (least privilege).

### MFA where supported

Multi-factor authentication is supported for admin accounts where configured (e.g., TOTP). Where an
admin identity provider supports enforced MFA, it should be required for all admin logins,
especially for `SUPER_ADMIN` and `FINANCE_ADMIN`.

### Session timeout

Admin sessions have a configurable inactivity timeout. Idle admin sessions are expired
automatically; a fresh re-authentication (and MFA where enabled) is required after timeout.

### Login monitoring

All admin logins are logged and monitored (see Monitoring). Successful and failed admin logins
are recorded with the account, timestamp, IP, and device. Alerts are raised on failed admin login
bursts and on logins from unexpected locations.

### Audit logging

Admin actions are written to an immutable(ish) audit log: who (admin id), what (action), when,
on what target (user/content/transaction id), and the result. Audit trails cover moderation actions,
financial actions (payments, withdrawals, refunds), account changes, and settings changes. Audit
logs are used for accountability and incident response and must not be deletable by ordinary
admins.

### No shared admin password

There is no shared admin password. Each admin logs in with a unique credential and is identified
individually in audit logs. One-time bootstrap credentials (see `SEED_ADMIN_*` in `.env.example`)
must be rotated after first login and are never used in production.

---

## 3. Rate Limiting

Rate limiting protects the API against abuse and resource exhaustion. Limits are enforced in Redis
(a distributed, per-key limiter) so they work correctly across multiple API instances; when Redis
is unavailable the API falls back to the configured in-memory per-IP limits
(`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`).

Distinct rate limits are applied to:

- **Auth**: login, signup, token refresh, account recovery.
- **OTP**: request and verify (stricter per-account and per-IP).
- **Messages**: per-user outbound message throughput.
- **Calls**: call initiation and RTC token requests.
- **Likes / Super Likes**: per-window caps to prevent spam.
- **Gifts**: gift send limits.
- **Payments**: checkout/order creation and payment confirmation.
- **Withdrawals**: withdrawal request limits (see Withdrawal security).
- **Reports**: user report submission caps to prevent report flooding.
- **Admin**: admin API endpoints get separate, stricter limits.

Limits are tuned per endpoint; the generic defaults are set in `RATE_LIMIT_WINDOW_MS` and
`RATE_LIMIT_MAX`. Over-limit requests receive an HTTP 429 with a `Retry-After` header.

---

## 4. API Security Audit Guidance

Use this checklist when auditing the API for vulnerabilities.

### Authentication
- Every protected route requires a valid token/session; no route is authenticated implicitly by
  presence of a database record.
- Refresh and access tokens are signed with distinct secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`).
- Tokens are verified with proper expiry, audience, and issuer claims.

### Authorization
- Every object-level access checks ownership or role (not just "is logged in"). Prevent IDOR: a
  user cannot read/modify another user's profile, messages, wallet, or settings by guessing ids.
- Admin routes enforce the permission required for the specific action (RBAC), not just any
  admin login.

### Validation
- All input is validated with a schema validator (`zod` is used in the API) at the boundary:
  types, lengths, ranges, allowed values, and formats.
- Reject unknown fields; validate query params, path params, and bodies.
- Enforce payload size limits (the smoke test expects oversized bodies to return 413).

### Rate limiting
- Confirm abuse-sensitive routes (auth, OTP, messages, calls, likes, gifts, payments,
  withdrawals, reports, admin) carry the correct rate limit.

### Input sanitization
- Sanitize user-supplied HTML on the server (see XSS section) for content rendered in contexts
  where React escaping is not guaranteed (email templates, rich text used server-side).

### Error handling
- Do not leak internals in error responses. Return safe, generic messages to clients; log details
  server-side.
- Never echo secrets, stack traces, SQL, or provider credentials to the client.

### Logging
- Log security-relevant events with structured, redacted entries (see Monitoring). Never log
  passwords, tokens, OTPs, or payment secrets.

### Focused threat classes
- **IDOR**: verify object ownership/role on every object read/write.
- **Privilege escalation**: verify role/permission on every admin action; deny by default.
- **Injection**: all DB access via Prisma parameterized queries; no string-built SQL (see SQL
  injection below); validate command inputs to external tools.
- **Abuse**: rate limits, fraud/bot detection, content moderation stay enabled in production.
- **Enumeration**: use generic error messages on login/OTP (do not reveal whether an account,
  email, or phone exists); rate limit to blunt probing.

---

## 5. XSS Sanitization

User-generated content that can contain HTML is sanitized before storage/serving:

- A server-side sanitization middleware strips `script` and `style` tags, inline event handlers
  (e.g., `onerror=`, `onclick=`), and `javascript:` URIs from user content.
- The web/admin clients are React apps; React escapes rendered text by default, which prevents
  most stored/reflected XSS. Sanitization is defense-in-depth for the server side and for any
  non-React rendering path (e.g., email templates).
- Never render sanitized content with `dangerouslySetInnerHTML` without an explicit, reviewed
  reason plus re-sanitization at render time.

---

## 6. SQL Injection

All database access goes through Prisma, which produces parameterized queries. Raw/ad-hoc SQL is not
used for user-controlled input. Dynamic identifiers (column names, ordering) that come from user
input must be whitelisted, never concatenated. This eliminates SQL injection via query parameters.

---

## 7. CSRF

The API does not authenticate end users with cookies for state-changing requests; it uses JWT
bearer tokens (Authorization header) and refresh tokens. This removes the CSRF attack surface for
the primary API.

- Keep this property: do not introduce cookie-based auth for state-changing API endpoints.
- Where cookies are used (sessions, including admin/session cookies), keep `HttpOnly`, `Secure`,
  `SameSite` attributes set appropriately and route state-changing requests over the bearer
  mechanism. Any cookie-authenticated state-changing endpoint must be CSRF-protected.

---

## 8. CORS

The API enforces a strict CORS allowlist via `CORS_ORIGINS` (comma-separated approved origins in
`apps/api/src/config/index.ts`). Only the configured origins (e.g., `https://app.vuzki.app`,
`https://admin.vuzki.app`, `https://vuzki.app`) may call the API from a browser. When
`CORS_ORIGINS` is empty the API falls back to `webUrl` and `adminUrl` only — never a wildcard in
production. `CORS_CREDENTIALS` controls whether credentials are allowed; keep it `false` unless a
cookie-authenticated origin genuinely requires it.

---

## 9. Security Headers

The API uses `helmet` (`helmet` in `apps/api/package.json`) to set secure HTTP response headers:

- **CSP**: `default-src 'none'` blocks script/style/data loading by default; the allowed sources
  are restricted to the bare minimum the API actually needs.
- **HSTS** (`Strict-Transport-Security`): enforces HTTPS for the API domain.
- **X-Content-Type-Options**: `nosniff` prevents MIME-sniffing.
- **Referrer-Policy**: restricts what referrer info leaves the API.
- **Permissions-Policy**: disables unneeded browser features.

These headers apply on the API; the web/admin frontends (served behind HTTPS/CDN) should apply their
own equivalent security headers at the edge.

---

## 10. HTTPS

All environments except local development must be served over HTTPS terminated at the load balancer,
reverse proxy, or CDN edge. HSTS is set by the API; the edge should redirect all HTTP traffic to
HTTPS. TLS versions and cipher suites should follow current best practice.

---

## 11. File Upload Hardening

- **MIME / size limits**: uploads are validated against an allowlist of MIME types and enforced size
  limits. Reject mismatched content (magic bytes vs declared MIME) and oversized files (the API
  rejects oversized bodies with 413).
- **Image reprocessing**: uploaded images are reprocessed/re-encoded server-side (resize, strip
  metadata, re-encode to a safe format), which removes embedded scripts, EXIF, and other payloads.
- **Storage**: files are stored in object storage configured via `STORAGE_PROVIDER`/`S3_*` (or
  `UPLOAD_DIR` locally) and served from a dedicated `CDN_BASE_URL`. Uploaded content is never
  placed where it could be executed.
- **Never serve as executable**: storage buckets/CDNs serve uploads with a non-executable
  `Content-Disposition`/`Content-Type` policy and disable any server-side execution in the upload
  directories. Randomize object keys; never use user-controlled paths or filenames directly.

---

## 12. Payment / Wallet / Subscription Security

- **Webhooks + signatures + idempotency**: payment-provider webhooks
  (`RAZORPAY_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, CASHFREE) are verified by signature and the
  request body is processed only after verification. Webhook handlers are idempotent: a given event
  id is processed at most once (deduplicated, typically in Redis/DB) so retries are safe.
- **Atomic ledger**: wallet credits/debits are applied atomically within database transactions, so
  the ledger cannot drift or double-spend. Credits from payments and debits from purchases are
  balanced.
- **No client-side balance**: the wallet balance is computed/stored server-side and is never
  trusted from the client. Clients can only read their balance; all mutations are server-verified.

---

## 13. Withdrawal Security

- **KYC**: withdrawals require completed KYC before a payout can be requested.
- **Minimum amount**: a minimum withdrawal amount is enforced to keep fees and fraud-incentive low.
- **Limits**: per-request, per-day, and per-account withdrawal limits prevent large single payouts
  and gifting-abuse.
- **Duplicate prevention**: the withdrawal flow is idempotent — the same request cannot create
  duplicate payouts (deduplicated server-side).
- **Fraud checks**: withdrawals are screened by the fraud-detection capabilities (see AI
  moderation/fraud section) — anomalous patterns, refunded/gifted funds, and gaming of referral
  rewards are flagged.
- **Admin approval**: withdrawals above a threshold (and/or flagged ones) require admin review and
  approval before payout; `FINANCE_ADMIN`-level permission is required to approve.

---

## 14. Privacy

Data is classified and handled by sensitivity:

- **Public**: profile display name, avatar, interests, etc. — visible to other users by design.
- **Private**: matches, conversations, gift history, and other account activity — visible only to
  the account owner and authorized staff on a need-to-know basis.
- **Sensitive**: phone number, email, hashed password, session/device data, IP/geolocation — never
  exposed via the API to other users or rendered by the client.
- **Restricted**: KYC documents/data, risk scores, financial history, wallet transactions,
  moderation flags, and fraud signals — restricted to authorized staff (finance/admin), protected by
  RBAC, and never exposed through public or user-facing endpoints.

Never expose a user's phone number, email, exact location, KYC details, risk scores, or financial
history to other users or in public API responses.

### Data deletion flow

Users can request account deletion. The flow:

1. A deletion request is recorded and confirmed with a verification step.
2. Deletion/retention is processed by the background worker (respecting `RETENTION_ENABLED` and any
   regulatory retention obligations).
3. Personal data is removed or anonymized; transactions/ledger entries required for financial and
   legal compliance may be retained anonymously for the mandated period.
4. The user is notified when deletion completes and on any relevant privacy/security changes.

---

## 15. Logging

Structured logs (see `docs/MONITORING.md`) use fields and levels controlled by `LOG_LEVEL`.
Redaction rules are mandatory:

- **Never log**: passwords, password hashes, OTPs/codes, access/refresh tokens, session secrets,
  payment secrets (API keys, webhook secrets), full KYC data, or raw card/PAN data.
- Sensitive fields are redacted (masked) before a log entry is written, including in request bodies
  captured by middleware.

Loggers are configured so that redaction happens at the source and no logging dependency re-exposes
secrets.

---

## 16. Secrets Management

- Secrets are conveyed through environment variables only; the pattern is defined by the placeholders
  in `.env.example` and `apps/api/src/config/index.ts`.
- **Never commit** `.env`, real secrets, or `CHANGE_ME` values to the repository.
- **Never put secrets in the frontend**: only public build-time variables such as
  `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` are exposed to the client. Anything sensitive
  stays server-side.
- In production, secrets are delivered via a secret manager (e.g., AWS Secrets Manager / HashiCorp
  Vault) referenced by placeholders such as `SECRETS_MANAGER_ARN` in `.env.example`. Direct secret
  values are injected at runtime, not baked into images or committed.
- Generate secrets with a strong source, e.g.:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Rotate secrets on a schedule and immediately on suspected exposure; secret rotation must not
  require redeploying the frontend.

---

## Roles and responsibilities

Operators must follow this posture for staging and production. Any deviation, especially around
secrets, admin access, or rate limiting, must be reviewed before deployment. Production go-live
requires verified acceptance (see `docs/DEPLOYMENT.md`).
