import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transitionReferralToEligible } from '../services/referrals';

describe('Referral Eligibility Transition', () => {
  it('updates a PENDING referral to ELIGIBLE atomically using the supplied transaction client', async () => {
    const txMock = {
      referral: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      }
    };
    
    await transitionReferralToEligible('u123', txMock as any);
    
    expect(txMock.referral.updateMany).toHaveBeenCalledWith({
      where: {
        referredUserId: 'u123',
        status: 'PENDING',
      },
      data: {
        status: 'ELIGIBLE',
      }
    });
  });
  
  it('does nothing if the referral is already ELIGIBLE or PAID', async () => {
    // Note: updateMany will simply match 0 rows if none are PENDING
    const txMock = {
      referral: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 })
      }
    };
    
    await transitionReferralToEligible('u123', txMock as any);
    
    expect(txMock.referral.updateMany).toHaveBeenCalledWith({
      where: {
        referredUserId: 'u123',
        status: 'PENDING',
      },
      data: {
        status: 'ELIGIBLE',
      }
    });
  });
});
