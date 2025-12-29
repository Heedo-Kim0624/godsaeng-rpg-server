import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import {
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
} from '../services/seriesService.js';
import { AxisEnum } from '../types/index.js';

const router = Router();

// Series Input Schema
const RuleTypeEnum = z.enum(['DAILY', 'WEEKDAYS', 'WEEKLY', 'N_PER_WEEK', 'ONCE']);

const SeriesInputSchema = z.object({
  title: z.string().min(1).max(80),
  axis: AxisEnum,
  tier_default: z.number().int().min(1).max(5),
  estimated_minutes_default: z.number().int().min(1).max(240),
  active: z.boolean(),
  rule_type: RuleTypeEnum,
  rule_json: z
    .object({
      n_per_week: z.number().int().min(1).max(7).optional(),
      selected_days: z.array(z.string()).optional(),
    })
    .optional(),
});

const SeriesUpdateSchema = SeriesInputSchema.partial();

// GET /v1/series - 시리즈 목록 조회
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await getSeries(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /v1/series - 시리즈 생성
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const parseResult = SeriesInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
    }

    const result = await createSeries(userId, parseResult.data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// PATCH /v1/series/:id - 시리즈 수정
router.patch('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const seriesId = req.params.id;

    const parseResult = SeriesUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
    }

    const result = await updateSeries(userId, seriesId, parseResult.data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE /v1/series/:id - 시리즈 삭제
router.delete('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const seriesId = req.params.id;

    await deleteSeries(userId, seriesId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
