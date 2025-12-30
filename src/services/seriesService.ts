import { PrismaClient, RuleType, Axis } from '@prisma/client';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export interface SeriesInput {
  title: string;
  axis: string;
  tier_default: number;
  estimated_minutes_default: number;
  active: boolean;
  rule_type: string;
  rule_json?: {
    n_per_week?: number;
    selected_days?: string[];
  };
}

export interface SeriesResponse {
  id: string;
  title: string;
  axis: string;
  tier_default: number;
  estimated_minutes_default: number;
  active: boolean;
  rule_type: string;
  rule_json: any;
}

function mapToResponse(series: any): SeriesResponse {
  return {
    id: series.id,
    title: series.title,
    axis: series.axis,
    tier_default: series.tierDefault,
    estimated_minutes_default: series.estimatedMinutesDefault,
    active: series.active,
    rule_type: series.ruleType,
    rule_json: series.ruleJson,
  };
}

export async function getSeries(userId: string): Promise<{ series: SeriesResponse[] }> {
  const seriesList = await prisma.series.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    series: seriesList.map(mapToResponse),
  };
}

export async function createSeries(userId: string, data: SeriesInput): Promise<SeriesResponse> {
  const ruleType = data.rule_type as RuleType;
  const axis = data.axis as Axis;

  const series = await prisma.series.create({
    data: {
      userId,
      title: data.title,
      axis,
      tierDefault: data.tier_default,
      estimatedMinutesDefault: data.estimated_minutes_default,
      active: data.active,
      startDate: new Date(),
      ruleType,
      ruleJson: data.rule_json || {},
    },
  });

  return mapToResponse(series);
}

export async function updateSeries(
  userId: string,
  seriesId: string,
  data: Partial<SeriesInput>
): Promise<SeriesResponse> {
  // 소유권 확인
  const existing = await prisma.series.findFirst({
    where: { id: seriesId, userId },
  });

  if (!existing) {
    throw createError('Series not found', 404, 'NOT_FOUND');
  }

  const updateData: any = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.axis !== undefined) updateData.axis = data.axis as Axis;
  if (data.tier_default !== undefined) updateData.tierDefault = data.tier_default;
  if (data.estimated_minutes_default !== undefined) {
    updateData.estimatedMinutesDefault = data.estimated_minutes_default;
  }
  if (data.active !== undefined) updateData.active = data.active;
  if (data.rule_type !== undefined) updateData.ruleType = data.rule_type as RuleType;
  if (data.rule_json !== undefined) updateData.ruleJson = data.rule_json;

  const series = await prisma.series.update({
    where: { id: seriesId },
    data: updateData,
  });

  return mapToResponse(series);
}

export async function deleteSeries(userId: string, seriesId: string): Promise<void> {
  // 소유권 확인
  const existing = await prisma.series.findFirst({
    where: { id: seriesId, userId },
  });

  if (!existing) {
    throw createError('Series not found', 404, 'NOT_FOUND');
  }

  await prisma.series.delete({
    where: { id: seriesId },
  });
}

// 배치 시리즈 생성 (온보딩용)
export async function createSeriesBatch(
  userId: string,
  items: SeriesInput[]
): Promise<{ series: SeriesResponse[] }> {
  const results: SeriesResponse[] = [];

  // 트랜잭션으로 한 번에 생성
  await prisma.$transaction(async (tx) => {
    for (const data of items) {
      const ruleType = data.rule_type as RuleType;
      const axis = data.axis as Axis;

      const series = await tx.series.create({
        data: {
          userId,
          title: data.title,
          axis,
          tierDefault: data.tier_default,
          estimatedMinutesDefault: data.estimated_minutes_default,
          active: data.active,
          startDate: new Date(),
          ruleType,
          ruleJson: data.rule_json || {},
        },
      });

      results.push(mapToResponse(series));
    }
  });

  return { series: results };
}
