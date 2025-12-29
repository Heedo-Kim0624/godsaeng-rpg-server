import prisma from '../db/client.js';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { TodayResponse, PlanItemResponse, AxisScores, Progress, Wallet } from '../types/index.js';

export async function getTodayPlan(userId: string, dateStr?: string): Promise<TodayResponse> {
  const date = dateStr ? new Date(dateStr) : new Date();
  const dateOnly = format(date, 'yyyy-MM-dd');

  // 기존 플랜 찾기 또는 생성
  let plan = await prisma.plan.findUnique({
    where: {
      userId_date: {
        userId,
        date: new Date(dateOnly),
      },
    },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  // 플랜이 없으면 새로 생성
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        id: uuid(),
        userId,
        date: new Date(dateOnly),
        generatedFrom: 'auto',
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  // 스냅샷 데이터 조회 (없으면 기본값)
  const [axisSnapshot, progressSnapshot, walletSnapshot, storyDraft] = await Promise.all([
    prisma.axisScoresSnapshot.findUnique({ where: { userId } }),
    prisma.progressSnapshot.findUnique({ where: { userId } }),
    prisma.walletSnapshot.findUnique({ where: { userId } }),
    prisma.storyDraft.findFirst({
      where: { userId, date: new Date(dateOnly) },
      select: { summary: true },
    }),
  ]);

  const axisScores: AxisScores = axisSnapshot
    ? {
        body: axisSnapshot.body,
        focus: axisSnapshot.focus,
        knowledge: axisSnapshot.knowledge,
        discipline: axisSnapshot.discipline,
        organization: axisSnapshot.organization,
        social: axisSnapshot.social,
      }
    : { body: 0, focus: 0, knowledge: 0, discipline: 0, organization: 0, social: 0 };

  const progress: Progress = progressSnapshot
    ? {
        level: progressSnapshot.level,
        exp: progressSnapshot.exp,
        exp_to_next: progressSnapshot.expToNext,
      }
    : { level: 1, exp: 0, exp_to_next: 100 };

  const wallet: Wallet = walletSnapshot
    ? {
        gold: Number(walletSnapshot.gold),
        diamond: Number(walletSnapshot.diamond),
      }
    : { gold: 0, diamond: 0 };

  const items: PlanItemResponse[] = plan.items.map((item) => ({
    id: item.id,
    source: item.source,
    axis: item.axis as any,
    title: item.title,
    description: item.description,
    tier: item.tier,
    scheduled_at: item.scheduledAt?.toISOString() || null,
    estimated_minutes: item.estimatedMinutes,
    status: item.status as any,
    locked_by_user: item.lockedByUser,
    sort_order: item.sortOrder,
  }));

  return {
    plan_id: plan.id,
    date: dateOnly,
    axis_scores: axisScores,
    progress,
    wallet,
    items,
    story_summary: storyDraft?.summary || null,
  };
}

export async function ensureUserSnapshots(userId: string): Promise<void> {
  await Promise.all([
    prisma.axisScoresSnapshot.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.progressSnapshot.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.walletSnapshot.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
  ]);
}
