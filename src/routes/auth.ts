import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import prisma from '../db/client.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { ensureUserSnapshots } from '../services/todayService.js';
import { createError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).max(40),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /v1/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
    }

    const { email, password, display_name } = parseResult.data;

    // 이메일 중복 체크
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 유저 생성 (password는 별도 테이블 또는 필드로 관리 필요 - 여기서는 간소화)
    const userId = uuid();
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        status: 'active',
      },
    });

    // 프로필 생성
    await prisma.profile.create({
      data: {
        userId,
        displayName: display_name,
        timeBudgetMinutes: 60, // 기본값 1시간
      },
    });

    // 스냅샷 초기화
    await ensureUserSnapshots(userId);

    // 토큰 생성
    const token = generateToken({ userId: user.id, email: user.email || undefined });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        display_name,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// POST /v1/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError('Invalid request body', 400, 'VALIDATION_ERROR', parseResult.error.errors);
    }

    const { email, password } = parseResult.data;

    // 유저 조회
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // 실제 구현에서는 password_hash 필드를 별도로 관리해야 함
    // 여기서는 간소화된 예시

    // 토큰 생성
    const token = generateToken({ userId: user.id, email: user.email || undefined });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.profile?.displayName || 'User',
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// GET /v1/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw createError('User not found', 404, 'NOT_FOUND');
    }

    res.json({
      id: user.id,
      email: user.email,
      display_name: user.profile?.displayName || 'User',
      timezone: user.profile?.timezone || 'Asia/Seoul',
      time_budget_minutes: user.profile?.timeBudgetMinutes || 60,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
