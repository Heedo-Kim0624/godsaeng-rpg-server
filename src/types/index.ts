import { z } from 'zod';

// ========= Enums =========
export const AxisEnum = z.enum(['body', 'focus', 'knowledge', 'discipline', 'organization', 'social']);
export type Axis = z.infer<typeof AxisEnum>;

export const ItemStatusEnum = z.enum(['todo', 'done', 'skipped']);
export type ItemStatus = z.infer<typeof ItemStatusEnum>;

export const QualityEnum = z.enum(['low', 'mid', 'high']);
export type Quality = z.infer<typeof QualityEnum>;

export const ClientSourceEnum = z.enum(['app', 'notification', 'widget', 'unknown']);
export type ClientSource = z.infer<typeof ClientSourceEnum>;

export const DraftModeEnum = z.enum(['narrative', 'neutral', 'professional']);
export type DraftMode = z.infer<typeof DraftModeEnum>;

export const CurrencyEnum = z.enum(['gold', 'diamond']);
export type Currency = z.infer<typeof CurrencyEnum>;

export const RarityEnum = z.enum(['common', 'rare', 'epic']);
export type Rarity = z.infer<typeof RarityEnum>;

export const CosmeticSlotEnum = z.enum(['head', 'face', 'body', 'legs', 'back', 'accessory']);
export type CosmeticSlot = z.infer<typeof CosmeticSlotEnum>;

// ========= Request/Response Types =========
export const CompleteQuestSchema = z.object({
  quality: QualityEnum.optional().default('mid'),
  duration_minutes: z.number().int().min(0).max(480).optional().default(0),
  client_source: ClientSourceEnum.optional().default('app'),
});
export type CompleteQuestRequest = z.infer<typeof CompleteQuestSchema>;

export const UpdatePlanItemSchema = z.object({
  title: z.string().max(80).optional(),
  axis: AxisEnum.optional(),
  tier: z.number().int().min(1).max(5).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  estimated_minutes: z.number().int().min(1).max(240).optional(),
  apply_scope: z.enum(['today_only']).optional(),
});
export type UpdatePlanItemRequest = z.infer<typeof UpdatePlanItemSchema>;

export const PurchaseItemSchema = z.object({
  shop_item_id: z.string().uuid(),
});
export type PurchaseItemRequest = z.infer<typeof PurchaseItemSchema>;

export const EquipItemSchema = z.object({
  shop_item_id: z.string().uuid(),
  slot: CosmeticSlotEnum,
});
export type EquipItemRequest = z.infer<typeof EquipItemSchema>;

// ========= Response Types =========
export interface AxisScores {
  body: number;
  focus: number;
  knowledge: number;
  discipline: number;
  organization: number;
  social: number;
}

export interface Progress {
  level: number;
  exp: number;
  exp_to_next: number;
}

export interface Wallet {
  gold: number;
  diamond: number;
}

export interface PlanItemResponse {
  id: string;
  source: string;
  axis: Axis;
  title: string;
  description: string | null;
  tier: number;
  scheduled_at: string | null;
  estimated_minutes: number;
  status: ItemStatus;
  locked_by_user: boolean;
  sort_order: number;
}

export interface TodayResponse {
  plan_id: string;
  date: string;
  axis_scores: AxisScores;
  progress: Progress;
  wallet: Wallet;
  items: PlanItemResponse[];
  story_summary: string | null;
}

export interface RewardResponse {
  gold_delta: number;
  diamond_delta: number;
  exp_delta: number;
  axis_delta: Record<string, number>;
  levelup: boolean;
  new_progress: Progress;
  new_wallet: Wallet;
  new_axis_scores: AxisScores;
}

export interface CompleteResponse {
  completion_event_id: string;
  completed_at: string;
  reward: RewardResponse;
}

export interface ShopItemResponse {
  id: string;
  axis: Axis | null;
  slot: CosmeticSlot;
  rarity: Rarity;
  name: string;
  description: string;
  price_currency: Currency;
  price_amount: number;
  owned: boolean;
  equipped: boolean;
}

export interface StoryBlockResponse {
  id: string;
  block_type: string;
  order_index: number;
  text: string;
  locked: boolean;
  hidden: boolean;
  evidence_count: number;
}

export interface StoryDraftResponse {
  id: string;
  date: string;
  mode: DraftMode;
  title: string;
  summary: string;
  blocks: StoryBlockResponse[];
}

// ========= JWT Payload =========
export interface JwtPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}
