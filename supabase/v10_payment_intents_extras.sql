-- =====================================================================
-- KitPay v10 — Extensions de payment_intents pour API publique
-- =====================================================================

ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS success_url text;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS cancel_url text;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS merchant_operator_id uuid REFERENCES merchant_operators(id) ON DELETE SET NULL;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS client_secret text;

-- Backfill success_url from legacy callback_url (if any)
UPDATE payment_intents
SET success_url = callback_url
WHERE success_url IS NULL AND callback_url IS NOT NULL;

-- Generate client_secret for existing rows (kpcs_<32 hex chars>)
UPDATE payment_intents
SET client_secret = 'kpcs_' || encode(gen_random_bytes(16), 'hex')
WHERE client_secret IS NULL;

-- UNIQUE(merchant_id, idempotency_key) — partial because key can be null
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_idempotency
  ON payment_intents(merchant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Match Tier 1/2 indexes (refined for multi-tenant)
CREATE INDEX IF NOT EXISTS idx_pi_match_tier1
  ON payment_intents(amount, expected_phone, merchant_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pi_match_tier2
  ON payment_intents(amount, method, merchant_id, status)
  WHERE status = 'pending';

SELECT 'v10 applied' AS info,
  (SELECT count(*) FROM payment_intents WHERE client_secret IS NOT NULL) AS intents_with_secret;
