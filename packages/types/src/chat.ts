import { MessageType, MessageStatus } from '@vuzki/shared';

export interface MessagePayload {
  conversationId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  replyTo?: string;
  giftId?: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  content: string;
  mediaUrl: string | null;
  replyToId: string | null;
  giftId: string | null;
  status: MessageStatus;
  reactions: Record<string, string[]>;
  createdAt: Date;
  readAt: Date | null;
}

export interface ConversationDTO {
  id: string;
  participantIds: string[];
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    onlineStatus: boolean;
    lastActiveAt: Date | null;
  };
  lastMessage: MessageDTO | null;
  unreadCount: number;
  updatedAt: Date;
}

export interface ReactionPayload {
  messageId: string;
  emoji: string;
}

export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

export interface ChatSocketEvent {
  type: 'new_message' | 'message_delivered' | 'message_read' | 'typing' | 'read' | 'deleted';
  payload: unknown;
}
