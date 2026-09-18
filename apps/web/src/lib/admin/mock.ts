export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string | null;
  avatarUrl: string;
  gender: 'female' | 'male' | 'other';
  age: number;
  countryCode: string;
  isCreator: boolean;
  creatorStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | null;
  isPremium: boolean;
  premiumTier: string;
  isVerified: boolean;
  isBanned: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING';
  coinsBalance: number;
  totalCoinsEarned: number;
  totalSpent: number;
  totalEarnings: number;
  followers: number;
  profileViews: number;
  reportCount: number;
  createdAt: string;
  lastActive: string;
  kycStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AdminReport {
  id: string;
  reporter: { id: string; name: string };
  target: { id: string; name: string };
  reason: string;
  description: string;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  evidence: string[];
}

export interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  type: 'coin_purchase' | 'subscription' | 'gift';
  provider: 'demo' | 'razorpay' | 'stripe' | 'cashfree';
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  coins?: number;
  plan?: string;
  createdAt: string;
}

export interface AdminWithdrawal {
  id: string;
  userId: string;
  userName: string;
  method: 'upi' | 'bank' | 'paypal';
  detail: string;
  amount: number;
  fee: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  requestedAt: string;
  processedAt: string | null;
}

export interface AdminAuditLog {
  id: string;
  admin: string;
  action: string;
  target: string;
  category: string;
  ip: string;
  createdAt: string;
  meta: Record<string, unknown>;
}

const AV = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
];

const avatars = (i: number) => AV[i % AV.length];
const statuses: AdminUser['status'][] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING'];
const genders: AdminUser['gender'][] = ['female', 'male', 'female', 'male', 'female', 'male'];

export function makeUsers(n: number): AdminUser[] {
  const names = ['Ananya', 'Sofia', 'Liam', 'Priya', 'Diego', 'Zara', 'Ethan', 'Mia', 'Arjun', 'Nina', 'Leo', 'Aisha', 'Noah', 'Ivy', 'Omar'];
  const result: AdminUser[] = [];
  for (let i = 0; i < n; i++) {
    const name = names[i % names.length];
    const isCreator = i % 3 === 0;
    result.push({
      id: `usr_${String(i + 1).padStart(3, '0')}`,
      username: `${name.toLowerCase()}_${i + 1}`,
      displayName: name,
      email: `${name.toLowerCase()}${i}@example.com`,
      phone: i % 4 === 0 ? `+91 9${String(1000000000 + i)}`.slice(0, 13) : null,
      avatarUrl: avatars(i),
      gender: genders[i % 6],
      age: 19 + (i % 18),
      countryCode: ['IN', 'BR', 'CA', 'US', 'ES', 'AE'][i % 6],
      isCreator,
      creatorStatus: isCreator ? (['PENDING', 'ACTIVE', 'ACTIVE', 'REJECTED'] as AdminUser['creatorStatus'][])[i % 4] : null,
      isPremium: isCreator || i % 4 === 0,
      premiumTier: isCreator || i % 4 === 0 ? (['PREMIUM', 'PREMIUM', 'VIP', 'PLUS'][i % 4]) : 'FREE',
      isVerified: isCreator || i % 5 === 0,
      isBanned: statuses[i % 6] === 'BANNED',
      status: statuses[i % 6],
      coinsBalance: (i * 137) % 5000,
      totalCoinsEarned: isCreator ? (i * 2400) % 100000 : 0,
      totalSpent: (i * 900) % 50000,
      totalEarnings: isCreator ? (i * 1500) % 80000 : 0,
      followers: 100 + i * (isCreator ? 85 : 3),
      profileViews: 500 + i * (isCreator ? 400 : 30),
      reportCount: i % 5 === 0 ? (i % 4) : 0,
      createdAt: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      lastActive: `${i % 23}h ago`,
      kycStatus: isCreator ? (['PENDING', 'APPROVED', 'APPROVED', 'REJECTED', 'PENDING'] as AdminUser['kycStatus'][] )[i % 5] : 'NONE',
    });
  }
  return result;
}

export const adminUsers = makeUsers(45);

export const adminReports: AdminReport[] = [
  { id: 'rep_001', reporter: { id: 'u1', name: 'Sofia' }, target: { id: 'usr_002', name: 'Liam' }, reason: 'Inappropriate behaviour', description: 'Sent unsolicited explicit content during a voice call.', status: 'PENDING', severity: 'critical', createdAt: '2025-08-29 14:22', evidence: ['chat_9912', 'call_003'] },
  { id: 'rep_002', reporter: { id: 'u2', name: 'Diego' }, target: { id: 'usr_001', name: 'Ananya' }, reason: 'Spam', description: 'Repeated promotional messages.', status: 'REVIEWING', severity: 'medium', createdAt: '2025-08-29 11:05', evidence: ['chat_8810'] },
  { id: 'rep_003', reporter: { id: 'u3', name: 'Zara' }, target: { id: 'usr_003', name: 'Priya' }, reason: 'Scam / Fraud', description: 'Asked for payment outside the platform.', status: 'PENDING', severity: 'high', createdAt: '2025-08-28 22:41', evidence: ['chat_7733', 'payment_004'] },
  { id: 'rep_004', reporter: { id: 'u4', name: 'Ethan' }, target: { id: 'usr_004', name: 'Diego' }, reason: 'Hate speech', description: 'Racial slurs in a live room.', status: 'RESOLVED', severity: 'high', createdAt: '2025-08-28 09:15', evidence: ['live_1209'] },
  { id: 'rep_005', reporter: { id: 'u5', name: 'Mia' }, target: { id: 'usr_005', name: 'Zara' }, reason: 'Harassment', description: 'Repeated unwanted messages after being blocked.', status: 'DISMISSED', severity: 'low', createdAt: '2025-08-27 18:30', evidence: ['chat_6641'] },
  { id: 'rep_006', reporter: { id: 'u6', name: 'Arjun' }, target: { id: 'usr_010', name: 'Nina' }, reason: 'Fake profile', description: 'Using someone else’s photos.', status: 'PENDING', severity: 'medium', createdAt: '2025-08-30 08:03', evidence: ['profile_009'] },
];

