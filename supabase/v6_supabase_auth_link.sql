-- =====================================================================
-- KitPay v6 — Lien Supabase Auth + plan + kyc_documents
-- =====================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS plan_id uuid;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS kyc_documents jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_merchants_owner_user ON merchants(owner_user_id);

SELECT 'v6 applied' AS info;
