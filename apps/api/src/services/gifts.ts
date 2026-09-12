import { prisma } from '@vuzki/database';
import { ApiErrorResponse } from '@vuzki/types';
import { debitCoins } from './wallet';
import { notify } from './notification';
import { GIFT_CREATOR_SHARE, NotificationType, WalletTransactionType } from '@vuzki/shared';

export interface SendGiftParams {
  senderId: string;
  receiverId: string;
  giftId: string;
  message?: string;
  contextType?: 'chat' | 'call' | 'profile';
  contextId?: string;
  // Client-generated idempotency key: replaying the same request is a no-op.
  clientRequestId?: string;
}

/**
 * Atomic gift transaction: debits sender wallet, records GiftTransaction,
 * credits creator earnings, sends notification - all within a single txn.
 * Idempotent: same (sender, clientRequestId) never debits/earns twice.
 */
export async function sendGift(params: SendGiftParams) {
  if (params.senderId === params.receiverId) {
    throw new ApiErrorResponse(400, 'BAD_REQUEST', 'Cannot send gift to yourself');
  }

  const gift = await prisma.gift.findUnique({ where: { id: params.giftId } });
  if (!gift || gift.status !== 'ACTIVE') throw new ApiErrorResponse(404, 'GIFT_NOT_FOUND', 'Gift not found');

  const receiver = await prisma.user.findUnique({ where: { id: params.receiverId }, include: { creator: true } });
  if (!receiver) throw new ApiErrorResponse(404, 'USER_NOT_FOUND', 'Receiver not found');

  // Dedup guard keyed on (senderId, clientRequestId).
  const dedupKey = params.clientRequestId ? `${params.senderId}:${params.clientRequestId}` : undefined;

  const result = await prisma.$transaction(async (tx) => {
    if (dedupKey) {
      const existing = await tx.giftTransaction.findUnique({ where: { clientRequestId: dedupKey } });
      if (existing) return { alreadyProcessed: true, transaction: existing };
    }

    // Debit sender (idempotencyKey scoped to the gift's dedup key)
    const debit = await debitCoins(
      params.senderId,
      gift.priceCoins,
      WalletTransactionType.GIFT_SENT,
      { giftId: gift.id, receiverId: params.receiverId, contextId: params.contextId },
      gift.id,
      dedupKey ? `GIFT:${dedupKey}` : `GIFT:${gift.id}:${params.senderId}`,
      tx
    );

    // A concurrent duplicate send already billed this gift — don't double record.
    if (dedupKey && debit.alreadyProcessed) {
      return { alreadyProcessed: true, transaction: await tx.giftTransaction.findUnique({ where: { clientRequestId: dedupKey } }) };
    }

    const txn = await tx.giftTransaction.create({
      data: {
        senderId: params.senderId,
        receiverId: params.receiverId,
        giftId: gift.id,
        priceCoins: gift.priceCoins,
        message: params.message,
        contextType: params.contextType,
        contextId: params.contextId,
        clientRequestId: dedupKey,
      },
    });

    let creatorAmount = 0;
    if (receiver.isCreator && receiver.creator) {
      creatorAmount = gift.priceCoins * GIFT_CREATOR_SHARE;
      await tx.creatorEarning.create({
        data: {
          creatorId: receiver.creator.id,
          userId: params.receiverId,
          type: 'GIFT',
          amount: creatorAmount,
          coins: gift.priceCoins,
          status: 'PENDING',
        },
      });
    }

    return {
      alreadyProcessed: false,
      transaction: txn,
      gift: { id: gift.id, name: gift.name, priceCoins: gift.priceCoins, imageUrl: gift.imageUrl, animationUrl: gift.animationUrl },
    };
  });

  // Notify only after the atomic txn committed (never inside it).
  if (!result.alreadyProcessed) {
    notify({
      userId: params.receiverId,
      type: NotificationType.GIFT,
      title: 'You received a gift!',
      body: `You received a ${gift.name}${receiver.isCreator ? ' (+coins earned)' : ''}`,
      data: { giftId: gift.id, senderId: params.senderId, priceCoins: gift.priceCoins, contextId: params.contextId },
    }).catch(() => {});
  }

  return result;
}
