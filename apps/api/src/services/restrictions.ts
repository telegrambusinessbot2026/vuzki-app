import { prisma } from '@vuzki/database';
import {
  RestrictionType,
  RestrictionScope,
  NotificationType,
  AccountStatus,
  ModerationActionType,
} from '@vuzki/shared';
import { OFFENDER_ESCALATION } from '@vuzki/shared';
import { notify } from './notification';
import { recordSafetySignal } from './risk';

export { RestrictionScope };

/**
 * Restriction & enforcement layer.
 *
 * Deterministic RULES drive these decisions — AI only assists risk *tiering*
 * (see risk.ts). Handle actions are applied via `applyRestriction` and always
 * audited through ModerationAction and (optionally) a ModerationCase.
 */

export interface RestrictionInput {
  userId: string;
  type: RestrictionType;
  scope?: RestrictionScope;
  reason?: string;
  days?: number; // if set, creates a temporary restriction with expiry
  moderationCaseId?: string;
  adminId?: string;
}

export async function applyRestriction(input: RestrictionInput): Promise<{ restriction: any; action: any }> {
  const expiresAt = input.days && input.days > 0 ? new Date(Date.now() + input.days * 86_400_000) : null;
  const isTemp = !!input.days && input.days > 0;

  return prisma.$transaction(async (tx) => {
    const restriction = await tx.userRestriction.create({
      data: {
        userId: input.userId,
        type: input.type,
        scope: input.scope ?? RestrictionScope.ALL,
        reason: input.reason,
        moderationCaseId: input.moderationCaseId,
        expiresAt,
      },
    });

    const actionType = mapRestrictionToAction(input.type);
    const action = await tx.moderationAction.create({
      data: {
        userId: input.userId,
        actionType,
        severity: severityFor(input.type),
        reason: input.reason,
        adminId: input.adminId,
        days: input.days,
        metadata: { scope: input.scope, restrictionId: restriction.id },
      },
    });

    // Account-level status for suspensions/bans.
    if (input.type === RestrictionType.BAN) {
      await tx.user.update({ where: { id: input.userId }, data: { status: AccountStatus.BANNED } });
    } else if (input.type === RestrictionType.SUSPENSION || input.type === RestrictionType.TEMP_SUSPENSION) {
      if (!isTemp) {
        await tx.user.update({ where: { id: input.userId }, data: { status: AccountStatus.SUSPENDED } });
      }
    }

    // Notify the user (where appropriate) about the restriction action.
    await tx.notification.create({
      data: {
        userId: input.userId,
        type: NotificationType.SYSTEM,
        title: titles[input.type],
        body: input.reason ? `${input.reason}${isTemp ? ` (temporary${input.days ? ` — ${input.days} day(s)` : ''})` : ''}` : `Action: ${input.type.toLowerCase().replace('_', ' ')}`,
        data: { restriction: { type: input.type, scope: input.scope, expiresAt } },
      },
    });

    await recordSafetySignal({ userId: input.userId, signalType: 'MOD_ACTION', reason: `Restriction ${input.type}` });
    return { restriction, action };
  });
}

const titles: Record<RestrictionType, string> = {
  [RestrictionType.WARNING]: 'Policy Warning',
  [RestrictionType.MUTE]: 'You have been muted',
  [RestrictionType.COMM_RESTRICTION]: 'Messaging restricted',
  [RestrictionType.CALL_RESTRICTION]: 'Calls restricted',
  [RestrictionType.MATCH_RESTRICTION]: 'Matching restricted',
  [RestrictionType.TEMP_SUSPENSION]: 'Account temporarily suspended',
  [RestrictionType.SUSPENSION]: 'Account suspended',
  [RestrictionType.BAN]: 'Account banned',
};

