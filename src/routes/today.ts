import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// Mock 데이터 (프론트엔드 TodayResponse 형식에 맞춤)
const mockTodayResponse = {
  plan_id: 'plan-001',
  date: new Date().toISOString().split('T')[0],
  axis_scores: {
    body: 15,
    focus: 12,
    knowledge: 18,
    discipline: 10,
    organization: 8,
    social: 14,
  },
  progress: {
    level: 5,
    exp: 1250,
    exp_to_next: 2000,
  },
  wallet: {
    gold: 500,
    diamond: 10,
  },
  items: [
    {
      id: 'plan-1',
      source: 'series',
      axis: 'body',
      title: '아침 운동 30분',
      description: '건강한 하루의 시작!',
      tier: 2,
      scheduled_at: '08:00',
      estimated_minutes: 30,
      status: 'todo',
      locked_by_user: false,
      sort_order: 1,
    },
    {
      id: 'plan-2',
      source: 'manual',
      axis: 'knowledge',
      title: '독서 1시간',
      description: '지식을 쌓는 시간',
      tier: 2,
      scheduled_at: '10:00',
      estimated_minutes: 60,
      status: 'todo',
      locked_by_user: false,
      sort_order: 2,
    },
    {
      id: 'plan-3',
      source: 'manual',
      axis: 'focus',
      title: '코딩 공부',
      description: '집중력 향상 퀘스트',
      tier: 3,
      scheduled_at: '14:00',
      estimated_minutes: 90,
      status: 'done',
      locked_by_user: false,
      sort_order: 3,
    },
    {
      id: 'plan-4',
      source: 'manual',
      axis: 'social',
      title: '친구 만나기',
      description: '소셜 능력치 업!',
      tier: 1,
      scheduled_at: '18:00',
      estimated_minutes: 120,
      status: 'todo',
      locked_by_user: false,
      sort_order: 4,
    },
  ],
  story_summary: '오늘의 모험이 시작되었습니다. 코딩 공부를 완료하며 집중력이 향상되었습니다!',
};

// GET /v1/today - Mock 데이터 반환 (인증 없이)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(mockTodayResponse);
  } catch (error) {
    next(error);
  }
});

export default router;
