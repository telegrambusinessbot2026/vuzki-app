import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const earningFindMany = vi.fn();
  const profileFindUnique = vi.fn();
  const earningAggregate = vi.fn();
  const callGroupBy = vi.fn();
  const giftCount = vi.fn();
  return { earningFindMany, profileFindUnique, earningAggregate, callGroupBy, giftCount };
});

vi.mock('@vuzki/database', () => ({
  prisma: {
    creatorEarning: {
      findMany: mocks.earningFindMany,
      aggregate: mocks.earningAggregate,
      count: vi.fn(),
    },
    creatorProfile: {
      findUnique: mocks.profileFindUnique,
    },
    call: { groupBy: mocks.callGroupBy },
    giftTransaction: { count: mocks.giftCount },
    $transaction: vi.fn(async (fn: (t: any) => Promise<unknown>) => fn({})),
  },
}));

import { computeAvailableBalance } from '@/services/earnings';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('earnings: computeAvailableBalance (partial-withdrawal accounting)', () => {
  it('sums amount - withdrawnAmount across PENDING/AVAILABLE rows', async () => {
    mocks.earningFindMany.mockResolvedValue([
      { amount: 100, withdrawnAmount: 0 }, // fully available
      { amount: 50, withdrawnAmount: 20 }, // partially withdrawn - 30 still owed
      { amount: 40, withdrawnAmount: null }, // null withdrawn treated as 0
    ]);

    // 100 + (50-20) + 40 = 170
    const balance = await computeAvailableBalance('cp1');
    expect(balance).toBe(170);
  });

  it('never returns a negative contribution for over-withdrawn rows', async () => {
    mocks.earningFindMany.mockResolvedValue([
      { amount: 10, withdrawnAmount: 0 },
      { amount: 5, withdrawnAmount: 12 }, // over-consumed by 7 -> clamped to 0
    ]);
    expect(await computeAvailableBalance('cp1')).toBe(10);
  });

  it('excludes WITHDRAWN / UNCOLLECTIBLE rows via the status filter', async () => {
    mocks.earningFindMany.mockResolvedValue([]);
    await computeAvailableBalance('cp1');
    expect(mocks.earningFindMany).toHaveBeenCalledWith({
      where: {
        creatorId: 'cp1',
        status: { in: ['PENDING', 'AVAILABLE'] },
      },
      select: { amount: true, withdrawnAmount: true },
    });
  });
});
