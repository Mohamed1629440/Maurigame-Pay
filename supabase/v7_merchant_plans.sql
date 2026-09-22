-- =====================================================================
-- KitPay v7 — Plans (freemium tiers)
-- =====================================================================

CREATE TABLE IF NOT EXISTS merchant_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  monthly_fee_mru int NOT NULL DEFAULT 0,
  included_transactions int,
  transaction_fee_mru int NOT NULL DEFAULT 0,
  rate_limit_per_min int NOT NULL DEFAULT 60,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed plan free (idempotent)
INSERT INTO merchant_plans (code, name, monthly_fee_mru, included_transactions, transaction_fee_mru, rate_limit_per_min, features)
VALUES (
  'free',
  'Free',
  0,
  NULL,
  0,
  120,
  '{"webhooks": true, "test_mode": true, "live_mode": true, "max_api_keys": 10, "max_webhooks": 5, "max_pending_intents": 100}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- Add FK on merchants.plan_id (cannot be added in v6 because table didn't exist yet)
ALTER TABLE merchants
  DROP CONSTRAINT IF EXISTS merchants_plan_id_fkey;
ALTER TABLE merchants
  ADD CONSTRAINT merchants_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES merchant_plans(id) ON DELETE SET NULL;

-- Backfill all merchants to plan_free
UPDATE merchants
SET plan_id = (SELECT id FROM merchant_plans WHERE code='free')
WHERE plan_id IS NULL;

SELECT 'v7 applied' AS info,
  (SELECT count(*) FROM merchant_plans) AS plans_count,
  (SELECT count(*) FROM merchants WHERE plan_id IS NOT NULL) AS merchants_with_plan;
