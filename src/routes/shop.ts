import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getShopItems, purchaseItem, equipItem } from '../services/shopService.js';
import { PurchaseItemSchema, EquipItemSchema } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// GET /v1/shop/items
router.get('/items', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const axis = req.query.axis as string | undefined;
    const slot = req.query.slot as string | undefined;

    const items = await getShopItems(userId, axis, slot);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

// POST /v1/shop/purchase
router.post('/purchase', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // 요청 검증
    const parseResult = PurchaseItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
    }

    const result = await purchaseItem(userId, parseResult.data.shop_item_id, idempotencyKey);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /v1/shop/equip
router.post('/equip', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // 요청 검증
    const parseResult = EquipItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
    }

    const result = await equipItem(userId, parseResult.data.shop_item_id, parseResult.data.slot);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
