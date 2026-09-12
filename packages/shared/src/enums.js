"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentFlagStatus = exports.ContentFlagType = exports.FraudFlagSource = exports.FraudFlagStatus = exports.FraudEntityType = exports.VerificationBadge = exports.SecurityEventType = exports.RestrictionScope = exports.RestrictionType = exports.AppealStatus = exports.ModerationCasePriority = exports.ModerationCaseStatus = exports.RiskLevel = exports.CallConnectionStatus = exports.MessageStatus = exports.MessageType = exports.MatchAction = exports.KycStatus = exports.PaymentProvider = exports.PaymentStatus = exports.RewardStatus = exports.BoostStatus = exports.BoostType = exports.AdminRole = exports.ModerationActionSeverity = exports.ModerationActionType = exports.ReportStatus = exports.ReportTargetType = exports.ReportCategory = exports.NotificationType = exports.ReferralRewardStatus = exports.WithdrawalMethod = exports.WithdrawalStatus = exports.CreatorAvailabilityStatus = exports.CreatorApplicationStatus = exports.GiftStatus = exports.CallRole = exports.CallStatus = exports.CallType = exports.WalletTransactionStatus = exports.WalletTransactionType = exports.CoinPackageStatus = exports.SubscriptionCycle = exports.SubscriptionStatus = exports.PremiumTier = exports.OnboardingStep = exports.VerificationStatus = exports.AccountStatus = exports.UserRole = exports.Gender = void 0;
exports.LocalPhoneVerificationStatus = exports.AccountDeletionStatus = void 0;
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
    Gender["PREFER_NOT_TO_SAY"] = "PREFER_NOT_TO_SAY";
})(Gender || (exports.Gender = Gender = {}));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["CREATOR"] = "CREATOR";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["ACTIVE"] = "ACTIVE";
    AccountStatus["SUSPENDED"] = "SUSPENDED";
    AccountStatus["BANNED"] = "BANNED";
    AccountStatus["DELETED"] = "DELETED";
    AccountStatus["PENDING_VERIFICATION"] = "PENDING_VERIFICATION";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["NONE"] = "NONE";
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["REVIEW"] = "REVIEW";
    VerificationStatus["VERIFIED"] = "VERIFIED";
    VerificationStatus["REJECTED"] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var OnboardingStep;
