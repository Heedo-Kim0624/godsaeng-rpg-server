import prisma from '../db/client.js';
import { format, getDay } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { TodayResponse, PlanItemResponse, AxisScores, Progress, Wallet } from '../types/index.js';
import { RuleType, Axis } from '@prisma/client';

// 시리즈가 해당 날짜에 적용되는지 확인
function shouldSeriesApplyToday(ruleType: RuleType, ruleJson: any, date: Date): boolean {
  const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  switch (ruleType) {
    case 'DAILY':
      return true;
    case 'WEEKDAYS':
      return !isWeekend;
    case 'WEEKLY':
      // 매주 월요일만 (또는 선택된 요일)
      const selectedDays = ruleJson?.selected_days || ['MON'];
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      return selectedDays.includes(dayNames[dayOfWeek]);
    case 'N_PER_WEEK':
      // 주 N회는 매일 보여주고, 완료 횟수 체크는 별도 처리
      return true;
    case 'ONCE':
      return true;
    default:
      return true;
  }
}

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

    // 활성 시리즈에서 퀘스트 생성
    await generateQuestsFromSeries(userId, plan.id, date);

    // 생성된 아이템 다시 조회
    plan = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  } else if (plan.items.length === 0) {
    // 플랜은 있지만 아이템이 없는 경우 시리즈에서 생성
    await generateQuestsFromSeries(userId, plan.id, date);

    plan = await prisma.plan.findUnique({
      where: { id: plan.id },
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

  const items: PlanItemResponse[] = (plan?.items || []).map((item) => ({
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
    plan_id: plan!.id,
    date: dateOnly,
    axis_scores: axisScores,
    progress,
    wallet,
    items,
    story_summary: storyDraft?.summary || null,
  };
}

// 시리즈에서 퀘스트 생성
async function generateQuestsFromSeries(userId: string, planId: string, date: Date): Promise<void> {
  // 활성 시리즈 조회
  const activeSeries = await prisma.series.findMany({
    where: {
      userId,
      active: true,
    },
  });

  let sortOrder = 0;
  for (const series of activeSeries) {
    // 해당 날짜에 적용되는지 확인
    if (!shouldSeriesApplyToday(series.ruleType, series.ruleJson, date)) {
      continue;
    }

    // 이미 같은 시리즈에서 오늘 퀘스트가 생성되었는지 확인
    const existingItem = await prisma.planItem.findFirst({
      where: {
        planId,
        seriesId: series.id,
      },
    });

    if (existingItem) {
      continue; // 이미 있으면 스킵
    }

    // 퀘스트 생성
    await prisma.planItem.create({
      data: {
        id: uuid(),
        planId,
        source: 'series',
        seriesId: series.id,
        axis: series.axis,
        title: series.title,
        tier: series.tierDefault,
        estimatedMinutes: series.estimatedMinutesDefault,
        status: 'todo',
        sortOrder: sortOrder++,
      },
    });
  }
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
