import dotenv from 'dotenv';
dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

// Listen on the PORT supplied by the host platform (Render injects this at
// runtime) whenever it is present, so production honors the platform-assigned
// port. Local development keeps the previous behavior (API_PORT, default 4000)
// when no PORT is provided.
const resolvedPort = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);

// Never fall back to insecure dev secrets in production. Fail fast so a
// misconfigured deployment cannot start with forgeable credentials.
function requireProductionSecret(name: string): void {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim() !== '') return;
  throw new Error(
    `[config] Fatal: required production secret "${name}" is not set. ` +
      `Set ${name} in the production environment before starting the API; ` +
      'refusing to start with an insecure default.'
  );
}

if (isProd) {
  requireProductionSecret('JWT_SECRET');
  requireProductionSecret('JWT_REFRESH_SECRET');
  requireProductionSecret('SESSION_SECRET');
  requireProductionSecret('ADMIN_JWT_SECRET');
}

// Resolve a secret. In production every required secret must come from the
// environment and is validated above (fail-fast). A development/default secret
// is used ONLY when NODE_ENV is development; a dev/default secret is never used
// in production. The throw below keeps any future misuse loud.
function secret(name: string, devDefault: string): string {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (isProd) {
    throw new Error(
      `[config] Fatal: required production secret "${name}" is not set. ` +
        'Refusing to start with an insecure default.'
    );
  }
  return devDefault;
}

