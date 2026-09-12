import { CreatorAvailabilityStatus, KycStatus, WithdrawalStatus, WithdrawalMethod } from '@vuzki/shared';

export interface CreatorApplyPayload {
  reason?: string;
  callRatesFrom?: number;
  callRatesTo?: number;
  specialties?: string[];
  experience?: string;
  verificationType?: 'identity' | 'kyc' | 'none';
}

export interface CreatorEarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  pendingBalance: number;
  availableBalance: number;
  totalMinutes: number;
  audioCallMinutes: number;
  videoCallMinutes: number;
  rating: number | null;
  numberOfRatings: number;
  giftsReceived: number;
}

export interface WithdrawPayload {
  amount: number;
  method: WithdrawalMethod;
  details: Record<string, string>;
}

export interface WithdrawalDTO {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  details: Record<string, string>;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLoginResponse {
  status: CreatorAvailabilityStatus;
}