(function (OnboardingStep) {
    OnboardingStep["NONE"] = "NONE";
    OnboardingStep["INTERESTS"] = "INTERESTS";
    OnboardingStep["LANGUAGES"] = "LANGUAGES";
    OnboardingStep["PROFILE"] = "PROFILE";
    OnboardingStep["COMPLETE"] = "COMPLETE";
})(OnboardingStep || (exports.OnboardingStep = OnboardingStep = {}));
var PremiumTier;
(function (PremiumTier) {
    PremiumTier["FREE"] = "FREE";
    PremiumTier["PLUS"] = "PLUS";
    PremiumTier["PREMIUM"] = "PREMIUM";
    PremiumTier["VIP"] = "VIP";
})(PremiumTier || (exports.PremiumTier = PremiumTier = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["CANCELLED"] = "CANCELLED";
    SubscriptionStatus["EXPIRED"] = "EXPIRED";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["GRACE"] = "GRACE";
    SubscriptionStatus["UNPAID"] = "UNPAID";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var SubscriptionCycle;
(function (SubscriptionCycle) {
    SubscriptionCycle["MONTHLY"] = "MONTHLY";
    SubscriptionCycle["YEARLY"] = "YEARLY";
})(SubscriptionCycle || (exports.SubscriptionCycle = SubscriptionCycle = {}));
var CoinPackageStatus;
(function (CoinPackageStatus) {
    CoinPackageStatus["ACTIVE"] = "ACTIVE";
    CoinPackageStatus["INACTIVE"] = "INACTIVE";
})(CoinPackageStatus || (exports.CoinPackageStatus = CoinPackageStatus = {}));
var WalletTransactionType;
(function (WalletTransactionType) {
    WalletTransactionType["PURCHASE"] = "PURCHASE";
    WalletTransactionType["AUDIO_CALL"] = "AUDIO_CALL";
    WalletTransactionType["VIDEO_CALL"] = "VIDEO_CALL";
    WalletTransactionType["GIFT_SENT"] = "GIFT_SENT";
    WalletTransactionType["GIFT_RECEIVED"] = "GIFT_RECEIVED";
    WalletTransactionType["SUPER_LIKE"] = "SUPER_LIKE";
    WalletTransactionType["SUPER_LIKE_PURCHASE"] = "SUPER_LIKE_PURCHASE";
    WalletTransactionType["BOOST"] = "BOOST";
    WalletTransactionType["REWARD"] = "REWARD";
    WalletTransactionType["REFERRAL"] = "REFERRAL";
    WalletTransactionType["PROMOTION"] = "PROMOTION";
    WalletTransactionType["EARNING"] = "EARNING";
    WalletTransactionType["WITHDRAWAL"] = "WITHDRAWAL";
    WalletTransactionType["REFUND"] = "REFUND";
    WalletTransactionType["ADJUSTMENT"] = "ADJUSTMENT";
})(WalletTransactionType || (exports.WalletTransactionType = WalletTransactionType = {}));
var WalletTransactionStatus;
(function (WalletTransactionStatus) {
    WalletTransactionStatus["PENDING"] = "PENDING";
    WalletTransactionStatus["COMPLETED"] = "COMPLETED";
    WalletTransactionStatus["FAILED"] = "FAILED";
    WalletTransactionStatus["PROCESSING"] = "PROCESSING";
    WalletTransactionStatus["CANCELLED"] = "CANCELLED";
})(WalletTransactionStatus || (exports.WalletTransactionStatus = WalletTransactionStatus = {}));
var CallType;
(function (CallType) {
    CallType["AUDIO"] = "AUDIO";
    CallType["VIDEO"] = "VIDEO";
})(CallType || (exports.CallType = CallType = {}));
var CallStatus;
(function (CallStatus) {
    CallStatus["RINGING"] = "RINGING";
    CallStatus["ONGOING"] = "ONGOING";
    CallStatus["COMPLETED"] = "COMPLETED";
    CallStatus["MISSED"] = "MISSED";
    CallStatus["REJECTED"] = "REJECTED";
    CallStatus["CANCELLED"] = "CANCELLED";
    CallStatus["FAILED"] = "FAILED";
    CallStatus["BUSY"] = "BUSY";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
var CallRole;
(function (CallRole) {
    CallRole["CALLER"] = "CALLER";
    CallRole["RECEIVER"] = "RECEIVER";
})(CallRole || (exports.CallRole = CallRole = {}));
var GiftStatus;
(function (GiftStatus) {
    GiftStatus["ACTIVE"] = "ACTIVE";
    GiftStatus["INACTIVE"] = "INACTIVE";
})(GiftStatus || (exports.GiftStatus = GiftStatus = {}));
var CreatorApplicationStatus;
(function (CreatorApplicationStatus) {
    CreatorApplicationStatus["PENDING"] = "PENDING";
    CreatorApplicationStatus["REVIEW"] = "REVIEW";
    CreatorApplicationStatus["APPROVED"] = "APPROVED";
    CreatorApplicationStatus["REJECTED"] = "REJECTED";
    CreatorApplicationStatus["REVOKED"] = "REVOKED";
})(CreatorApplicationStatus || (exports.CreatorApplicationStatus = CreatorApplicationStatus = {}));
var CreatorAvailabilityStatus;
(function (CreatorAvailabilityStatus) {
    CreatorAvailabilityStatus["OFFLINE"] = "OFFLINE";
    CreatorAvailabilityStatus["AVAILABLE"] = "AVAILABLE";
    CreatorAvailabilityStatus["BUSY"] = "BUSY";
    CreatorAvailabilityStatus["IN_CALL"] = "IN_CALL";
})(CreatorAvailabilityStatus || (exports.CreatorAvailabilityStatus = CreatorAvailabilityStatus = {}));
var WithdrawalStatus;
(function (WithdrawalStatus) {
    WithdrawalStatus["PENDING"] = "PENDING";
    WithdrawalStatus["PROCESSING"] = "PROCESSING";
    WithdrawalStatus["COMPLETED"] = "COMPLETED";
    WithdrawalStatus["FAILED"] = "FAILED";
    WithdrawalStatus["REJECTED"] = "REJECTED";
})(WithdrawalStatus || (exports.WithdrawalStatus = WithdrawalStatus = {}));
var WithdrawalMethod;
(function (WithdrawalMethod) {
    WithdrawalMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    WithdrawalMethod["UPI"] = "UPI";
    WithdrawalMethod["PAYPAL"] = "PAYPAL";
    WithdrawalMethod["PAYPAL_CONTACT"] = "PAYPAL_CONTACT";
})(WithdrawalMethod || (exports.WithdrawalMethod = WithdrawalMethod = {}));
var ReferralRewardStatus;
(function (ReferralRewardStatus) {
    ReferralRewardStatus["PENDING"] = "PENDING";
    ReferralRewardStatus["ELIGIBLE"] = "ELIGIBLE";
    ReferralRewardStatus["PAID"] = "PAID";
    ReferralRewardStatus["REVOKED"] = "REVOKED";
})(ReferralRewardStatus || (exports.ReferralRewardStatus = ReferralRewardStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["MESSAGE"] = "MESSAGE";
    NotificationType["MATCH"] = "MATCH";
    NotificationType["LIKE"] = "LIKE";
    NotificationType["SUPER_LIKE"] = "SUPER_LIKE";
    NotificationType["INCOMING_CALL"] = "INCOMING_CALL";
    NotificationType["MISSED_CALL"] = "MISSED_CALL";
    NotificationType["GIFT"] = "GIFT";
    NotificationType["SUBSCRIPTION"] = "SUBSCRIPTION";
    NotificationType["COIN_PURCHASE"] = "COIN_PURCHASE";
    NotificationType["CREATOR_CALL"] = "CREATOR_CALL";
    NotificationType["WITHDRAWAL"] = "WITHDRAWAL";
    NotificationType["PROMOTION"] = "PROMOTION";
    NotificationType["SECURITY"] = "SECURITY";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var ReportCategory;
(function (ReportCategory) {
    ReportCategory["HARASSMENT"] = "HARASSMENT";
    ReportCategory["SPAM"] = "SPAM";
    ReportCategory["SCAM"] = "SCAM";
    ReportCategory["FAKE_PROFILE"] = "FAKE_PROFILE";
    ReportCategory["INAPPROPRIATE"] = "INAPPROPRIATE";
    ReportCategory["THREATS"] = "THREATS";
    ReportCategory["FRAUD"] = "FRAUD";
    ReportCategory["HATE_ABUSE"] = "HATE_ABUSE";
    ReportCategory["OTHER"] = "OTHER";
})(ReportCategory || (exports.ReportCategory = ReportCategory = {}));
var ReportTargetType;
(function (ReportTargetType) {
    ReportTargetType["USER"] = "USER";
    ReportTargetType["PROFILE"] = "PROFILE";
    ReportTargetType["MESSAGE"] = "MESSAGE";
    ReportTargetType["IMAGE"] = "IMAGE";
    ReportTargetType["VOICE"] = "VOICE";
    ReportTargetType["CALL"] = "CALL";
    ReportTargetType["GIFT_INTERACTION"] = "GIFT_INTERACTION";
})(ReportTargetType || (exports.ReportTargetType = ReportTargetType = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "PENDING";
    ReportStatus["REVIEWING"] = "REVIEWING";
    ReportStatus["RESOLVED"] = "RESOLVED";
    ReportStatus["DISMISSED"] = "DISMISSED";
    ReportStatus["ACTIONED"] = "ACTIONED";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var ModerationActionType;
(function (ModerationActionType) {
    ModerationActionType["WARN"] = "WARN";
    ModerationActionType["MUTE"] = "MUTE";
    ModerationActionType["RESTRICT"] = "RESTRICT";
    ModerationActionType["SUSPEND"] = "SUSPEND";
    ModerationActionType["BAN"] = "BAN";
    ModerationActionType["DELETE_CONTENT"] = "DELETE_CONTENT";
    ModerationActionType["VERIFY_USER"] = "VERIFY_USER";
    ModerationActionType["UNVERIFY_USER"] = "UNVERIFY_USER";
    ModerationActionType["UNBAN_USER"] = "UNBAN_USER";
    ModerationActionType["RESTORE_USER"] = "RESTORE_USER";
})(ModerationActionType || (exports.ModerationActionType = ModerationActionType = {}));
var ModerationActionSeverity;
(function (ModerationActionSeverity) {
    ModerationActionSeverity["LOW"] = "LOW";
    ModerationActionSeverity["MEDIUM"] = "MEDIUM";
    ModerationActionSeverity["HIGH"] = "HIGH";
    ModerationActionSeverity["CRITICAL"] = "CRITICAL";
})(ModerationActionSeverity || (exports.ModerationActionSeverity = ModerationActionSeverity = {}));
var AdminRole;
(function (AdminRole) {
    AdminRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    AdminRole["ADMIN"] = "ADMIN";
    AdminRole["MODERATOR"] = "MODERATOR";
    AdminRole["FINANCE_ADMIN"] = "FINANCE_ADMIN";
    AdminRole["SUPPORT_AGENT"] = "SUPPORT_AGENT";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
var BoostType;
(function (BoostType) {
    BoostType["THIRTY_MIN"] = "THIRTY_MIN";
    BoostType["ONE_HOUR"] = "ONE_HOUR";
    BoostType["THREE_HOUR"] = "THREE_HOUR";
})(BoostType || (exports.BoostType = BoostType = {}));
var BoostStatus;
(function (BoostStatus) {
    BoostStatus["ACTIVE"] = "ACTIVE";
    BoostStatus["COMPLETED"] = "COMPLETED";
    BoostStatus["CANCELLED"] = "CANCELLED";
})(BoostStatus || (exports.BoostStatus = BoostStatus = {}));
var RewardStatus;
(function (RewardStatus) {
    RewardStatus["CLAIMED"] = "CLAIMED";
    RewardStatus["UNCLAIMED"] = "UNCLAIMED";
    RewardStatus["EXPIRED"] = "EXPIRED";
})(RewardStatus || (exports.RewardStatus = RewardStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["CREATED"] = "CREATED";
    PaymentStatus["AUTHORIZED"] = "AUTHORIZED";
    PaymentStatus["CAPTURED"] = "CAPTURED";
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["PARTIALLY_REFUNDED"] = "PARTIALLY_REFUNDED";
    PaymentStatus["CANCELLED"] = "CANCELLED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["RAZORPAY"] = "RAZORPAY";
    PaymentProvider["CASHFREE"] = "CASHFREE";
    PaymentProvider["STRIPE"] = "STRIPE";
    PaymentProvider["PAYPAL"] = "PAYPAL";
    PaymentProvider["DEMO"] = "DEMO";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
var KycStatus;
(function (KycStatus) {
    KycStatus["NOT_SUBMITTED"] = "NOT_SUBMITTED";
    KycStatus["PENDING"] = "PENDING";
    KycStatus["VERIFIED"] = "VERIFIED";
    KycStatus["REJECTED"] = "REJECTED";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
var MatchAction;
(function (MatchAction) {
    MatchAction["LIKE"] = "LIKE";
    MatchAction["PASS"] = "PASS";
    MatchAction["SUPER_LIKE"] = "SUPER_LIKE";
})(MatchAction || (exports.MatchAction = MatchAction = {}));
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["VOICE"] = "VOICE";
    MessageType["GIF"] = "GIF";
    MessageType["GIFT"] = "GIFT";
    MessageType["SYSTEM"] = "SYSTEM";
})(MessageType || (exports.MessageType = MessageType = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["SENT"] = "SENT";
    MessageStatus["DELIVERED"] = "DELIVERED";
    MessageStatus["READ"] = "READ";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
var CallConnectionStatus;
(function (CallConnectionStatus) {
    CallConnectionStatus["CONNECTING"] = "CONNECTING";
    CallConnectionStatus["CONNECTED"] = "CONNECTED";
    CallConnectionStatus["DISCONNECTED"] = "DISCONNECTED";
    CallConnectionStatus["RECONNECTING"] = "RECONNECTING";
})(CallConnectionStatus || (exports.CallConnectionStatus = CallConnectionStatus = {}));
// ============================================================
// SAFETY, MODERATION & ANTI-FRAUD ENUMS
// ============================================================
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MEDIUM"] = "MEDIUM";
    RiskLevel["HIGH"] = "HIGH";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var ModerationCaseStatus;
(function (ModerationCaseStatus) {
    ModerationCaseStatus["OPEN"] = "OPEN";
    ModerationCaseStatus["IN_REVIEW"] = "IN_REVIEW";
    ModerationCaseStatus["RESOLVED"] = "RESOLVED";
    ModerationCaseStatus["DISMISSED"] = "DISMISSED";
    ModerationCaseStatus["ESCALATED"] = "ESCALATED";
})(ModerationCaseStatus || (exports.ModerationCaseStatus = ModerationCaseStatus = {}));
var ModerationCasePriority;
(function (ModerationCasePriority) {
    ModerationCasePriority["LOW"] = "LOW";
    ModerationCasePriority["NORMAL"] = "NORMAL";
    ModerationCasePriority["HIGH"] = "HIGH";
    ModerationCasePriority["URGENT"] = "URGENT";
})(ModerationCasePriority || (exports.ModerationCasePriority = ModerationCasePriority = {}));
var AppealStatus;
(function (AppealStatus) {
    AppealStatus["SUBMITTED"] = "SUBMITTED";
    AppealStatus["REVIEWING"] = "REVIEWING";
    AppealStatus["UPHELD"] = "UPHELD";
    AppealStatus["REDUCED"] = "REDUCED";
    AppealStatus["REMOVED"] = "REMOVED";
    AppealStatus["REJECTED"] = "REJECTED";
})(AppealStatus || (exports.AppealStatus = AppealStatus = {}));
var RestrictionType;
(function (RestrictionType) {
    RestrictionType["WARNING"] = "WARNING";
    RestrictionType["MUTE"] = "MUTE";
    RestrictionType["COMM_RESTRICTION"] = "COMM_RESTRICTION";
    RestrictionType["CALL_RESTRICTION"] = "CALL_RESTRICTION";
    RestrictionType["MATCH_RESTRICTION"] = "MATCH_RESTRICTION";
    RestrictionType["TEMP_SUSPENSION"] = "TEMP_SUSPENSION";
    RestrictionType["SUSPENSION"] = "SUSPENSION";
    RestrictionType["BAN"] = "BAN";
})(RestrictionType || (exports.RestrictionType = RestrictionType = {}));
var RestrictionScope;
(function (RestrictionScope) {
    RestrictionScope["ALL"] = "ALL";
    RestrictionScope["CHAT"] = "CHAT";
    RestrictionScope["CALL"] = "CALL";
    RestrictionScope["MATCH"] = "MATCH";
    RestrictionScope["DISCOVERY"] = "DISCOVERY";
    RestrictionScope["LIKES"] = "LIKES";
    RestrictionScope["NOTIFICATIONS"] = "NOTIFICATIONS";
})(RestrictionScope || (exports.RestrictionScope = RestrictionScope = {}));
var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["LOGIN"] = "LOGIN";
    SecurityEventType["NEW_DEVICE"] = "NEW_DEVICE";
    SecurityEventType["SUSPICIOUS_LOGIN"] = "SUSPICIOUS_LOGIN";
    SecurityEventType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    SecurityEventType["RECOVERY"] = "RECOVERY";
    SecurityEventType["RESTRICTION"] = "RESTRICTION";
    SecurityEventType["LOGOUT"] = "LOGOUT";
    SecurityEventType["ALL_SESSIONS_REVOKED"] = "ALL_SESSIONS_REVOKED";
})(SecurityEventType || (exports.SecurityEventType = SecurityEventType = {}));
var VerificationBadge;
(function (VerificationBadge) {
    VerificationBadge["NONE"] = "NONE";
    VerificationBadge["USER"] = "USER";
    VerificationBadge["CREATOR"] = "CREATOR";
})(VerificationBadge || (exports.VerificationBadge = VerificationBadge = {}));
var FraudEntityType;
(function (FraudEntityType) {
    FraudEntityType["USER"] = "USER";
    FraudEntityType["REFERRAL"] = "REFERRAL";
    FraudEntityType["PAYMENT"] = "PAYMENT";
    FraudEntityType["WITHDRAWAL"] = "WITHDRAWAL";
    FraudEntityType["EARNING"] = "EARNING";
    FraudEntityType["GIFT"] = "GIFT";
})(FraudEntityType || (exports.FraudEntityType = FraudEntityType = {}));
var FraudFlagStatus;
(function (FraudFlagStatus) {
    FraudFlagStatus["OPEN"] = "OPEN";
    FraudFlagStatus["INVESTIGATING"] = "INVESTIGATING";
    FraudFlagStatus["CONFIRMED"] = "CONFIRMED";
    FraudFlagStatus["DISMISSED"] = "DISMISSED";
})(FraudFlagStatus || (exports.FraudFlagStatus = FraudFlagStatus = {}));
var FraudFlagSource;
(function (FraudFlagSource) {
    FraudFlagSource["AI"] = "AI";
    FraudFlagSource["RULE"] = "RULE";
    FraudFlagSource["MANUAL"] = "MANUAL";
})(FraudFlagSource || (exports.FraudFlagSource = FraudFlagSource = {}));
var ContentFlagType;
(function (ContentFlagType) {
    ContentFlagType["IMAGE"] = "IMAGE";
    ContentFlagType["TEXT"] = "TEXT";
    ContentFlagType["VOICE"] = "VOICE";
    ContentFlagType["VIDEO"] = "VIDEO";
})(ContentFlagType || (exports.ContentFlagType = ContentFlagType = {}));
var ContentFlagStatus;
(function (ContentFlagStatus) {
    ContentFlagStatus["REVIEW"] = "REVIEW";
    ContentFlagStatus["APPROVED"] = "APPROVED";
    ContentFlagStatus["REJECTED"] = "REJECTED";
    ContentFlagStatus["REMOVED"] = "REMOVED";
})(ContentFlagStatus || (exports.ContentFlagStatus = ContentFlagStatus = {}));
var AccountDeletionStatus;
(function (AccountDeletionStatus) {
    AccountDeletionStatus["PENDING"] = "PENDING";
    AccountDeletionStatus["PROCESSING"] = "PROCESSING";
    AccountDeletionStatus["ANONYMIZED"] = "ANONYMIZED";
    AccountDeletionStatus["COMPLETED"] = "COMPLETED";
    AccountDeletionStatus["FAILED"] = "FAILED";
})(AccountDeletionStatus || (exports.AccountDeletionStatus = AccountDeletionStatus = {}));
var LocalPhoneVerificationStatus;
(function (LocalPhoneVerificationStatus) {
    LocalPhoneVerificationStatus["NOT_SUBMITTED"] = "NOT_SUBMITTED";
    LocalPhoneVerificationStatus["PENDING"] = "PENDING";
    LocalPhoneVerificationStatus["VERIFIED"] = "VERIFIED";
    LocalPhoneVerificationStatus["REJECTED"] = "REJECTED";
})(LocalPhoneVerificationStatus || (exports.LocalPhoneVerificationStatus = LocalPhoneVerificationStatus = {}));
