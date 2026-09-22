-- =====================================================================
-- KitPay v9 — Multi-tel par opérateur, par marchand
-- =====================================================================

CREATE TABLE IF NOT EXISTS merchant_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('Bankily','Masrvi','Sedad','BIM','Click','BCIPAY')),
  expected_phone text NOT NULL,
  label text,
  enabled boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A given (method, phone) couple can only be linked to one ENABLED operator (avoid matching ambiguity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_operators_method_phone_enabled
  ON merchant_operators(method, expected_phone)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_merchant_operators_merchant
  ON merchant_operators(merchant_id);

-- Migrate legacy expected_phone from merchants to merchant_operators
-- For each merchant with a non-null expected_phone, create a Bankily entry as default.
-- The merchant can later add other operators in dashboard.
INSERT INTO merchant_operators (merchant_id, method, expected_phone, label, enabled, verified_at)
SELECT id, 'Bankily', expected_phone, 'Auto-migrated (Bankily)', true, now()
FROM merchants
WHERE expected_phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM merchant_operators mo
    WHERE mo.merchant_id = merchants.id
      AND mo.method = 'Bankily'
      AND mo.expected_phone = merchants.expected_phone
  );

SELECT 'v9 applied' AS info,
  (SELECT count(*) FROM merchant_operators) AS operators_count;