export const config = {
  env,
  isProd,
  port: resolvedPort,
  host: process.env.API_HOST || '0.0.0.0',

  // Security
  jwtSecret: secret('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET', 'dev-insecure-refresh-secret'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10),

  // URLs
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
  websiteUrl: process.env.WEBSITE_URL || process.env.WEB_URL || 'http://localhost:3000',
  baseUrl:
    process.env.API_PUBLIC_URL ||
    `http://localhost:${resolvedPort}`,

  // CORS - comma separated list of approved origins; empty means fall back to webUrl+adminUrl
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  enableCorsCredentials: process.env.CORS_CREDENTIALS !== 'false',

  // Session / cookie secret for admin & app sessions
  sessionSecret: secret('SESSION_SECRET', secret('JWT_SECRET', 'dev-insecure-session-secret')),

  // Admin JWT secret (separate from user JWT secret for hardened authentication).
  // If not configured, falls back to JWT_SECRET for backward compatibility
  // with existing admin sessions. When set, admin tokens are signed with
  // ADMIN_JWT_SECRET and user tokens with JWT_SECRET, preventing token reuse
  // across surfaces.
  adminJwtSecret: secret('ADMIN_JWT_SECRET', secret('JWT_SECRET', 'dev-insecure-admin-secret-change-me')),

  // Logging
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Rate limiting (per-IP fallback when Redis is unavailable)
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '600', 10),

  // Push notifications
  pushProvider: process.env.PUSH_PROVIDER || 'off', // off | fcm | apns | onesignal
  fcmServerKey: process.env.FCM_SERVER_KEY || '',
  onesignalAppId: process.env.ONESIGNAL_APP_ID || '',
  onesignalRestKey: process.env.ONESIGNAL_REST_KEY || '',

  // Analytics
  analyticsProvider: process.env.ANALYTICS_PROVIDER || 'off', // off | posthog | mixpanel | amplitude
  posthogKey: process.env.POSTHOG_KEY || '',
  posthogHost: process.env.POSTHOG_HOST || '',
  mixpanelToken: process.env.MIXPANEL_TOKEN || '',
  amplitudeKey: process.env.AMPLITUDE_KEY || '',

  // Feature flags (enable/disable per environment)
  featureFlags: {
    talkNow: process.env.FEATURE_TALK_NOW !== 'false',
    videoCalls: process.env.FEATURE_VIDEO_CALLS !== 'false',
    newMatching: process.env.FEATURE_NEW_MATCHING === 'true',
    promotions: process.env.FEATURE_PROMOTIONS === 'true',
    gifts: process.env.FEATURE_GIFTS !== 'false',
    creatorFeatures: process.env.FEATURE_CREATOR_FEATURES !== 'false',
    subscriptions: process.env.FEATURE_SUBSCRIPTIONS !== 'false',
  },

  // OTP / Mail
  smtpHost: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  smtpPort: parseInt(process.env.SMTP_PORT || '2525', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  fromEmail: process.env.FROM_EMAIL || 'no-reply@vuzki.app',

  // OTP provider (Twilio, MSG91, etc.)
  otpProvider: process.env.OTP_PROVIDER || 'dev', // dev prints to console
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioServiceSid: process.env.TWILIO_SERVICE_SID || '',

  // Google / Apple OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  appleClientId: process.env.APPLE_CLIENT_ID || '',
  appleTeamId: process.env.APPLE_TEAM_ID || '',
  appleKeyId: process.env.APPLE_KEY_ID || '',
  applePrivateKey: process.env.APPLE_PRIVATE_KEY || '',

  // Payments
  paymentProvider: process.env.PAYMENT_PROVIDER || 'demo', // demo | razorpay | phonepe | cashfree | stripe
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  cashfreeClientId: process.env.CASHFREE_CLIENT_ID || '',
  cashfreeClientSecret: process.env.CASHFREE_CLIENT_SECRET || '',
  // Shared secret used to authenticate provider webhooks (or a signing key for
  // providers that post an API key). Required for non-demo webhook fulfillment.
  webhookSecret: process.env.WEBHOOK_SECRET || '',

  
  // PhonePe
  phonepeMerchantId: process.env.PHONEPE_MERCHANT_ID || '',
  phonepeClientId: process.env.PHONEPE_CLIENT_ID || '',
  phonepeClientSecret: process.env.PHONEPE_CLIENT_SECRET || '',
  phonepeSaltKey: process.env.PHONEPE_SALT_KEY || '',
  phonepeSaltIndex: process.env.PHONEPE_SALT_INDEX || '',
// RTC / Calls
  rtcProvider: process.env.RTC_PROVIDER || 'webrtc', // webrtc | twilio | agora | livekit
  twilioApiKey: process.env.TWILIO_API_KEY || '',
  twilioApiSecret: process.env.TWILIO_API_SECRET || '',
  agoraAppId: process.env.AGORA_APP_ID || '',
  agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  livekitUrl: process.env.LIVEKIT_URL || '',
  livekitApiKey: process.env.LIVEKIT_API_KEY || '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || '',

  // Storage
  storageProvider: process.env.STORAGE_PROVIDER || 'local', // local | s3
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.S3_REGION || '',
  s3AccessKey: process.env.S3_ACCESS_KEY || '',
  s3SecretKey: process.env.S3_SECRET_KEY || '',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',

  // Redis
  redisUrl: process.env.REDIS_URL || '',

  // AI moderation provider
  aiProvider: process.env.AI_PROVIDER || 'off', // off | openai | local
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  aiModerationModel: process.env.AI_MODERATION_MODEL || 'openai:moderation-latest',
  aiModerationVersion: process.env.AI_MODERATION_VERSION || 'v1',
  imageModerationEnabled: process.env.IMAGE_MODERATION_ENABLED === 'true',
  imageModerationProvider: process.env.IMAGE_MODERATION_PROVIDER || 'off', // off | openai | local
  safetyRiskEnabled: process.env.SAFETY_RISK_ENABLED !== 'false',
  fraudDetectionEnabled: process.env.FRAUD_DETECTION_ENABLED !== 'false',
  botDetectionEnabled: process.env.BOT_DETECTION_ENABLED !== 'false',
  retentionEnabled: process.env.RETENTION_ENABLED === 'true',

  // Currency
  currency: process.env.CURRENCY || 'INR',
  demoMode: process.env.DEMO_MODE === 'true',
};

export type AppConfig = typeof config;