export const adminPayments: AdminPayment[] = [
  { id: 'pay_1001', userId: 'usr_001', userName: 'Ananya', type: 'coin_purchase', provider: 'razorpay', amount: 10, currency: 'USD', status: 'success', coins: 900, createdAt: '2025-08-30 10:12' },
  { id: 'pay_1002', userId: 'usr_003', userName: 'Priya', type: 'subscription', provider: 'demo', amount: 9, currency: 'USD', status: 'success', plan: 'PREMIUM', createdAt: '2025-08-30 09:40' },
  { id: 'pay_1003', userId: 'usr_005', userName: 'Zara', type: 'gift', provider: 'demo', amount: 5, currency: 'USD', status: 'success', coins: 100, createdAt: '2025-08-30 08:55' },
  { id: 'pay_1004', userId: 'usr_002', userName: 'Liam', type: 'coin_purchase', provider: 'stripe', amount: 2, currency: 'USD', status: 'success', coins: 150, createdAt: '2025-08-30 07:20' },
  { id: 'pay_1005', userId: 'usr_006', userName: 'Ethan', type: 'subscription', provider: 'cashfree', amount: 19, currency: 'USD', status: 'success', plan: 'VIP', createdAt: '2025-08-29 21:10' },
  { id: 'pay_1006', userId: 'usr_008', userName: 'Mia', type: 'coin_purchase', provider: 'demo', amount: 5, currency: 'USD', status: 'pending', coins: 400, createdAt: '2025-08-29 19:44' },
  { id: 'pay_1007', userId: 'usr_009', userName: 'Arjun', type: 'gift', provider: 'demo', amount: 15, currency: 'USD', status: 'failed', createdAt: '2025-08-29 16:02' },
  { id: 'pay_1008', userId: 'usr_012', userName: 'Mia', type: 'coin_purchase', provider: 'razorpay', amount: 20, currency: 'USD', status: 'refunded', coins: 2000, createdAt: '2025-08-29 12:30' },
];

export const adminWithdrawals: AdminWithdrawal[] = [
  { id: 'wd_501', userId: 'usr_001', userName: 'Ananya', method: 'upi', detail: 'ananya@upi', amount: 500, fee: 25, status: 'PENDING', requestedAt: '2025-08-30 10:00', processedAt: null },
  { id: 'wd_502', userId: 'usr_003', userName: 'Priya', method: 'bank', detail: '•••• 4521 (ICICI)', amount: 1200, fee: 60, status: 'APPROVED', requestedAt: '2025-08-29 18:12', processedAt: null },
  { id: 'wd_503', userId: 'usr_005', userName: 'Zara', method: 'paypal', detail: 'zara@paypal.com', amount: 750, fee: 37, status: 'PAID', requestedAt: '2025-08-28 09:44', processedAt: '2025-08-29 09:44' },
  { id: 'wd_504', userId: 'usr_007', userName: 'Ethan', method: 'upi', detail: 'ethan@oksbi', amount: 300, fee: 15, status: 'REJECTED', requestedAt: '2025-08-27 14:20', processedAt: '2025-08-28 10:00' },
  { id: 'wd_505', userId: 'usr_009', userName: 'Arjun', method: 'bank', detail: '•••• 8830 (HDFC)', amount: 2000, fee: 100, status: 'PENDING', requestedAt: '2025-08-30 08:15', processedAt: null },
];

export const adminAuditLogs: AdminAuditLog[] = [
  { id: 'al_1', admin: 'root', action: 'USER_BAN', target: 'usr_004', category: 'moderation', ip: '10.0.0.1', createdAt: '2025-08-30 11:20', meta: { reason: 'hate speech', duration: 'permanent' } },
  { id: 'al_2', admin: 'root', action: 'WITHDRAWAL_APPROVE', target: 'wd_502', category: 'finance', ip: '10.0.0.1', createdAt: '2025-08-29 18:20', meta: { amount: 1200 } },
  { id: 'al_3', admin: 'mod_sara', action: 'REPORT_RESOLVE', target: 'rep_004', category: 'moderation', ip: '10.0.0.2', createdAt: '2025-08-28 10:12', meta: { action_taken: 'warn' } },
  { id: 'al_4', admin: 'root', action: 'PAYMENT_REFUND', target: 'pay_1008', category: 'finance', ip: '10.0.0.1', createdAt: '2025-08-29 13:00', meta: { amount: 20 } },
  { id: 'al_5', admin: 'mod_sara', action: 'CREATOR_APPROVE', target: 'usr_001', category: 'creators', ip: '10.0.0.2', createdAt: '2025-08-27 16:45', meta: {} },
];

export const notificationChannels = [
  { id: 'cc', name: 'Community Chat', active: true },
  { id: 'video', name: 'Video Calls', active: true },
  { id: 'audio', name: 'Audio Calls', active: false },
  { id: 'live', name: 'Live Rooms', active: true },
  { id: 'gifts', name: 'Gifts', active: true },
  { id: 'strangers', name: 'Random Matches', active: true },
];

export const adminStats = {
  totalUsers: 5_284_193,
  activeToday: 842_019,
  creators: 18_450,
  online: 126_480,
  revenue24h: 48_250,
  revenue30d: 1_284_300,
  newUsers24h: 18_912,
};
