-- CreateEnum
CREATE TYPE "Axis" AS ENUM ('body', 'focus', 'knowledge', 'discipline', 'organization', 'social');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('todo', 'done', 'skipped');

-- CreateEnum
CREATE TYPE "PlanItemSource" AS ENUM ('system', 'series', 'user');

-- CreateEnum
CREATE TYPE "Quality" AS ENUM ('low', 'mid', 'high');

-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('app', 'notification', 'widget', 'unknown');

-- CreateEnum
CREATE TYPE "DraftMode" AS ENUM ('narrative', 'neutral', 'professional');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('gold', 'diamond');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('common', 'rare', 'epic');

-- CreateEnum
CREATE TYPE "CosmeticSlot" AS ENUM ('head', 'face', 'body', 'legs', 'back', 'accessory');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKLY', 'N_PER_WEEK', 'ONCE');

-- CreateEnum
CREATE TYPE "EditType" AS ENUM ('replace', 'lock', 'unlock', 'hide', 'unhide');

-- CreateEnum
CREATE TYPE "EnergyPattern" AS ENUM ('morning', 'noon', 'evening', 'night', 'unknown');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('health', 'study', 'career', 'finance', 'relationship', 'organization', 'mindset', 'selfcare');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('morning', 'afternoon', 'evening', 'night', 'any');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" TEXT NOT NULL,
    "display_name" VARCHAR(40) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "time_budget_minutes" INTEGER NOT NULL,
    "quiet_hours" JSONB,
    "energy_pattern" "EnergyPattern" NOT NULL DEFAULT 'unknown',
    "resume_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "axis" "Axis" NOT NULL,
    "metric" VARCHAR(80),
    "target_value" VARCHAR(40),
    "priority" SMALLINT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "why_chains" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "why1" TEXT NOT NULL,
    "why2" TEXT,
    "why3" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "why_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "axis_scores_snapshot" (
    "user_id" TEXT NOT NULL,
    "body" INTEGER NOT NULL DEFAULT 0,
    "focus" INTEGER NOT NULL DEFAULT 0,
    "knowledge" INTEGER NOT NULL DEFAULT 0,
    "discipline" INTEGER NOT NULL DEFAULT 0,
    "organization" INTEGER NOT NULL DEFAULT 0,
    "social" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "axis_scores_snapshot_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "progress_snapshot" (
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "exp_to_next" INTEGER NOT NULL DEFAULT 100,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_snapshot_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "wallet_snapshot" (
    "user_id" TEXT NOT NULL,
    "gold" BIGINT NOT NULL DEFAULT 0,
    "diamond" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_snapshot_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "quest_templates" (
    "id" TEXT NOT NULL,
    "seed_id" VARCHAR(40) NOT NULL,
    "axis" "Axis" NOT NULL,
    "goal_type" "GoalType" NOT NULL,
    "time_of_day" "TimeOfDay" NOT NULL,
    "tier" SMALLINT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "description" VARCHAR(140) NOT NULL,
    "estimated_minutes" SMALLINT NOT NULL,
    "why_prompt" VARCHAR(120) NOT NULL,
    "success_criteria" VARCHAR(120) NOT NULL,
    "base_gold" INTEGER NOT NULL,
    "base_exp" INTEGER NOT NULL,
    "axis_delta" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quest_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "generated_from" TEXT NOT NULL DEFAULT 'onboarding',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "source" "PlanItemSource" NOT NULL,
    "template_id" TEXT,
    "series_id" TEXT,
    "axis" "Axis" NOT NULL,
    "goal_id" TEXT,
    "title" VARCHAR(80) NOT NULL,
    "description" VARCHAR(140),
    "tier" SMALLINT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "estimated_minutes" SMALLINT NOT NULL DEFAULT 15,
    "status" "ItemStatus" NOT NULL DEFAULT 'todo',
    "locked_by_user" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_item_overrides" (
    "id" TEXT NOT NULL,
    "plan_item_id" TEXT NOT NULL,
    "apply_scope" TEXT NOT NULL,
    "override_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_item_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completion_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_item_id" TEXT NOT NULL,
    "plan_date" DATE NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" SMALLINT NOT NULL DEFAULT 0,
    "quality" "Quality" NOT NULL DEFAULT 'mid',
    "client_source" "ClientSource" NOT NULL DEFAULT 'app',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(120) NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_hash" CHAR(64),
    "completion_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "reward_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "completion_event_id" TEXT NOT NULL,
    "gold_delta" INTEGER NOT NULL,
    "diamond_delta" INTEGER NOT NULL,
    "exp_delta" INTEGER NOT NULL,
    "axis_delta" JSONB NOT NULL DEFAULT '{}',
    "levelup" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "axis_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "axis" "Axis" NOT NULL,
    "delta" INTEGER NOT NULL,
    "value_after" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "axis_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exp_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "exp_after" INTEGER,
    "level_after" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exp_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "axis" "Axis" NOT NULL,
    "goal_id" TEXT,
    "tier_default" SMALLINT NOT NULL,
    "estimated_minutes_default" SMALLINT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "rule_type" "RuleType" NOT NULL,
    "rule_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_generation_log" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "generated_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_generation_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mode" "DraftMode" NOT NULL DEFAULT 'narrative',
    "title" VARCHAR(80) NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_blocks" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "block_type" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "generated_text" TEXT NOT NULL,
    "final_text" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "evidence_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_block_edits" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "edit_type" "EditType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_block_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_links" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "completion_event_id" TEXT NOT NULL,
    "plan_item_id" TEXT NOT NULL,
    "weight" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_items" (
    "id" TEXT NOT NULL,
    "axis" "Axis",
    "slot" "CosmeticSlot" NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(140) NOT NULL,
    "price_currency" "Currency" NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "unlock_rule" JSONB,
    "asset_ref" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shop_item_id" TEXT NOT NULL,
    "owned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipped_items" (
    "user_id" TEXT NOT NULL,
    "slot" "CosmeticSlot" NOT NULL,
    "shop_item_id" TEXT NOT NULL,
    "equipped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipped_items_pkey" PRIMARY KEY ("user_id","slot")
);

-- CreateTable
CREATE TABLE "purchase_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shop_item_id" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" INTEGER NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "failure_reason" VARCHAR(80),

    CONSTRAINT "purchase_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "why_chains_goal_id_idx" ON "why_chains"("goal_id");

-- CreateIndex
CREATE INDEX "quest_templates_axis_tier_time_of_day_goal_type_idx" ON "quest_templates"("axis", "tier", "time_of_day", "goal_type");

-- CreateIndex
CREATE UNIQUE INDEX "quest_templates_seed_id_tier_key" ON "quest_templates"("seed_id", "tier");

-- CreateIndex
CREATE INDEX "plans_user_id_date_idx" ON "plans"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "plans_user_id_date_key" ON "plans"("user_id", "date");

-- CreateIndex
CREATE INDEX "plan_items_plan_id_sort_order_idx" ON "plan_items"("plan_id", "sort_order");

-- CreateIndex
CREATE INDEX "plan_items_status_idx" ON "plan_items"("status");

-- CreateIndex
CREATE INDEX "plan_items_series_id_idx" ON "plan_items"("series_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_item_overrides_plan_item_id_key" ON "plan_item_overrides"("plan_item_id");

-- CreateIndex
CREATE INDEX "completion_events_user_id_completed_at_idx" ON "completion_events"("user_id", "completed_at");

-- CreateIndex
CREATE INDEX "completion_events_plan_item_id_idx" ON "completion_events"("plan_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_completion_event_id_key" ON "idempotency_keys"("completion_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "reward_events_completion_event_id_key" ON "reward_events"("completion_event_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_user_id_created_at_idx" ON "wallet_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "axis_ledger_user_id_axis_created_at_idx" ON "axis_ledger"("user_id", "axis", "created_at");

-- CreateIndex
CREATE INDEX "exp_ledger_user_id_created_at_idx" ON "exp_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "series_user_id_active_idx" ON "series"("user_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "series_generation_log_series_id_date_key" ON "series_generation_log"("series_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "story_drafts_user_id_date_mode_key" ON "story_drafts"("user_id", "date", "mode");

-- CreateIndex
CREATE INDEX "story_blocks_draft_id_order_index_idx" ON "story_blocks"("draft_id", "order_index");

-- CreateIndex
CREATE INDEX "evidence_links_block_id_idx" ON "evidence_links"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_user_id_shop_item_id_key" ON "inventory"("user_id", "shop_item_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "why_chains" ADD CONSTRAINT "why_chains_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "axis_scores_snapshot" ADD CONSTRAINT "axis_scores_snapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_snapshot" ADD CONSTRAINT "progress_snapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_snapshot" ADD CONSTRAINT "wallet_snapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "quest_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item_overrides" ADD CONSTRAINT "plan_item_overrides_plan_item_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_events" ADD CONSTRAINT "completion_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_events" ADD CONSTRAINT "completion_events_plan_item_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_completion_event_id_fkey" FOREIGN KEY ("completion_event_id") REFERENCES "completion_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_events" ADD CONSTRAINT "reward_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_events" ADD CONSTRAINT "reward_events_completion_event_id_fkey" FOREIGN KEY ("completion_event_id") REFERENCES "completion_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "axis_ledger" ADD CONSTRAINT "axis_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exp_ledger" ADD CONSTRAINT "exp_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_generation_log" ADD CONSTRAINT "series_generation_log_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_drafts" ADD CONSTRAINT "story_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_blocks" ADD CONSTRAINT "story_blocks_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "story_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_block_edits" ADD CONSTRAINT "story_block_edits_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "story_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "story_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_completion_event_id_fkey" FOREIGN KEY ("completion_event_id") REFERENCES "completion_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_plan_item_id_fkey" FOREIGN KEY ("plan_item_id") REFERENCES "plan_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_events" ADD CONSTRAINT "purchase_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_events" ADD CONSTRAINT "purchase_events_shop_item_id_fkey" FOREIGN KEY ("shop_item_id") REFERENCES "shop_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
