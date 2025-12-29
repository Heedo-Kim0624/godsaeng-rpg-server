import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Routes
import todayRouter from './routes/today.js';
import planItemsRouter from './routes/planItems.js';
import shopRouter from './routes/shop.js';
import storyRouter from './routes/story.js';
import authRouter from './routes/auth.js';
import seriesRouter from './routes/series.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/v1/auth', authRouter);
app.use('/v1/today', todayRouter);
app.use('/v1/plan/items', planItemsRouter);
app.use('/v1/shop', shopRouter);
app.use('/v1/drafts/story', storyRouter);
app.use('/v1/series', seriesRouter);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎮 갓생RPG Server is running!                           ║
║                                                           ║
║   Local:   http://localhost:${PORT}                         ║
║   Health:  http://localhost:${PORT}/health                  ║
║                                                           ║
║   API Endpoints:                                          ║
║   - GET  /v1/today              오늘의 플랜 조회          ║
║   - POST /v1/plan/items/:id/complete  퀘스트 완료         ║
║   - PATCH /v1/plan/items/:id    퀘스트 수정               ║
║   - GET  /v1/shop/items         상점 아이템 목록          ║
║   - POST /v1/shop/purchase      아이템 구매               ║
║   - POST /v1/shop/equip         아이템 장착               ║
║   - GET  /v1/drafts/story       스토리 드래프트           ║
║   - GET  /v1/series             시리즈 목록               ║
║   - POST /v1/series             시리즈 생성               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
