"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETENTION_DAYS = exports.VERIFICATION_EVIDENCE_MAX = exports.VERIFIED_CREATOR_MIN_KYC = exports.RATE_LIMIT_CALLS_PER_MIN = exports.RATE_LIMIT_GIFTS_PER_MIN = exports.RATE_LIMIT_SUPER_LIKES = exports.RATE_LIMIT_LIKES = exports.BOT = exports.OFFENDER_ESCALATION = exports.REPORTS_TO_AUTO_SUSPEND = exports.REPORTS_TO_AUTO_RESTRICT = exports.REPORTS_TO_REVIEW = exports.REPORTS_TO_INVESTIGATE = exports.RISK = exports.SUPPORT_EMAIL = exports.WHATSAPP_SUPPORT = exports.DEFAULT_INTERESTS = exports.SUPPORTED_LANGUAGES = exports.DEFAULT_RATE_LIMIT = exports.TOXICITY_THRESHOLD = exports.COIN_TO_CURRENCY_RATE = exports.STREAK_BONUS_COINS = exports.DAILY_LOGIN_REWARD_COINS = exports.REFERRAL_REWARD_COINS = exports.MAX_REFERRAL_REWARDS = exports.MIN_WITHDRAWAL_AMOUNT = exports.GIFT_CREATOR_SHARE = exports.VIDEO_CALL_CREATOR_SHARE = exports.AUDIO_CALL_CREATOR_SHARE = exports.PLATFORM_REVENUE_SHARE = exports.CALL_COINS_PER_MINUTE_VIDEO = exports.CALL_COINS_PER_MINUTE_AUDIO = exports.MAX_DISPLAY_NAME_LENGTH = exports.MAX_BIO_LENGTH = exports.MAX_MESSAGE_LENGTH = exports.DISCOVERY_MAX_LIMIT = exports.DISCOVERY_DEFAULT_LIMIT = exports.OTP_MAX_ATTEMPTS = exports.OTP_RESEND_SECONDS = exports.OTP_EXPIRY_MINUTES = exports.MAX_AGE = exports.MIN_AGE = exports.APP_VERSION = exports.APP_TAGLINE = exports.APP_NAME = void 0;
exports.APP_NAME = 'VUZKI';
exports.APP_TAGLINE = 'Meet • Talk • Connect';
exports.APP_VERSION = '1.0.0';
exports.MIN_AGE = 18;
exports.MAX_AGE = 99;
exports.OTP_EXPIRY_MINUTES = 10;
exports.OTP_RESEND_SECONDS = 60;
exports.OTP_MAX_ATTEMPTS = 5;
exports.DISCOVERY_DEFAULT_LIMIT = 20;
exports.DISCOVERY_MAX_LIMIT = 50;
exports.MAX_MESSAGE_LENGTH = 4000;
exports.MAX_BIO_LENGTH = 300;
exports.MAX_DISPLAY_NAME_LENGTH = 40;
exports.CALL_COINS_PER_MINUTE_AUDIO = 20;
exports.CALL_COINS_PER_MINUTE_VIDEO = 50;
// Creator revenue split (platform takes a percentage)
exports.PLATFORM_REVENUE_SHARE = 0.2; // 20% platform, 80% creator
exports.AUDIO_CALL_CREATOR_SHARE = 0.8;
exports.VIDEO_CALL_CREATOR_SHARE = 0.7;
exports.GIFT_CREATOR_SHARE = 0.7;
exports.MIN_WITHDRAWAL_AMOUNT = 100; // in rupees or base currency
exports.MAX_REFERRAL_REWARDS = 100;
exports.REFERRAL_REWARD_COINS = 50;
exports.DAILY_LOGIN_REWARD_COINS = 5;
exports.STREAK_BONUS_COINS = 10;
exports.COIN_TO_CURRENCY_RATE = 1; // 1 coin configurable
// AI moderation thresholds
exports.TOXICITY_THRESHOLD = 0.75;
exports.DEFAULT_RATE_LIMIT = {
    signup: { windowMs: 15 * 60 * 1000, max: 5 },
    otp: { windowMs: 15 * 60 * 1000, max: 8 },
    login: { windowMs: 15 * 60 * 1000, max: 10 },
    api: { windowMs: 60 * 1000, max: 120 },
    chat: { windowMs: 60 * 1000, max: 300 },
    gift: { windowMs: 60 * 1000, max: 30 },
};
exports.SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'kn', name: 'Kannada' },
    { code: 'bn', name: 'Bengali' },
];
exports.DEFAULT_INTERESTS = [
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
exports.WHATSAPP_SUPPORT = '+910000000000';
exports.SUPPORT_EMAIL = 'support@vuzki.app';
// ============================================================
// SAFETY & MODERATION CONSTANTS
// ============================================================
// Risk engine thresholds
exports.RISK = {
    // cumulative signal points that push a user to the next risk tier
    LOW_MAX: 30,
    MEDIUM_MAX: 70,
    // per-signal contribution caps (prevents a single signal from dominating)
    MAX_SIGNAL_WEIGHT: 25,
};
// Report -> case auto-action thresholds based on distinct reporters
exports.REPORTS_TO_INVESTIGATE = 1; // any report creates/attaches a case
exports.REPORTS_TO_REVIEW = 3; // distinct reports => require human review
exports.REPORTS_TO_AUTO_RESTRICT = 5; // distinct repeat reports => auto temp restriction (chat/call)
exports.REPORTS_TO_AUTO_SUSPEND = 8;
// Repeat-offender escalation
exports.OFFENDER_ESCALATION = [
    { violations: 1, action: 'WARNING' },
    { violations: 2, action: 'TEMPORARY_RESTRICTION' },
    { violations: 3, action: 'SUSPENSION' },
];
// Bot / automation thresholds
exports.BOT = {
    MAX_MESSAGES_PER_10S: 15, // speed of repetitive identical messages
    MAX_SIGNUP_IP: 5, // max accounts per IP per window before flag
    MIN_PROFILE_COMPLETE_MS: 45_000, // faster profile completion => suspicious
    IDENTICAL_MESSAGE_COUNT: 5,
};
// Rate limit scopes reused across the safety layer
exports.RATE_LIMIT_LIKES = 50;
exports.RATE_LIMIT_SUPER_LIKES = 5;
exports.RATE_LIMIT_GIFTS_PER_MIN = 20;
exports.RATE_LIMIT_CALLS_PER_MIN = 10;
// Verification
exports.VERIFIED_CREATOR_MIN_KYC = 'VERIFIED'; // KYC must be verified for creator badge
exports.VERIFICATION_EVIDENCE_MAX = 5;
// Data retention defaults (days). Zero/negative => keep (legal/financial hold).
exports.RETENTION_DAYS = {
    message: 0, // core chat data — keep unless deletion requested
    report: 365,
    moderation: 730,
    payment: 0, // financial records retained per legal requirement
    auditLog: 730,
    safetySignal: 365,
};
