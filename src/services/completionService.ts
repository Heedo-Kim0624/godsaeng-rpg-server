import prisma from '../db/client.js';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import {
  CompleteQuestRequest,
  CompleteResponse,
  RewardResponse,
  AxisScores,
  Progress,
  Wallet,
  Axis,
} from '../types/index.js';
import { calculateRewards, processLevelUp, applyAxisDelta } from '../utils/rewards.js';
import { createError } from '../middleware/errorHandler.js';

export async function completeQuest(
  userId: string,
  planItemId: string,
  request: CompleteQuestRequest,
  idempotencyKey?: string
): Promise<CompleteResponse> {
  // Idempotency 체크
  if (idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key: idempotencyKey } },
      include: { completionEvent: true },
    });

    if (existing?.completionEvent) {
      // 이미 처리된 요청 - 기존 결과 반환
      const reward = await prisma.rewardEvent.findUnique({
        where: { completionEventId: existing.completionEvent.id },
      });

      return buildCompleteResponse(existing.completionEvent, reward!, userId);
    }
  }

  // PlanItem 확인
  const planItem = await prisma.planItem.findUnique({
    where: { id: planItemId },
    include: { plan: true },
  });

  if (!planItem) {
    throw createError('Plan item not found', 404, 'NOT_FOUND');
  }

  if (planItem.plan.userId !== userId) {
    throw createError('Plan item does not belong to user', 403, 'FORBIDDEN');
  }

  if (planItem.status === 'done') {
    throw createError('Quest already completed', 409, 'ALREADY_COMPLETED');
  }

  const completedAt = new Date();
  const planDate = planItem.plan.date;

  // 보상 계산
  const rewards = calculateRewards(
    planItem.tier,
    request.quality || 'mid',
    planItem.axis as Axis
  );

  // 트랜잭션으로 모든 업데이트 처리
  const result = await prisma.$transaction(async (tx) => {
    // 1. PlanItem 상태 업데이트
    await tx.planItem.update({
      where: { id: planItemId },
      data: { status: 'done', updatedAt: new Date() },
    });

    // 2. CompletionEvent 생성
    const completionEvent = await tx.completionEvent.create({
      data: {
        id: uuid(),
        userId,
        planItemId,
        planDate,
        completedAt,
        durationMinutes: request.duration_minutes || 0,
        quality: request.quality || 'mid',
        clientSource: request.client_source || 'app',
      },
    });

    // 3. 스냅샷 데이터 조회
    const [axisSnapshot, progressSnapshot, walletSnapshot] = await Promise.all([
      tx.axisScoresSnapshot.findUnique({ where: { userId } }),
      tx.progressSnapshot.findUnique({ where: { userId } }),
      tx.walletSnapshot.findUnique({ where: { userId } }),
    ]);

    // 기본값 설정
    const currentAxis: AxisScores = axisSnapshot || {
      body: 0, focus: 0, knowledge: 0, discipline: 0, organization: 0, social: 0,
    } as AxisScores;
    const currentProgress = progressSnapshot || { level: 1, exp: 0, expToNext: 100 };
    const currentWallet = walletSnapshot || { gold: BigInt(0), diamond: BigInt(0) };

    // 4. 레벨업 처리
    const levelResult = processLevelUp(
      currentProgress.exp,
      currentProgress.level,
      rewards.expDelta
    );

    // 5. 새 스냅샷 값 계산
    const newAxisScores = applyAxisDelta(currentAxis, rewards.axisDelta);
    const newGold = Number(currentWallet.gold) + rewards.goldDelta;
    const newDiamond = Number(currentWallet.diamond) + rewards.diamondDelta;

    // 6. 스냅샷 업데이트
    await Promise.all([
      tx.axisScoresSnapshot.upsert({
        where: { userId },
        create: { userId, ...newAxisScores },
        update: { ...newAxisScores, updatedAt: new Date() },
      }),
      tx.progressSnapshot.upsert({
        where: { userId },
        create: {
          userId,
          level: levelResult.newLevel,
          exp: levelResult.newExp,
          expToNext: levelResult.expToNext,
        },
        update: {
          level: levelResult.newLevel,
          exp: levelResult.newExp,
          expToNext: levelResult.expToNext,
          updatedAt: new Date(),
        },
      }),
      tx.walletSnapshot.upsert({
        where: { userId },
        create: { userId, gold: BigInt(newGold), diamond: BigInt(newDiamond) },
        update: { gold: BigInt(newGold), diamond: BigInt(newDiamond), updatedAt: new Date() },
      }),
    ]);

    // 7. RewardEvent 생성
    const rewardEvent = await tx.rewardEvent.create({
      data: {
        id: uuid(),
        userId,
        completionEventId: completionEvent.id,
        goldDelta: rewards.goldDelta,
        diamondDelta: rewards.diamondDelta,
        expDelta: rewards.expDelta,
        axisDelta: rewards.axisDelta,
        levelup: levelResult.leveledUp,
      },
    });

    // 8. Ledger 기록
    await Promise.all([
      // Wallet Ledger (Gold)
      tx.walletLedger.create({
        data: {
          id: uuid(),
          userId,
          refType: 'completion',
          refId: completionEvent.id,
          currency: 'gold',
          delta: rewards.goldDelta,
          balanceAfter: BigInt(newGold),
        },
      }),
      // Exp Ledger
      tx.expLedger.create({
        data: {
          id: uuid(),
          userId,
          refType: 'completion',
          refId: completionEvent.id,
          delta: rewards.expDelta,
          expAfter: levelResult.newExp,
          levelAfter: levelResult.newLevel,
        },
      }),
      // Axis Ledger (해당 축만)
      ...Object.entries(rewards.axisDelta).map(([axis, delta]) =>
        tx.axisLedger.create({
          data: {
            id: uuid(),
            userId,
            refType: 'completion',
            refId: completionEvent.id,
            axis: axis as any,
            delta: delta as number,
            valueAfter: newAxisScores[axis as keyof AxisScores],
          },
        })
      ),
    ]);

    // 9. Idempotency Key 저장
    if (idempotencyKey) {
      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId,
          completionEventId: completionEvent.id,
        },
      });
    }

    return {
      completionEvent,
      rewardEvent,
      newAxisScores,
      newProgress: {
        level: levelResult.newLevel,
        exp: levelResult.newExp,
        exp_to_next: levelResult.expToNext,
      },
      newWallet: { gold: newGold, diamond: newDiamond },
    };
  });

  return {
    completion_event_id: result.completionEvent.id,
    completed_at: result.completionEvent.completedAt.toISOString(),
    reward: {
      gold_delta: result.rewardEvent.goldDelta,
      diamond_delta: result.rewardEvent.diamondDelta,
      exp_delta: result.rewardEvent.expDelta,
      axis_delta: result.rewardEvent.axisDelta as Record<string, number>,
      levelup: result.rewardEvent.levelup,
      new_progress: result.newProgress,
      new_wallet: result.newWallet,
      new_axis_scores: result.newAxisScores,
    },
  };
}

