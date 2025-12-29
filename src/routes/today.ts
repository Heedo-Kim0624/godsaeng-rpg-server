import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getTodayPlan } from '../services/todayService.js';

const router = Router();

// GET /v1/today - 오늘의 플랜 조회
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const date = req.query.date as string | undefined;

    const result = await getTodayPlan(userId, date);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
