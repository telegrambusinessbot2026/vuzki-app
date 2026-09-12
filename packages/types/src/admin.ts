import { AdminRole, ReportStatus } from '@vuzki/shared';

export interface AdminTokenPayload {
  adminId: string;
  role: AdminRole;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  premiumUsers: number;
  onlineUsers: number;
  callsToday: number;
  messagesToday: number;
  revenue: number;
  coinPurchases: number;
  creatorEarnings: number;
  pendingWithdrawals: number;
  openReports: number;
  bannedUsers: number;
  dau: number;
  mau: number;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface AdminUpdateUserPayload {
  status?: string;
  verified?: boolean;
  premiumTier?: string;
  role?: string;
  moderationNote?: string;
}

export interface ReviewReportPayload {
  decision: 'resolve' | 'action' | 'dismiss';
  actionType?: string;
  note?: string;
  banUser?: boolean;
  days?: number;
}

export interface ReviewWithdrawalPayload {
  decision: 'approve' | 'reject' | 'process';
  note?: string;
}
