import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getStoryDraft } from '../services/storyService.js';
import { DraftModeEnum } from '../types/index.js';

const router = Router();

// GET /v1/drafts/story
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const date = req.query.date as string | undefined;
    const mode = req.query.mode as string | undefined;

    // mode 검증
    const modeResult = DraftModeEnum.safeParse(mode || 'narrative');
    const validMode = modeResult.success ? modeResult.data : 'narrative';

    const result = await getStoryDraft(userId, date, validMode);

    if (!result) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'No story draft found for this date. Complete some quests first.',
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