async function buildCompleteResponse(
  completionEvent: any,
  reward: any,
  userId: string
): Promise<CompleteResponse> {
  const [axisSnapshot, progressSnapshot, walletSnapshot] = await Promise.all([
    prisma.axisScoresSnapshot.findUnique({ where: { userId } }),
    prisma.progressSnapshot.findUnique({ where: { userId } }),
    prisma.walletSnapshot.findUnique({ where: { userId } }),
  ]);

  return {
    completion_event_id: completionEvent.id,
    completed_at: completionEvent.completedAt.toISOString(),
    reward: {
      gold_delta: reward.goldDelta,
      diamond_delta: reward.diamondDelta,
      exp_delta: reward.expDelta,
      axis_delta: reward.axisDelta as Record<string, number>,
      levelup: reward.levelup,
      new_progress: {
        level: progressSnapshot?.level || 1,
        exp: progressSnapshot?.exp || 0,
        exp_to_next: progressSnapshot?.expToNext || 100,
      },
      new_wallet: {
        gold: Number(walletSnapshot?.gold || 0),
        diamond: Number(walletSnapshot?.diamond || 0),
      },
      new_axis_scores: axisSnapshot || {
        body: 0, focus: 0, knowledge: 0, discipline: 0, organization: 0, social: 0,
      },
    },
  };
}
