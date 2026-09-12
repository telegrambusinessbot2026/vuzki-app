export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum UserRole {
  USER = 'USER',
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum VerificationStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  REVIEW = 'REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum OnboardingStep {
  NONE = 'NONE',
  INTERESTS = 'INTERESTS',
  LANGUAGES = 'LANGUAGES',
  PROFILE = 'PROFILE',
  COMPLETE = 'COMPLETE',
}

export enum PremiumTier {
  FREE = 'FREE',
  PLUS = 'PLUS',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAST_DUE = 'PAST_DUE',
  GRACE = 'GRACE',
  UNPAID = 'UNPAID',
}

export enum SubscriptionCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum CoinPackageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum WalletTransactionType {
  PURCHASE = 'PURCHASE',
  AUDIO_CALL = 'AUDIO_CALL',
  VIDEO_CALL = 'VIDEO_CALL',
  GIFT_SENT = 'GIFT_SENT',
  GIFT_RECEIVED = 'GIFT_RECEIVED',
  SUPER_LIKE = 'SUPER_LIKE',
  SUPER_LIKE_PURCHASE = 'SUPER_LIKE_PURCHASE',
  BOOST = 'BOOST',
  REWARD = 'REWARD',
  REFERRAL = 'REFERRAL',
  PROMOTION = 'PROMOTION',
  EARNING = 'EARNING',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PROCESSING = 'PROCESSING',
  CANCELLED = 'CANCELLED',
}

export enum CallType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum CallStatus {
  RINGING = 'RINGING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  BUSY = 'BUSY',
}

export enum CallRole {
  CALLER = 'CALLER',
  RECEIVER = 'RECEIVER',
}

export enum GiftStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CreatorApplicationStatus {
  PENDING = 'PENDING',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVOKED = 'REVOKED',
}

export enum CreatorAvailabilityStatus {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  IN_CALL = 'IN_CALL',
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum WithdrawalMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  PAYPAL = 'PAYPAL',
  PAYPAL_CONTACT = 'PAYPAL_CONTACT',
}

export enum ReferralRewardStatus {
  PENDING = 'PENDING',
  ELIGIBLE = 'ELIGIBLE',
  PAID = 'PAID',
  REVOKED = 'REVOKED',
}

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  MATCH = 'MATCH',
  LIKE = 'LIKE',
  SUPER_LIKE = 'SUPER_LIKE',
  INCOMING_CALL = 'INCOMING_CALL',
  MISSED_CALL = 'MISSED_CALL',
  GIFT = 'GIFT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  COIN_PURCHASE = 'COIN_PURCHASE',
  CREATOR_CALL = 'CREATOR_CALL',
  WITHDRAWAL = 'WITHDRAWAL',
  PROMOTION = 'PROMOTION',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
}

export enum ReportCategory {
  HARASSMENT = 'HARASSMENT',
  SPAM = 'SPAM',
  SCAM = 'SCAM',
  FAKE_PROFILE = 'FAKE_PROFILE',
  INAPPROPRIATE = 'INAPPROPRIATE',
  THREATS = 'THREATS',
  FRAUD = 'FRAUD',
  HATE_ABUSE = 'HATE_ABUSE',
  OTHER = 'OTHER',
}

export enum ReportTargetType {
  USER = 'USER',
  PROFILE = 'PROFILE',
  MESSAGE = 'MESSAGE',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
  CALL = 'CALL',
  GIFT_INTERACTION = 'GIFT_INTERACTION',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
  ACTIONED = 'ACTIONED',
}

export enum ModerationActionType {
  WARN = 'WARN',
  MUTE = 'MUTE',
  RESTRICT = 'RESTRICT',
  SUSPEND = 'SUSPEND',
  BAN = 'BAN',
  DELETE_CONTENT = 'DELETE_CONTENT',
  VERIFY_USER = 'VERIFY_USER',
  UNVERIFY_USER = 'UNVERIFY_USER',
  UNBAN_USER = 'UNBAN_USER',
  RESTORE_USER = 'RESTORE_USER',
}

export enum ModerationActionSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  FINANCE_ADMIN = 'FINANCE_ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
}

export enum BoostType {
  THIRTY_MIN = 'THIRTY_MIN',
  ONE_HOUR = 'ONE_HOUR',
  THREE_HOUR = 'THREE_HOUR',
}

export enum BoostStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RewardStatus {
  CLAIMED = 'CLAIMED',
  UNCLAIMED = 'UNCLAIMED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentStatus {
  CREATED = 'CREATED',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentProvider {
  RAZORPAY = 'RAZORPAY',
  PHONEPE = 'PHONEPE',
  CASHFREE = 'CASHFREE',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  DEMO = 'DEMO',
}

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum MatchAction {
  LIKE = 'LIKE',
  PASS = 'PASS',
  SUPER_LIKE = 'SUPER_LIKE',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
  GIF = 'GIF',
  GIFT = 'GIFT',
  SYSTEM = 'SYSTEM',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export enum CallConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
}

// ============================================================
// SAFETY, MODERATION & ANTI-FRAUD ENUMS
// ============================================================

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ModerationCaseStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
  ESCALATED = 'ESCALATED',
}

export enum ModerationCasePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AppealStatus {
  SUBMITTED = 'SUBMITTED',
  REVIEWING = 'REVIEWING',
  UPHELD = 'UPHELD',
  REDUCED = 'REDUCED',
  REMOVED = 'REMOVED',
  REJECTED = 'REJECTED',
}

export enum RestrictionType {
  WARNING = 'WARNING',
  MUTE = 'MUTE',
  COMM_RESTRICTION = 'COMM_RESTRICTION',
  CALL_RESTRICTION = 'CALL_RESTRICTION',
  MATCH_RESTRICTION = 'MATCH_RESTRICTION',
  TEMP_SUSPENSION = 'TEMP_SUSPENSION',
  SUSPENSION = 'SUSPENSION',
  BAN = 'BAN',
}

export enum RestrictionScope {
  ALL = 'ALL',
  CHAT = 'CHAT',
  CALL = 'CALL',
  MATCH = 'MATCH',
  DISCOVERY = 'DISCOVERY',
  LIKES = 'LIKES',
  NOTIFICATIONS = 'NOTIFICATIONS',
}

export enum SecurityEventType {
  LOGIN = 'LOGIN',
  NEW_DEVICE = 'NEW_DEVICE',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  RECOVERY = 'RECOVERY',
  RESTRICTION = 'RESTRICTION',
  LOGOUT = 'LOGOUT',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',
}

export enum VerificationBadge {
  NONE = 'NONE',
  USER = 'USER',
  CREATOR = 'CREATOR',
}

export enum FraudEntityType {
  USER = 'USER',
  REFERRAL = 'REFERRAL',
  PAYMENT = 'PAYMENT',
  WITHDRAWAL = 'WITHDRAWAL',
  EARNING = 'EARNING',
  GIFT = 'GIFT',
}

export enum FraudFlagStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  CONFIRMED = 'CONFIRMED',
  DISMISSED = 'DISMISSED',
}

export enum FraudFlagSource {
  AI = 'AI',
  RULE = 'RULE',
  MANUAL = 'MANUAL',
}

export enum ContentFlagType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  VIDEO = 'VIDEO',
}

export enum ContentFlagStatus {
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REMOVED = 'REMOVED',
}

export enum AccountDeletionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ANONYMIZED = 'ANONYMIZED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum LocalPhoneVerificationStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}
