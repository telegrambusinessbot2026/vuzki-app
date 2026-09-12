export const APP_NAME = 'VUZKI';
export const APP_TAGLINE = 'Meet • Talk • Connect';
export const APP_VERSION = '1.0.0';

export const MIN_AGE = 18;
export const MAX_AGE = 99;

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

export const DISCOVERY_DEFAULT_LIMIT = 20;
export const DISCOVERY_MAX_LIMIT = 50;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_BIO_LENGTH = 300;
export const MAX_DISPLAY_NAME_LENGTH = 40;

export const CALL_COINS_PER_MINUTE_AUDIO = 20;
export const CALL_COINS_PER_MINUTE_VIDEO = 50;

// Creator revenue split (platform takes a percentage)
export const PLATFORM_REVENUE_SHARE = 0.2; // 20% platform, 80% creator
export const AUDIO_CALL_CREATOR_SHARE = 0.8;
export const VIDEO_CALL_CREATOR_SHARE = 0.7;
export const GIFT_CREATOR_SHARE = 0.7;

export const MIN_WITHDRAWAL_AMOUNT = 100; // in rupees or base currency
export const MAX_REFERRAL_REWARDS = 100;
export const REFERRAL_REWARD_COINS = 50;
export const DAILY_LOGIN_REWARD_COINS = 5;
export const STREAK_BONUS_COINS = 10;

export const COIN_TO_CURRENCY_RATE = 1; // 1 coin configurable

// AI moderation thresholds
export const TOXICITY_THRESHOLD = 0.75;
export const DEFAULT_RATE_LIMIT = {
  signup: { windowMs: 15 * 60 * 1000, max: 5 },
  otp: { windowMs: 15 * 60 * 1000, max: 8 },
  login: { windowMs: 15 * 60 * 1000, max: 10 },
  api: { windowMs: 60 * 1000, max: 120 },
  chat: { windowMs: 60 * 1000, max: 300 },
  gift: { windowMs: 60 * 1000, max: 30 },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'bn', name: 'Bengali' },
];

export const DEFAULT_INTERESTS = [
  'Music',
  'Movies',
  'Travel',
  'Fitness',
  'Food',
  'Gaming',
  'Photography',
  'Reading',
  'Cricket',
  'Football',
  'Technology',
  'Fashion',
  'Art',
  'Dance',
  'Yoga',
  'Business',
  'Education',
  'Trading',
  'Comedy',
  'Spirituality',
];

export const WHATSAPP_SUPPORT = '+910000000000';
export const SUPPORT_EMAIL = 'support@vuzki.app';

// ============================================================
// SAFETY & MODERATION CONSTANTS
// ============================================================

// Risk engine thresholds
export const RISK = {
  // cumulative signal points that push a user to the next risk tier
  LOW_MAX: 30,
  MEDIUM_MAX: 70,
  // per-signal contribution caps (prevents a single signal from dominating)
  MAX_SIGNAL_WEIGHT: 25,
};

// Report -> case auto-action thresholds based on distinct reporters
export const REPORTS_TO_INVESTIGATE = 1; // any report creates/attaches a case
export const REPORTS_TO_REVIEW = 3; // distinct reports => require human review
export const REPORTS_TO_AUTO_RESTRICT = 5; // distinct repeat reports => auto temp restriction (chat/call)
export const REPORTS_TO_AUTO_SUSPEND = 8;

// Repeat-offender escalation
export const OFFENDER_ESCALATION = [
  { violations: 1, action: 'WARNING' },
  { violations: 2, action: 'TEMPORARY_RESTRICTION' },
  { violations: 3, action: 'SUSPENSION' },
];

// Bot / automation thresholds
export const BOT = {
  MAX_MESSAGES_PER_10S: 15, // speed of repetitive identical messages
  MAX_SIGNUP_IP: 5, // max accounts per IP per window before flag
  MIN_PROFILE_COMPLETE_MS: 45_000, // faster profile completion => suspicious
  IDENTICAL_MESSAGE_COUNT: 5,
};

// Rate limit scopes reused across the safety layer
export const RATE_LIMIT_LIKES = 50;
export const RATE_LIMIT_SUPER_LIKES = 5;
export const RATE_LIMIT_GIFTS_PER_MIN = 20;
export const RATE_LIMIT_CALLS_PER_MIN = 10;

// Verification
export const VERIFIED_CREATOR_MIN_KYC = 'VERIFIED'; // KYC must be verified for creator badge
export const VERIFICATION_EVIDENCE_MAX = 5;

// Data retention defaults (days). Zero/negative => keep (legal/financial hold).
export const RETENTION_DAYS = {
  message: 0, // core chat data — keep unless deletion requested
  report: 365,
  moderation: 730,
  payment: 0, // financial records retained per legal requirement
  auditLog: 730,
  safetySignal: 365,
};