function mapRestrictionToAction(type: RestrictionType): string {
  switch (type) {
    case RestrictionType.WARNING: return ModerationActionType.WARN;
    case RestrictionType.MUTE: return ModerationActionType.MUTE;
    case RestrictionType.COMM_RESTRICTION:
    case RestrictionType.CALL_RESTRICTION:
    case RestrictionType.MATCH_RESTRICTION: return ModerationActionType.RESTRICT;
    case RestrictionType.TEMP_SUSPENSION:
    case RestrictionType.SUSPENSION: return ModerationActionType.SUSPEND;
    case RestrictionType.BAN: return ModerationActionType.BAN;
    default: return ModerationActionType.WARN;
  }
}

function severityFor(type: RestrictionType): string {
  switch (type) {
    case RestrictionType.WARNING: return 'LOW';
    case RestrictionType.MUTE:
    case RestrictionType.COMM_RESTRICTION:
    case RestrictionType.CALL_RESTRICTION:
    case RestrictionType.MATCH_RESTRICTION: return 'MEDIUM';
    case RestrictionType.TEMP_SUSPENSION: return 'HIGH';
    case RestrictionType.SUSPENSION: return 'HIGH';
    case RestrictionType.BAN: return 'CRITICAL';
    default: return 'MEDIUM';
  }
}

/** Return the set of active restrictions for a user (not expired). */
export async function getActiveRestrictions(userId: string): Promise<any[]> {
  const now = new Date();
  return prisma.userRestriction.findMany({
    where: {
      userId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** True if the user has an active restriction covering `scope`. */
export async function isRestricted(userId: string, scope: RestrictionScope = RestrictionScope.ALL): Promise<boolean> {
  const restrictions = await getActiveRestrictions(userId);
  for (const r of restrictions) {
    if (r.scope === RestrictionScope.ALL || r.scope === scope) return true;
  }
  return false;
}

export async function canChatWith(userId: string): Promise<boolean> {
  return !(await isRestricted(userId, RestrictionScope.CHAT));
}
export async function canCall(userId: string): Promise<boolean> {
  return !(await isRestricted(userId, RestrictionScope.CALL));
}
export async function canMatch(userId: string): Promise<boolean> {
  return !(await isRestricted(userId, RestrictionScope.MATCH));
}

/**
 * Repeat-offender escalation.
 * Counts confirmed violations (RESOLVED/ACTIONED reports + moderation actions).
 * Returns the next action to take based on the defined escalation ladder.
 */
export async function escalateRepeatOffender(userId: string, activeModerationCaseId?: string) {
  const [resolvedReports, actions] = await Promise.all([
    prisma.report.count({
      where: { reportedUserId: userId, status: { in: ['ACTIONED', 'RESOLVED'] } },
    }),
    prisma.moderationAction.count({ where: { userId } }),
  ]);

  // Confirmed violations = actioned reports + explicit moderation actions.
  const violations = resolvedReports + actions;
  let nextAction: RestrictionType | null = null;

  for (const step of OFFENDER_ESCALATION) {
    if (violations >= step.violations) {
      if (step.action === 'WARNING') nextAction = RestrictionType.WARNING;
      if (step.action === 'TEMPORARY_RESTRICTION') nextAction = RestrictionType.COMM_RESTRICTION;
      if (step.action === 'SUSPENSION') nextAction = RestrictionType.SUSPENSION;
    }
  }

  return { violations, nextAction };
}

export async function revokeRestriction(restrictionId: string, adminId?: string) {
  return prisma.$transaction(async (tx) => {
    const r = await tx.userRestriction.update({ where: { id: restrictionId }, data: { isActive: false } });
    // If it was a full suspension that no longer blocks the class of action the
    // user was suspended for, restore ACTIVE status (unless they have another ban).
    const user = await tx.user.findUnique({ where: { id: r.userId }, include: { restrictions: { where: { isActive: true } } } });
    if (user) {
      const isBanned = user.restrictions.some((x: any) => x.type === RestrictionType.BAN || x.type === RestrictionType.SUSPENSION);
      if (!isBanned && (user.status === 'SUSPENDED')) {
        await tx.user.update({ where: { id: user.id }, data: { status: AccountStatus.ACTIVE } });
      }
    }
    return r;
  });
}
