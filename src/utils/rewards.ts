import { Quality, Axis, AxisScores } from '../types/index.js';

// 품질에 따른 보상 배율
const QUALITY_MULTIPLIERS: Record<Quality, number> = {
  low: 0.5,
  mid: 1.0,
  high: 1.5,
};

// 티어별 기본 보상
const TIER_BASE_REWARDS = {
  gold: [10, 25, 50, 100, 200],
  exp: [5, 15, 30, 60, 120],
  axis: [1, 2, 4, 8, 15],
};

// 레벨업에 필요한 경험치 계산
export function getExpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

export interface RewardCalculation {
  goldDelta: number;
  diamondDelta: number;
  expDelta: number;
  axisDelta: Partial<Record<Axis, number>>;
}

export function calculateRewards(
  tier: number,
  quality: Quality,
  axis: Axis
): RewardCalculation {
  const tierIndex = Math.min(Math.max(tier - 1, 0), 4);
  const multiplier = QUALITY_MULTIPLIERS[quality];

  const goldDelta = Math.floor(TIER_BASE_REWARDS.gold[tierIndex] * multiplier);
  const expDelta = Math.floor(TIER_BASE_REWARDS.exp[tierIndex] * multiplier);
  const axisDelta = { [axis]: Math.floor(TIER_BASE_REWARDS.axis[tierIndex] * multiplier) };

  return {
    goldDelta,
    diamondDelta: 0, // 다이아몬드는 특별 이벤트에서만 지급
    expDelta,
    axisDelta,
  };
}

export function applyAxisDelta(
  current: AxisScores,
  delta: Partial<Record<Axis, number>>
): AxisScores {
  return {
    body: current.body + (delta.body || 0),
    focus: current.focus + (delta.focus || 0),
    knowledge: current.knowledge + (delta.knowledge || 0),
    discipline: current.discipline + (delta.discipline || 0),
    organization: current.organization + (delta.organization || 0),
    social: current.social + (delta.social || 0),
  };
}

export function processLevelUp(
  currentExp: number,
  currentLevel: number,
  expDelta: number
): { newExp: number; newLevel: number; expToNext: number; leveledUp: boolean } {
  let exp = currentExp + expDelta;
  let level = currentLevel;
  let leveledUp = false;
  let expToNext = getExpToNextLevel(level);

  while (exp >= expToNext) {
    exp -= expToNext;
    level++;
    leveledUp = true;
    expToNext = getExpToNextLevel(level);
  }

  return { newExp: exp, newLevel: level, expToNext, leveledUp };
}
