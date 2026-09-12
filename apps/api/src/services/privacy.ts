import { prisma } from '@vuzki/database';
import { NotificationType } from '@vuzki/shared';
import { isBlockedPair } from './ai-moderation';
import { recordSafetySignal } from './risk';

/**
 * Privacy controls & blocking.
 *
 * Blocking (A blocks B) is enforced SERVER-SIDE across every surface:
 *   - new chat / reply, calls, matching, discovery, likes, notifications
 *   - an active call between A and B is ended immediately.
 *
 * Privacy settings (who can message/call/match, location visibility) gate who
 * can reach a user, and are honored by the router/realtime layers.
 */

export interface BlockParams {
  blockerId: string;
  blockedId: string;
  reason?: string;
}

/** Deterministic block. Ends any active call between the pair and prevents future contact. */
export async function blockUser(params: BlockParams): Promise<{ created: boolean }> {
  if (params.blockerId === params.blockedId) throw new Error('CANNOT_BLOCK_SELF');

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: params.blockerId, blockedId: params.blockedId } },
  });

  if (!existing) {
    await prisma.block.create({
      data: { blockerId: params.blockerId, blockedId: params.blockedId, reason: params.reason },
    });
    await recordSafetySignal({ userId: params.blockerId, signalType: 'GUARD', reason: `Blocked ${params.blockedId}` });
  }

  // End any active/ringing call between the pair.
  await prisma.$transaction(async (tx) => {
    const active = await tx.call.findFirst({
      where: {
        status: { in: ['RINGING', 'ONGOING'] },
        OR: [
          { callerId: params.blockerId, receiverId: params.blockedId },
          { callerId: params.blockedId, receiverId: params.blockerId },
        ],
      },
    });
    if (active) {
      await tx.call.update({
        where: { id: active.id },
        data: { status: active.status === 'RINGING' ? 'CANCELLED' : 'FAILED', endedAt: new Date() },
      });
    }
    // Remove a would-be confirmation of "match" if any (prevent future matching).
    await tx.match.updateMany({
      where: {
        OR: [
          { userAId: params.blockerId, userBId: params.blockedId },
          { userAId: params.blockedId, userBId: params.blockerId },
        ],
      },
      data: { status: 'BLOCKED' },
    });
  });

  return { created: !existing };
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const res = await prisma.block.deleteMany({ where: { blockerId, blockedId } });
  return res.count > 0;
}

export async function getBlockedList(userId: string) {
  return prisma.block.findMany({
    where: { blockerId: userId },
    include: { blocked: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getWhoBlockedMe(userId: string) {
  return prisma.block.findMany({
    where: { blockedId: userId },
    select: { blockerId: true },
  });
}

export { isBlockedPair };

/**
 * Privacy gate: can `actor` message/call/match `target`?
 * Returns { allowed, reason }. Reasons: BLOCKED | SELF | PRIVACY_* | OK.
 */
export async function canInteract(params: { actorId: string; targetId: string; kind: 'message' | 'call' | 'match' }): Promise<{ allowed: boolean; reason: string }> {
  if (params.actorId === params.targetId) return { allowed: false, reason: 'SELF' };
  if (await isBlockedPair(params.actorId, params.targetId)) return { allowed: false, reason: 'BLOCKED' };

  const target = await prisma.user.findUnique({
    where: { id: params.targetId },
    include: { preferences: true, creator: true },
  });
  if (!target || target.deletedAt) return { allowed: false, reason: 'NOT_FOUND' };

  const prefs = target.preferences;
  if (!prefs) return { allowed: true, reason: 'OK' };

  const whoCan = params.kind === 'message' ? prefs.whoCanMessage : params.kind === 'call' ? prefs.whoCanCall : prefs.whoCanMatch;

  if (whoCan === 'nobody') return { allowed: false, reason: 'PRIVACY_NOBODY' };
  if (whoCan === 'verified' && !target.isVerified) {
    // "verified" means only verified accounts can interact -> target sets it.
    // We check whether the ACTOR is verified instead:
  }
  // For 'verified' whoCan, require the actor to be verified.
  if (whoCan === 'verified') {
    const actor = await prisma.user.findUnique({ where: { id: params.actorId }, select: { isVerified: true, premiumTier: true } });
    const actorVerified = actor?.isVerified || (actor?.premiumTier && actor.premiumTier !== 'FREE');
    if (!actorVerified) return { allowed: false, reason: 'PRIVACY_VERIFIED_ONLY' };
  }
  if (whoCan === 'followers') {
    const follows = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: params.actorId, followingId: params.targetId },
      },
    }).catch(() => null);
    // If not a follower, fall back to an existing conversation as a proxy.
    const [a, b] = [params.actorId, params.targetId].sort();
    const hasChat = await prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      select: { id: true },
    }).catch(() => null);
    if (!follows && !hasChat) return { allowed: false, reason: 'PRIVACY_FOLLOWERS_ONLY' };
  }
  return { allowed: true, reason: 'OK' };
}

/** Build a minimal privacy statement a user controls. */
export async function getPrivacySettings(userId: string) {
  const prefs = await prisma.profilePreferences.findUnique({ where: { userId } });
  if (!prefs) return null;
  return {
    whoCanMessage: prefs.whoCanMessage,
    whoCanCall: prefs.whoCanCall,
    whoCanMatch: prefs.whoCanMatch,
    contactRequests: prefs.contactRequests,
    locationVisibility: prefs.locationVisibility,
    allowLocationDiscovery: prefs.allowLocationDiscovery,
    showExactLocation: prefs.showExactLocation,
    nearByEnabled: prefs.nearByEnabled,
    onlineVisibility: prefs.onlineVisibility,
    showOnlineStatus: prefs.showOnlineStatus,
    discoveryEnabled: prefs.discoveryEnabled,
    showProfileInDiscovery: prefs.showProfileInDiscovery,
    showReadReceipts: prefs.showReadReceipts,
    allowPushNotifications: prefs.allowPushNotifications,
    allowEmailNotifications: prefs.allowEmailNotifications,
    allowMarketing: prefs.allowMarketing,
  };
}

export async function updatePrivacySettings(userId: string, patch: Record<string, unknown>) {
  const allowed = [
    'whoCanMessage', 'whoCanCall', 'whoCanMatch', 'contactRequests', 'locationVisibility',
    'allowLocationDiscovery', 'showExactLocation', 'nearByEnabled', 'onlineVisibility',
    'showOnlineStatus', 'discoveryEnabled', 'showProfileInDiscovery', 'showReadReceipts',
    'allowPushNotifications', 'allowEmailNotifications', 'allowMarketing',
    'ageRangeFrom', 'ageRangeTo', 'genderPreference', 'maxDistanceKm', 'onlinePreference', 'verifiedPreference',
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in patch) data[k] = patch[k];
  }
  return prisma.profilePreferences.upsert({
    where: { userId },
    create: { userId, ...(data as any) },
    update: data as any,
  });
}

export async function notifyBlockEvent(targetId: string, meta: Record<string, unknown>) {
  await prisma.notification.create({
    data: { userId: targetId, type: NotificationType.SYSTEM, title: 'Account update', body: 'A moderation decision has been applied to your account.', data: meta as any },
  }).catch(() => {});
}
