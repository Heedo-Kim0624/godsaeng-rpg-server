import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { completeQuest } from '../services/completionService.js';
import { updatePlanItem, skipPlanItem, deletePlanItem } from '../services/planItemService.js';
import { CompleteQuestSchema, UpdatePlanItemSchema } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// POST /v1/plan/items/:id/complete
router.post(
  '/:id/complete',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const planItemId = req.params.id;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      // 요청 검증
      const parseResult = CompleteQuestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
      }

      const result = await completeQuest(userId, planItemId, parseResult.data, idempotencyKey);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /v1/plan/items/:id
router.patch(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const planItemId = req.params.id;

      // 요청 검증
      const parseResult = UpdatePlanItemSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
      }

      const result = await updatePlanItem(userId, planItemId, parseResult.data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /v1/plan/items/:id/skip
router.post(
  '/:id/skip',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const planItemId = req.params.id;

      const result = await skipPlanItem(userId, planItemId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /v1/plan/items/:id
router.delete(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const planItemId = req.params.id;

      await deletePlanItem(userId, planItemId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
