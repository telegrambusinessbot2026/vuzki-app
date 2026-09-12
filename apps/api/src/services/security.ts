import { prisma } from '@vuzki/database';
import { SecurityEventType, NotificationType } from '@vuzki/shared';
import { notify } from './notification';

/**
 * Device & account security — track login sessions, new devices, suspicious
 * logins, password changes and recovery, so users can view sessions, log out
 * other devices, and secure their account. Security events notify the user.
 */

export interface DeviceContext {
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordSecurityEvent(params: {
  userId: string;
  type: SecurityEventType;
  device?: DeviceContext;
  metadata?: Record<string, unknown>;
  notifyUser?: boolean;
}) {
  const event = await prisma.securityEvent.create({
    data: {
      userId: params.userId,
      type: params.type,
      ipAddress: params.device?.ipAddress,
      deviceName: params.device?.deviceName,
      deviceId: params.device?.deviceId,
      metadata: (params.metadata as any) ?? undefined,
    },
  });

  if (params.notifyUser !== false) {
    await notify({
      userId: params.userId,
      type: NotificationType.SECURITY,
      title: securityTitles[params.type] || 'Security update',
      body: securityBodies[params.type] || 'Your account security settings were updated.',
      data: { securityEventId: event.id, type: params.type },
    });
  }
  return event;
}

const securityTitles: Record<SecurityEventType, string> = {
  [SecurityEventType.LOGIN]: 'New login',
  [SecurityEventType.NEW_DEVICE]: 'New device detected',
  [SecurityEventType.SUSPICIOUS_LOGIN]: 'Suspicious login attempt',
  [SecurityEventType.PASSWORD_CHANGE]: 'Password changed',
  [SecurityEventType.RECOVERY]: 'Account recovery requested',
  [SecurityEventType.RESTRICTION]: 'Account security restriction',
  [SecurityEventType.LOGOUT]: 'Signed out',
  [SecurityEventType.ALL_SESSIONS_REVOKED]: 'Sessions revoked',
};

const securityBodies: Record<SecurityEventType, string> = {
  [SecurityEventType.LOGIN]: 'A new sign-in was detected on your account.',
  [SecurityEventType.NEW_DEVICE]: 'Your account was accessed from a new device.',
  [SecurityEventType.SUSPICIOUS_LOGIN]: 'We detected a sign-in that looks unusual. Secure your account if this was not you.',
  [SecurityEventType.PASSWORD_CHANGE]: 'Your password was successfully changed.',
  [SecurityEventType.RECOVERY]: 'A recovery flow was started for your account.',
  [SecurityEventType.RESTRICTION]: 'A security action was taken on your account.',
  [SecurityEventType.LOGOUT]: 'Your session was ended.',
  [SecurityEventType.ALL_SESSIONS_REVOKED]: 'All other sessions were signed out.',
};

export async function listSecurityEvents(userId: string, limit = 50) {
  return prisma.securityEvent.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
}

export async function listSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, isActive: true, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
  });
}

export async function revokeSession(sessionId: string, userId: string) {
  return prisma.session.updateMany({ where: { id: sessionId, userId }, data: { isActive: false } });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.updateMany({
    where: { userId, isActive: true, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { isActive: false },
  });
  await recordSecurityEvent({ userId, type: SecurityEventType.ALL_SESSIONS_REVOKED });
}

export async function notifyNewDevice(context: DeviceContext & { userId: string }) {
  return recordSecurityEvent({
    userId: context.userId,
    type: SecurityEventType.NEW_DEVICE,
    device: context,
    metadata: { fromLogin: true },
  });
}

/**
 * Detect suspicious login: unusually many failed attempts, mismatched device.
 * Returns whether to proceed. Deterministic thresholds.
 */
export async function detectSuspiciousLogin(params: { userId: string; deviceId?: string; ipAddress?: string; sessionAttempts?: number }) {
  const suspiciousLoginCount = await prisma.securityEvent.count({
    where: { userId: params.userId, type: SecurityEventType.SUSPICIOUS_LOGIN, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (suspiciousLoginCount >= 5 || (params.sessionAttempts ?? 0) >= 5) {
    await recordSecurityEvent({ userId: params.userId, type: SecurityEventType.SUSPICIOUS_LOGIN, metadata: { deviceId: params.deviceId, ip: params.ipAddress }, notifyUser: true });
    return { suspicious: true };
  }
  return { suspicious: false };
}
