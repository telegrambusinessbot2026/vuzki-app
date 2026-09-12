# VUZKI Environment Variables

This document describes every environment variable consumed by VUZKI, grouped by configuration
area, based on `apps/api/src/config/index.ts` and `.env.example`. Each environment (development,
staging, production) gets its own `.env` file. Secrets are never committed and are delivered via a
secret manager in production.

## Env file strategy

- Copy `.env.example` to `.env` for local development and to a per-environment file (e.g.
  `.env.staging`, `.env.production`) for deployments.
- **Never commit** `.env`, `.env.*`, or any real secret value to git.
- Production credentials must not be copied into development environments.
- The `migrations`/`api`/`worker` services in docker-compose load env from an `--env-file`.
- Secrets referenced by placeholders are injected from a secret manager at runtime in production
  (see `SECRETS_MANAGER_ARN` note in `.env.example`).

---

## Server

| Variable            | Default           | Purpose                                                          |
| ------------------- | ----------------- | ---------------------------------------------------------------- |
| `NODE_ENV`          | `development`     | Runtime environment (`development`, `staging`, `production`).   |
| `ENVIRONMENT`       | `production`      | Deployment environment label.                                    |
| `PORT`              | (platform)        | Host-injected port (Render). Falls back to `API_PORT` locally.  |
| `API_PORT`          | `4000`            | Port the API listens on when `PORT` is not provided.            |
| `API_HOST`          | `0.0.0.0`         | Bind address for the API.                                        |
| `API_PUBLIC_URL`    | localhost:4000    | Externally reachable API base URL (used for links/redirects).    |
| `LOG_LEVEL`         | `debug`/`info`    | Logging verbosity (`debug`, `info`, `warn`, `error`).            |
| `BUILD_ID`          | (empty)           | Build/release identifier embedded in logs and health responses.  |

---

## Security

| Variable                    | Default                        | Purpose                                            |
| --------------------------- | ------------------------------ | -------------------------------------------------- |
| `JWT_SECRET`                | dev-only placeholder           | Signs access JWTs. **Must be set explicitly in production** (API fails fast otherwise). |
| `JWT_REFRESH_SECRET`        | dev-only placeholder           | Signs refresh JWTs. Distinct from `JWT_SECRET`. **Required in production.** |
| `SESSION_SECRET`            | falls back to `JWT_SECRET`     | Signs session/cookie data (admin & app sessions). **Required in production.** |
| `ADMIN_JWT_SECRET`          | dev-only placeholder / `JWT_SECRET` | Signs admin tokens separately from user tokens. **Required in production.** |
| `ACCESS_TOKEN_TTL`          | `15m`                          | Access token lifetime (e.g. `15m`, `1h`).          |
| `REFRESH_TOKEN_TTL_DAYS`    | `30`                           | Refresh token lifetime in days.                    |

> Note: In development, missing JWT secrets fall back to local dev-only defaults.
> In `production`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` and
> `ADMIN_JWT_SECRET` must all be present or the API refuses to start.

---

## URLs

| Variable        | Default              | Purpose                                    |
| --------------- | -------------------- | ------------------------------------------ |
| `WEB_URL`       | `http://localhost:3000` | User-facing app origin.                  |
| `ADMIN_URL`     | `http://localhost:3001` | Admin dashboard origin.                 |
| `WEBSITE_URL`   | falls back to `WEB_URL` | Public marketing/website origin.        |

---

## CORS

| Variable           | Default                          | Purpose                                              |
| ------------------ | -------------------------------- | ---------------------------------------------------- |
| `CORS_ORIGINS`     | empty (falls back to WEB/ADMIN)  | Comma-separated allowlist of origins allowed by CORS.|
| `CORS_CREDENTIALS` | `true`                           | Whether CORS credentials are enabled.                |

---

## Database

| Variable       | Default | Purpose                              |
| -------------- | ------- | ------------------------------------ |
| `DATABASE_URL` | (none)  | PostgreSQL connection string (Prisma). |

Use a least-privilege app user in production; never expose Postgres publicly.

---

## Redis

