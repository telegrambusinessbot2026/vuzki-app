import { WalletTransactionType, WalletTransactionStatus, PaymentProvider } from '@vuzki/shared';

export interface PurchaseCoinsPayload {
  packageId: string;
  provider?: PaymentProvider;
  paymentToken?: string;
}

export interface PurchaseCoinsResponse {
  orderId: string;
  amount: number;
  currency: string;
  coins: number;
  provider: PaymentProvider;
  paymentPayload?: Record<string, unknown>;
}

export interface CoinPackageDTO {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  price: number;
  currency: string;
  isPopular: boolean;
}

export interface WalletTransactionDTO {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface GiftDTO {
  id: string;
  name: string;
  imageUrl: string;
  animationUrl: string | null;
  priceCoins: number;
  status: string;
}

export interface SendGiftPayload {
  receiverId: string;
  giftId: string;
  message?: string;
  contextType?: 'chat' | 'call' | 'profile';
  contextId?: string;
}

export interface CoinBalanceResponse {
  balance: number;
  currency: string;
}

export interface VerifyPaymentPayload {
  orderId: string;
  provider: PaymentProvider;
  paymentId: string;
  signature?: string;
}
