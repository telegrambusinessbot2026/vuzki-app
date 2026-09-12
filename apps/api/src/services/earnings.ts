import { prisma } from '@vuzki/database';
import { startOfDay, startOfWeek, startOfMonth } from '@vuzki/utils';
import { WalletTransactionType, CallType } from '@vuzki/shared';

// Available earnings for a creator = SUM(amount - withdrawnAmount) across
// withdrawable rows (PENDING or AVAILABLE). Rows marked WITHDRAWN or
// UNCOLLECTIBLE are excluded. This correctly accounts for partial withdrawal
// consumption (withdrawnAmount>0 but not yet fully withdrawn).
export async function computeAvailableBalance(creatorProfileId: string): Promise<number> {
  const rows = await prisma.creatorEarning.findMany({
    where: { creatorId: creatorProfileId, status: { in: ['PENDING', 'AVAILABLE'] } },
    select: { amount: true, withdrawnAmount: true },
  });
  return rows.reduce((sum, r) => sum + Math.max(0, r.amount - (r.withdrawnAmount || 0)), 0);
}

export async function getEarningsSummary(userId: string) {
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const day = startOfDay(new Date());
  const week = startOfWeek(new Date());
  const month = startOfMonth(new Date());

  const [today, weekSum, monthSum, total, pending, callStats] = await Promise.all([
    prisma.creatorEarning.aggregate({
      where: { creatorId: profile.id, createdAt: { gte: day }, status: { not: 'UNCOLLECTIBLE' } },
      _sum: { amount: true },
    }),
    prisma.creatorEarning.aggregate({
      where: { creatorId: profile.id, createdAt: { gte: week }, status: { not: 'UNCOLLECTIBLE' } },
      _sum: { amount: true },
    }),
    prisma.creatorEarning.aggregate({
      where: { creatorId: profile.id, createdAt: { gte: month }, status: { not: 'UNCOLLECTIBLE' } },
      _sum: { amount: true },
    }),
    prisma.creatorEarning.aggregate({
      where: { creatorId: profile.id, status: { not: 'UNCOLLECTIBLE' } },
      _sum: { amount: true },
    }),
    prisma.creatorEarning.aggregate({
      where: { creatorId: profile.id, status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.creatorProfile.findUnique({ where: { id: profile.id }, include: { } }),
  ]);

  const availableBalance = await computeAvailableBalance(profile.id);

  const calls = await prisma.call.groupBy({
    by: ['type'],
    where: { participants: { some: { userId } }, status: 'COMPLETED' },
    _sum: { durationSeconds: true },
  });

  const audioMin = (calls.find((c) => c.type === CallType.AUDIO)?._sum.durationSeconds ?? 0) / 60;
  const videoMin = (calls.find((c) => c.type === CallType.VIDEO)?._sum.durationSeconds ?? 0) / 60;

  const gifts = await prisma.giftTransaction.count({ where: { receiverId: userId } });

  return {
    today: today._sum.amount ?? 0,
    week: weekSum._sum.amount ?? 0,
    month: monthSum._sum.amount ?? 0,
    total: total._sum.amount ?? 0,
    pendingBalance: pending._sum.amount ?? 0,
    availableBalance,
    totalMinutes: Math.round(audioMin + videoMin),
    audioCallMinutes: Math.round(audioMin),
    videoCallMinutes: Math.round(videoMin),
    rating: profile.rating,
    numberOfRatings: profile.ratingCount,
    giftsReceived: gifts,
  };
}

// Transfer a creator's pending earnings to available balance
export async function movePendingToAvailable(creatorProfileId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.creatorEarning.findMany({
      where: { creatorId: creatorProfileId, status: 'PENDING' },
    });
    // Convert each pending row to AVAILABLE (no partial consumption on this path).
    for (const r of rows) {
      await tx.creatorEarning.update({ where: { id: r.id }, data: { status: 'AVAILABLE' } });
    }
    const available = await computeAvailableBalance(creatorProfileId);
    await tx.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { totalEarnings: { increment: rows.reduce((s, r) => s + r.amount, 0) } },
    });
    return available;
  });
}

export async function rateCreator(creatorId: string, score: number) {
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: creatorId } });
  if (!profile) return null;
  const newCount = profile.ratingCount + 1;
  const newRating = ((profile.rating ?? 0) * profile.ratingCount + score) / newCount;
  return prisma.creatorProfile.update({
    where: { id: profile.id },
    data: { rating: Math.round(newRating * 10) / 10, ratingCount: newCount },
  });
}