| Variable                | Default         | Purpose                                              |
| ----------------------- | --------------- | ---------------------------------------------------- |
| `REDIS_URL`             | (none)          | Connection string (includes password/TLS scheme).    |
| `REDIS_PASSWORD`        | (none)          | Redis auth password.                                 |
| `REDIS_TLS`             | `true`          | Whether to use TLS for Redis.                        |
| `REDIS_MAXMEMORY`       | `1gb`           | Redis max memory for cache/rate-limit data.          |
| `REDIS_MAXMEMORY_POLICY`| `noeviction`    | Redis eviction policy.                               |

Redis is used for rate limiting, presence, sessions, sockets, and job coordination. Keep it on a
private network with TLS + auth.

---

## SMTP / OTP

| Variable               | Default             | Purpose                                      |
| ---------------------- | ------------------- | -------------------------------------------- |
| `SMTP_HOST`            | `smtp.mailtrap.io`  | SMTP server host.                            |
| `SMTP_PORT`            | `2525`              | SMTP server port.                            |
| `SMTP_USER`            | (empty)             | SMTP auth user.                              |
| `SMTP_PASS`            | (empty)             | SMTP auth password.                          |
| `FROM_EMAIL`           | `no-reply@vuzki.app`| Sender address for outgoing email.           |
| `OTP_PROVIDER`         | `dev`               | `dev` \| `twilio` \| `msg91`.                |
| `TWILIO_ACCOUNT_SID`   | (empty)             | Twilio account SID (when provider is twilio).|
| `TWILIO_AUTH_TOKEN`    | (empty)             | Twilio auth token.                           |
| `TWILIO_SERVICE_SID`   | (empty)             | Twilio verify service SID.                   |

---

## OAuth

> **Status: not implemented yet.** Google/Apple OAuth are not wired end-to-end
> (no authorization redirect, callback, code/token exchange, ID-token
> verification, account linking, or token issuance). The frontend hides the
> Google/Apple buttons. Values below are reserved for a future OAuth flow.

| Variable                | Default | Purpose                                   |
| ----------------------- | ------- | ----------------------------------------- |
| `GOOGLE_CLIENT_ID`      | (empty) | Google OAuth client id.                   |
| `GOOGLE_CLIENT_SECRET`  | (empty) | Google OAuth client secret.               |
| `APPLE_CLIENT_ID`       | (empty) | Apple OAuth client id (service id).       |
| `APPLE_TEAM_ID`         | (empty) | Apple developer team id.                  |
| `APPLE_KEY_ID`          | (empty) | Apple signing key id.                     |
| `APPLE_PRIVATE_KEY`     | (empty) | Apple private key (for JWT signing).      |

---

## Payments

| Variable                     | Default   | Purpose                                       |
| ---------------------------- | --------- | --------------------------------------------- |
| `PAYMENT_PROVIDER`           | `demo`    | `demo` \| `razorpay` \| `cashfree` \| `stripe` \| `phonepe`. Staging/prod must not be `demo`. |
| `DEMO_MODE`                  | `false`   | Enables demo payment provider behavior.       |
| `RAZORPAY_KEY_ID`           | (empty)   | Razorpay key id.                              |
| `RAZORPAY_KEY_SECRET`       | (empty)   | Razorpay key secret.                          |
| `RAZORPAY_WEBHOOK_SECRET`   | (empty)   | Razorpay webhook signature secret.            |
| `STRIPE_SECRET_KEY`         | (empty)   | Stripe secret key.                            |
| `STRIPE_WEBHOOK_SECRET`     | (empty)   | Stripe webhook signature secret.              |
| `CASHFREE_CLIENT_ID`        | (empty)   | Cashfree client id.                           |
| `CASHFREE_CLIENT_SECRET`    | (empty)   | Cashfree client secret.                       |
| `WEBHOOK_SECRET`            | (empty)   | Shared secret authenticating provider webhooks / signing keys (non-demo fulfillment). |
| `PHONEPE_MERCHANT_ID`       | (empty)   | PhonePe merchant id.                          |
| `PHONEPE_CLIENT_ID`         | (empty)   | PhonePe client id.                            |
| `PHONEPE_CLIENT_SECRET`     | (empty)   | PhonePe client secret.                        |
| `PHONEPE_SALT_KEY`          | (empty)   | PhonePe salt key.                             |
| `PHONEPE_SALT_INDEX`        | (empty)   | PhonePe salt index.                           |

---

## RTC / Calls

