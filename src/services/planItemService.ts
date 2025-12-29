import prisma from '../db/client.js';
import { v4 as uuid } from 'uuid';
import { UpdatePlanItemRequest, PlanItemResponse } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function updatePlanItem(
  userId: string,
  planItemId: string,
  request: UpdatePlanItemRequest
): Promise<PlanItemResponse> {
  // PlanItem 확인
  const planItem = await prisma.planItem.findUnique({
    where: { id: planItemId },
    include: { plan: true, override: true },
  });

  if (!planItem) {
    throw createError('Plan item not found', 404, 'NOT_FOUND');
  }

  if (planItem.plan.userId !== userId) {
    throw createError('Plan item does not belong to user', 403, 'FORBIDDEN');
  }

  // 업데이트할 필드 준비
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (request.title !== undefined) updateData.title = request.title;
  if (request.axis !== undefined) updateData.axis = request.axis;
  if (request.tier !== undefined) updateData.tier = request.tier;
  if (request.estimated_minutes !== undefined) updateData.estimatedMinutes = request.estimated_minutes;
  if (request.scheduled_at !== undefined) {
    updateData.scheduledAt = request.scheduled_at ? new Date(request.scheduled_at) : null;
  }

  // apply_scope가 today_only면 override 테이블에도 저장
  if (request.apply_scope === 'today_only') {
    const overrideFields: any = {};
    if (request.title !== undefined) overrideFields.title = request.title;
    if (request.axis !== undefined) overrideFields.axis = request.axis;
    if (request.tier !== undefined) overrideFields.tier = request.tier;
    if (request.estimated_minutes !== undefined) overrideFields.estimated_minutes = request.estimated_minutes;
    if (request.scheduled_at !== undefined) overrideFields.scheduled_at = request.scheduled_at;

    await prisma.planItemOverride.upsert({
      where: { planItemId },
      create: {
        id: uuid(),
        planItemId,
        applyScope: 'today_only',
        overrideFields,
      },
      update: {
        overrideFields,
        updatedAt: new Date(),
      },
    });
  }

  // PlanItem 업데이트
  const updated = await prisma.planItem.update({
    where: { id: planItemId },
    data: updateData,
  });

  return {
    id: updated.id,
    source: updated.source,
    axis: updated.axis as any,
    title: updated.title,
    description: updated.description,
    tier: updated.tier,
    scheduled_at: updated.scheduledAt?.toISOString() || null,
    estimated_minutes: updated.estimatedMinutes,
    status: updated.status as any,
    locked_by_user: updated.lockedByUser,
    sort_order: updated.sortOrder,
  };
}

export async function createPlanItem(
  userId: string,
  planId: string,
  data: {
    title: string;
    axis: string;
    tier?: number;
    description?: string;
    scheduled_at?: string;
    estimated_minutes?: number;
  }
): Promise<PlanItemResponse> {
  // Plan 확인
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw createError('Plan not found', 404, 'NOT_FOUND');
  }

  if (plan.userId !== userId) {
    throw createError('Plan does not belong to user', 403, 'FORBIDDEN');
  }

  // 마지막 sortOrder 조회
  const lastItem = await prisma.planItem.findFirst({
    where: { planId },
    orderBy: { sortOrder: 'desc' },
  });

  const newSortOrder = (lastItem?.sortOrder || 0) + 1;

  // 새 아이템 생성
  const item = await prisma.planItem.create({
    data: {
      id: uuid(),
      planId,
      source: 'user',
      axis: data.axis as any,
      title: data.title,
      description: data.description || null,
      tier: data.tier || 1,
      scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
      estimatedMinutes: data.estimated_minutes || 15,
      sortOrder: newSortOrder,
    },
  });

  return {
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
  };
}

export async function deletePlanItem(
  userId: string,
  planItemId: string
): Promise<void> {
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

  // 완료된 아이템은 삭제 불가
  if (planItem.status === 'done') {
    throw createError('Cannot delete completed item', 400, 'CANNOT_DELETE_COMPLETED');
  }

  await prisma.planItem.delete({
    where: { id: planItemId },
  });
}

export async function skipPlanItem(
  userId: string,
  planItemId: string
): Promise<PlanItemResponse> {
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
    throw createError('Cannot skip completed item', 400, 'CANNOT_SKIP_COMPLETED');
  }

  const updated = await prisma.planItem.update({
    where: { id: planItemId },
    data: { status: 'skipped', updatedAt: new Date() },
  });

  return {
    id: updated.id,
    source: updated.source,
    axis: updated.axis as any,
    title: updated.title,
    description: updated.description,
    tier: updated.tier,
    scheduled_at: updated.scheduledAt?.toISOString() || null,
    estimated_minutes: updated.estimatedMinutes,
    status: updated.status as any,
    locked_by_user: updated.lockedByUser,
    sort_order: updated.sortOrder,
  };
}
