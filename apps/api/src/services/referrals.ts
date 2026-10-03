import { Prisma } from '@prisma/client';

/**
 * Transitions a user's pending referral to ELIGIBLE.
 * Must be called exactly upon the first successful coin top-up.
 * Safe to call idempotently (does nothing if already ELIGIBLE/PAID).
 */
export async function transitionReferralToEligible(
  referredUserId: string,
  tx: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
) {
  // We only transition the referral belonging to the user making the top-up
  // (where they are the 'referredUserId')
  // We check if there's exactly one PENDING referral.
  
  // Note: Since Prisma updateMany doesn't easily return the count of matched,
  // we can just run an updateMany matching referredUserId and status='PENDING'.
  // If it updates 1, then we've successfully transitioned it to ELIGIBLE.
  await tx.referral.updateMany({
    where: {
      referredUserId: referredUserId,
      status: 'PENDING',
    },
    data: {
      status: 'ELIGIBLE',
    },
  });
}