| Variable                | Default    | Purpose                                        |
| ----------------------- | ---------- | ---------------------------------------------- |
| `RTC_PROVIDER`          | `webrtc`   | `webrtc` \| `twilio` \| `agora` \| `livekit`.  |
| `TWILIO_API_KEY`        | (empty)    | Twilio API key (RTC).                          |
| `TWILIO_API_SECRET`     | (empty)    | Twilio API secret (RTC).                       |
| `AGORA_APP_ID`          | (empty)    | Agora app id.                                  |
| `AGORA_APP_CERTIFICATE` | (empty)    | Agora app certificate.                         |
| `LIVEKIT_URL`           | (empty)    | LiveKit server URL (e.g. `wss://rtc.vuzki.app`).|
| `LIVEKIT_API_KEY`       | (empty)    | LiveKit API key.                               |
| `LIVEKIT_API_SECRET`    | (empty)    | LiveKit API secret.                            |
| `TURN_URL`              | (empty)    | TURN relay server URL.                         |
| `TURN_USERNAME`         | (empty)    | TURN username.                                 |
| `TURN_CREDENTIAL`       | (empty)    | TURN credential.                               |

---

## Storage

| Variable           | Default      | Purpose                                          |
| ------------------ | ------------ | ------------------------------------------------ |
| `STORAGE_PROVIDER` | `local`      | `local` \| `s3`. Production should use S3-compatible object storage. |
| `S3_BUCKET`        | (empty)      | S3 bucket for uploads.                           |
| `S3_REGION`        | (empty)      | S3 region.                                       |
| `S3_ACCESS_KEY`    | (empty)      | S3 access key.                                   |
| `S3_SECRET_KEY`    | (empty)      | S3 secret key.                                   |
| `S3_ENDPOINT`      | (empty)      | Custom S3-compatible endpoint (optional).        |
| `UPLOAD_DIR`       | `uploads`    | Local upload directory (when local storage).     |
| `CDN_BASE_URL`     | (empty)      | CDN origin serving uploaded content.             |

---

## AI Moderation

| Variable                       | Default                  | Purpose                                             |
| ------------------------------ | ------------------------ | --------------------------------------------------- |
| `AI_PROVIDER`                  | `off`                    | `off` \| `openai` \| `local`.                       |
| `OPENAI_API_KEY`               | (empty)                  | OpenAI API key.                                     |
| `AI_MODERATION_MODEL`          | `openai:moderation-latest` | Text moderation model.                             |
| `AI_MODERATION_VERSION`        | `v1`                     | Moderation version/endpoint.                        |
| `IMAGE_MODERATION_ENABLED`     | `false`                  | Enable image moderation.                            |
| `IMAGE_MODERATION_PROVIDER`    | `off`                    | `off` \| `openai` \| `local` image moderation.      |
| `SAFETY_RISK_ENABLED`          | `true`                   | Enable safety-risk assessment.                      |
| `FRAUD_DETECTION_ENABLED`      | `true`                   | Enable fraud detection signals.                     |
| `BOT_DETECTION_ENABLED`        | `true`                   | Enable bot/automation detection.                    |
| `RETENTION_ENABLED`            | `false`                  | Enable data retention/deletion worker behavior.     |

---

## Push

| Variable             | Default   | Purpose                                        |
| -------------------- | --------- | ---------------------------------------------- |
| `PUSH_PROVIDER`      | `off`     | `off` \| `fcm` \| `apns` \| `onesignal`.       |
| `FCM_SERVER_KEY`     | (empty)   | Firebase Cloud Messaging server key.           |
| `ONESIGNAL_APP_ID`   | (empty)   | OneSignal app id.                              |
| `ONESIGNAL_REST_KEY` | (empty)   | OneSignal REST API key.                        |

---

## Analytics

| Variable               | Default   | Purpose                                     |
| ---------------------- | --------- | ------------------------------------------- |
| `ANALYTICS_PROVIDER`   | `off`     | `off` \| `posthog` \| `mixpanel` \| `amplitude`. |
| `POSTHOG_KEY`          | (empty)   | PostHog project key.                        |
| `POSTHOG_HOST`         | (empty)   | PostHog host (e.g. `https://us.i.posthog.com`). |
| `MIXPANEL_TOKEN`       | (empty)   | Mixpanel token.                             |
| `AMPLITUDE_KEY`        | (empty)   | Amplitude API key.                          |

