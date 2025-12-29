import prisma from '../db/client.js';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { StoryDraftResponse, DraftMode } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function getStoryDraft(
  userId: string,
  dateStr?: string,
  mode?: DraftMode
): Promise<StoryDraftResponse | null> {
  const date = dateStr ? new Date(dateStr) : new Date();
  const dateOnly = format(date, 'yyyy-MM-dd');
  const draftMode = mode || 'narrative';

  // 기존 드래프트 조회
  let draft = await prisma.storyDraft.findFirst({
    where: {
      userId,
      date: new Date(dateOnly),
      mode: draftMode,
    },
    include: {
      blocks: {
        where: { hidden: false },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  // 드래프트가 없으면 당일 완료된 퀘스트 기반으로 생성
  if (!draft) {
    const completedQuests = await getCompletedQuestsForDate(userId, new Date(dateOnly));

    if (completedQuests.length === 0) {
      return null;
    }

    draft = await generateStoryDraft(userId, new Date(dateOnly), draftMode, completedQuests);
  }

  return {
    id: draft.id,
    date: format(draft.date, 'yyyy-MM-dd'),
    mode: draft.mode as DraftMode,
    title: draft.title,
    summary: draft.summary,
    blocks: draft.blocks.map((block) => ({
      id: block.id,
      block_type: block.blockType,
      order_index: block.orderIndex,
      text: block.finalText || block.generatedText,
      locked: block.locked,
      hidden: block.hidden,
      evidence_count: block.evidenceCount,
    })),
  };
}

interface CompletedQuestInfo {
  id: string;
  title: string;
  axis: string;
  tier: number;
  completedAt: Date;
  quality: string;
}

async function getCompletedQuestsForDate(
  userId: string,
  date: Date
): Promise<CompletedQuestInfo[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const completions = await prisma.completionEvent.findMany({
    where: {
      userId,
      completedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      planItem: true,
    },
    orderBy: { completedAt: 'asc' },
  });

  return completions.map((c) => ({
    id: c.planItemId,
    title: c.planItem.title,
    axis: c.planItem.axis,
    tier: c.planItem.tier,
    completedAt: c.completedAt,
    quality: c.quality,
  }));
}

async function generateStoryDraft(
  userId: string,
  date: Date,
  mode: string,
  completedQuests: CompletedQuestInfo[]
) {
  // 스토리 제목 생성 (간단한 템플릿 기반)
  const questCount = completedQuests.length;
  const dateStr = format(date, 'M월 d일');
  const title = `${dateStr}의 여정`;

  // 요약 생성
  const axisCount: Record<string, number> = {};
  completedQuests.forEach((q) => {
    axisCount[q.axis] = (axisCount[q.axis] || 0) + 1;
  });

  const axisNames: Record<string, string> = {
    body: '신체',
    focus: '집중력',
    knowledge: '지식',
    discipline: '절제',
    organization: '정리',
    social: '소셜',
  };

  const dominantAxis = Object.entries(axisCount)
    .sort((a, b) => b[1] - a[1])[0];

  const summary = `오늘 ${questCount}개의 퀘스트를 완료했습니다. ` +
    `${axisNames[dominantAxis[0]] || dominantAxis[0]} 역량이 특히 성장했습니다.`;

  // 드래프트 생성
  const draft = await prisma.storyDraft.create({
    data: {
      id: uuid(),
      userId,
      date,
      mode: mode as any,
      title,
      summary,
    },
  });

  // 블록 생성
  const blocks = [];

  // 오프닝 블록
  blocks.push(await prisma.storyBlock.create({
    data: {
      id: uuid(),
      draftId: draft.id,
      blockType: 'paragraph',
      orderIndex: 0,
      generatedText: generateOpeningText(mode, completedQuests),
      evidenceCount: 0,
    },
  }));

  // 퀘스트별 블록
  for (let i = 0; i < completedQuests.length; i++) {
    const quest = completedQuests[i];
    blocks.push(await prisma.storyBlock.create({
      data: {
        id: uuid(),
        draftId: draft.id,
        blockType: 'bullet',
        orderIndex: i + 1,
        generatedText: generateQuestText(mode, quest),
        evidenceCount: 1,
      },
    }));
  }

  // 클로징 블록
  blocks.push(await prisma.storyBlock.create({
    data: {
      id: uuid(),
      draftId: draft.id,
      blockType: 'paragraph',
      orderIndex: completedQuests.length + 1,
      generatedText: generateClosingText(mode, completedQuests),
      evidenceCount: 0,
    },
  }));

  return {
    ...draft,
    blocks,
  };
}

function generateOpeningText(mode: string, quests: CompletedQuestInfo[]): string {
  const count = quests.length;

  switch (mode) {
    case 'narrative':
      return `새로운 하루가 시작되었다. 오늘은 ${count}개의 도전이 기다리고 있었다.`;
    case 'neutral':
      return `오늘 수행한 활동 ${count}건에 대한 기록입니다.`;
    case 'professional':
      return `금일 ${count}건의 업무/활동을 완료하였습니다.`;
    default:
      return `오늘 ${count}개의 퀘스트를 수행했습니다.`;
  }
}

function generateQuestText(mode: string, quest: CompletedQuestInfo): string {
  const qualityEmoji = quest.quality === 'high' ? '⭐' : quest.quality === 'mid' ? '✓' : '○';

  switch (mode) {
    case 'narrative':
      return `${qualityEmoji} "${quest.title}" - 새로운 경험치를 얻었다.`;
    case 'neutral':
      return `${qualityEmoji} ${quest.title} (Tier ${quest.tier})`;
    case 'professional':
      return `${qualityEmoji} [완료] ${quest.title}`;
    default:
      return `${qualityEmoji} ${quest.title}`;
  }
}

function generateClosingText(mode: string, quests: CompletedQuestInfo[]): string {
  const highQualityCount = quests.filter((q) => q.quality === 'high').length;

  switch (mode) {
    case 'narrative':
      return highQualityCount > 0
        ? `오늘 하루도 성공적이었다. 특히 ${highQualityCount}개의 퀘스트에서 뛰어난 성과를 거뒀다.`
        : `오늘 하루를 무사히 마쳤다. 내일은 더 나은 하루가 될 것이다.`;
    case 'neutral':
      return `총 ${quests.length}건 완료. 고품질 완료: ${highQualityCount}건`;
    case 'professional':
      return `금일 업무 완료 현황: ${quests.length}건 (우수: ${highQualityCount}건)`;
    default:
      return `오늘의 기록이 완료되었습니다.`;
  }
}
