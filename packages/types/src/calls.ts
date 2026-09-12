import { CallType, CallStatus, CallRole, CallConnectionStatus } from '@vuzki/shared';

export interface CallInitiatePayload {
  receiverId: string;
  type: CallType;
  callRate?: number;
}

export interface CallRequest {
  callId: string;
  caller: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  receiverId: string;
  type: CallType;
  startedAt: Date;
}

export interface CallAcceptPayload {
  callId: string;
  sdp: string;
}

export interface CallDTO {
  id: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number;
  costCoins: number;
  creatorEarnings: number;
}

export interface CallSignalingPayload {
  callId: string;
  from: string;
  to: string;
  sdp?: string;
  candidate?: unknown;
}

export interface InCallUser {
  userId: string;
  role: CallRole;
  connectedAt: Date;
  connectionStatus: CallConnectionStatus;
}

export interface CallSocketEvent {
  type:
    | 'call_request'
    | 'call_accept'
    | 'call_reject'
    | 'call_cancel'
    | 'call_end'
    | 'call_busy'
    | 'call_missed'
    | 'webrtc_offer'
    | 'webrtc_answer'
    | 'webrtc_candidate'
    | 'call_quality'
    | 'call_reconnect'
    | 'call_timer';
  payload: unknown;
}