---

## Error Tracking

| Variable      | Default | Purpose                     |
| ------------- | ------- | --------------------------- |
| `SENTRY_DSN`  | (empty) | Sentry DSN for error tracking. |

---

## Feature Flags

| Variable                   | Default | Purpose                                   |
| -------------------------- | ------- | ----------------------------------------- |
| `FEATURE_TALK_NOW`         | `true`  | Enable "Talk Now" instant matching.       |
| `FEATURE_VIDEO_CALLS`      | `true`  | Enable video calls.                       |
| `FEATURE_NEW_MATCHING`     | `false` | Enable new matching algorithm.            |
| `FEATURE_PROMOTIONS`       | `false` | Enable promotions.                        |
| `FEATURE_GIFTS`            | `true`  | Enable gifts.                             |
| `FEATURE_CREATOR_FEATURES` | `true`  | Enable creator features.                  |
| `FEATURE_SUBSCRIPTIONS`    | `true`  | Enable subscriptions.                     |

Flags can be toggled per environment and at runtime via the admin API.

---

## Currency / Pricing

| Variable               | Default | Purpose                      |
| ---------------------- | ------- | ---------------------------- |
| `CURRENCY`             | `INR`   | Default currency code.       |
| `SUPER_LIKE_COST`      | `30`    | Cost of a super like.        |
| `REFERRAL_REWARD`      | `50`    | Referral reward amount.      |
| `BOOST_30_MIN`         | `50`    | 30-minute boost price.       |
| `BOOST_1_HOUR`         | `90`    | 1-hour boost price.          |
| `BOOST_3_HOUR`         | `200`   | 3-hour boost price.          |
| `DAILY_REWARD_DEFAULT` | `5`     | Daily reward default amount. |
| `GRATIS_*`, other pricing | —     | Additional pricing as pricing evolves. |

---

## Rate Limiting

| Variable               | Default  | Purpose                                  |
| ---------------------- | -------- | ---------------------------------------- |
| `RATE_LIMIT_WINDOW_MS` | `60000`  | In-memory fallback rate-limit window.    |
| `RATE_LIMIT_MAX`       | `600`    | In-memory fallback max requests/window.  |

Redis-driven per-endpoint limits are configured in code.

---

## Backup

| Variable                 | Default         | Purpose                                   |
| ------------------------ | --------------- | ----------------------------------------- |
| `BACKUP_BUCKET`          | (none)          | S3 destination for backups (used by `scripts/backup.sh`). |
| `BACKUP_RETENTION_DAYS`  | `30`            | Retention period for backups.             |

---

## Frontend public build-time variables

These are `NEXT_PUBLIC_*` values baked into the web/admin images at build time (see the Dockerfiles
and docker-compose `args`). They are public and must never contain secrets.

| Variable                  | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | Public API base URL used by the web app.    |
| `NEXT_PUBLIC_SOCKET_URL`  | Public WebSocket/Socket.IO URL used by the web app. |

Build-time values in docker-compose:
`WEB_API_URL` / `WEB_SOCKET_URL` (for web) and `ADMIN_API_URL` (for admin) map into these build
args.

---

## Other / host / deploy

| Variable                      | Default             | Purpose                                       |
| ----------------------------- | ------------------- | --------------------------------------------- |
| `POSTGRES_USER`               | `vuzki`             | Postgres user for local compose provisioning. |
| `POSTGRES_PASSWORD`           | (required)          | Postgres password for local compose.          |
| `POSTGRES_DB`                 | `vuzki`             | Postgres database name.                       |
| `WEB_PORT` / `ADMIN_PORT`     | `3000` / `3001`     | Host ports for web/admin in compose.          |
| `SECRETS_MANAGER_ARN`         | (empty)             | Secret-manager reference for production secrets. |
| `TEST_MODE` / `SEED_ADMIN_*`  | (empty)             | Staging/production bootstrap only; rotate after first login. |

---

## Secrets

Secrets (JWT_*, SESSION_SECRET, SMTP_PASS, TWILIO_*, GOOGLE_*, APPLE_*, *_WEBHOOK_SECRET,
S3_SECRET_KEY, OPENAI_API_KEY, FCM_SERVER_KEY, payment keys) are managed via a secret manager in
production and injected at runtime. Never commit them, and never place them in the frontend.
