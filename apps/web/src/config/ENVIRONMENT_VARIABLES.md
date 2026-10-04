# VUZKI Environment Variables

This document lists all environment variables required or supported by the VUZKI application.

## Required for current production

| Name | Required | Service | Purpose | Example | Configure In |
|------|----------|---------|---------|---------|--------------|
| `NODE_ENV` | YES | Web / API | Runtime environment | `production` | Root `.env` / Render |
| `DATABASE_URL` | YES | Prisma / API | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Root `.env` / Render |
| `REDIS_URL` | YES | API / Web | Redis connection for sessions/sockets | `rediss://:pass@host:6379` | Root `.env` / Render |
| `JWT_SECRET` | YES | API | Core authentication token signing | `your-64-char-random-string` | Root `.env` / Render |
| `JWT_REFRESH_SECRET` | YES | API | Refresh token signing | `your-64-char-random-string` | Root `.env` / Render |
| `SESSION_SECRET` | YES | API | Session coordination | `your-64-char-random-string` | Root `.env` / Render |
| `ADMIN_JWT_SECRET` | YES | API | Admin authentication | `your-64-char-random-string` | Root `.env` / Render |
| `NEXT_PUBLIC_API_URL` | YES | Web (Client) | Endpoint for API requests | `https://vuzki.app/api/v1` | Root `.env` / Render |
| `NEXT_PUBLIC_APP_NAME` | YES | Web (Client) | Application display name | `VUZKI` | Root `.env` / Render |
| `NEXT_PUBLIC_SITE_URL` | YES | Web (Client) | Primary site URL | `https://vuzki.app` | Root `.env` / Render |
| `NEXT_PUBLIC_SOCKET_URL`| YES | Web (Client) | WebSocket endpoint | `https://vuzki.app` | Root `.env` / Render |

## Optional

| Name | Required | Service | Purpose | Example | Configure In |
|------|----------|---------|---------|---------|--------------|
| `PORT` / `API_PORT` | NO | API | API port | `4000` | Root `.env` / Render |
| `WEB_PORT` | NO | Web | Next.js dev port | `3000` | Root `.env` |
| `CORS_ORIGINS` | NO | API | Approved CORS origins | `https://vuzki.app` | Root `.env` / Render |
| `LOG_LEVEL` | NO | API | Logging verbosity | `info` | Root `.env` / Render |
| `DEMO_MODE` | NO | Web / API | Allow bypass of real payments/OTP | `false` | Root `.env` / Render |
| `GOOGLE_CLIENT_ID` | NO | API / Web | Google OAuth | `client-id.apps.googleusercontent.com` | Root `.env` / Render |
| `GOOGLE_CLIENT_SECRET` | NO | API | Google OAuth | `your-client-secret` | Root `.env` / Render |
| `APPLE_CLIENT_ID` | NO | API / Web | Apple OAuth | `com.vuzki.app` | Root `.env` / Render |
| `APPLE_TEAM_ID` | NO | API | Apple OAuth | `TEAM12345` | Root `.env` / Render |
| `APPLE_KEY_ID` | NO | API | Apple OAuth | `KEY12345` | Root `.env` / Render |
| `APPLE_PRIVATE_KEY` | NO | API | Apple OAuth | `-----BEGIN PRIVATE KEY-----...` | Root `.env` / Render |
| `SMTP_HOST` | NO | API | Email dispatch | `smtp.mailtrap.io` | Root `.env` / Render |
| `OTP_PROVIDER` | NO | API | OTP implementation | `twilio` | Root `.env` / Render |
| `STORAGE_PROVIDER` | NO | API | Upload storage (s3 / local) | `s3` | Root `.env` / Render |

## Future / planned features

| Name | Required | Service | Purpose | Example | Configure In |
|------|----------|---------|---------|---------|--------------|
| `PAYMENT_PROVIDER` | NO | API | Razorpay / Stripe / PhonePe | `razorpay` | Root `.env` / Render |
| `PHONEPE_MERCHANT_ID` | NO | API | PhonePe payments integration | `MERCHANT_ID` | Root `.env` / Render |
| `STRIPE_SECRET_KEY` | NO | API | Stripe integration | `sk_test_123` | Root `.env` / Render |
| `LIVEKIT_URL` | NO | API | WebRTC video/audio calling | `wss://rtc.vuzki.app` | Root `.env` / Render |
| `AI_PROVIDER` | NO | API | Auto-moderation provider | `openai` | Root `.env` / Render |
| `PUSH_PROVIDER` | NO | API | FCM / OneSignal push notifications | `fcm` | Root `.env` / Render |
