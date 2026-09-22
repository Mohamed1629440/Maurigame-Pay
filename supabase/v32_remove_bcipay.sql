-- =====================================================================
-- KitPay v32 — Suppression BCIPAY comme mode de paiement
-- - Retire BCIPAY du CHECK constraint sur payment_intents et orphan_sms
-- - Retire BCIPAY du CHECK sur merchant_operators
-- - Supprime les operator BCIPAY existants (sera orphan sinon)
-- =====================================================================

-- 1. Mettre a jour le CHECK constraint sur payment_intents
ALTER TABLE payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_method_check;

ALTER TABLE payment_intents
  ADD CONSTRAINT payment_intents_method_check
  CHECK (method IN ('Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click'));

-- 2. Mettre a jour le CHECK constraint sur merchant_operators
ALTER TABLE merchant_operators
  DROP CONSTRAINT IF EXISTS merchant_operators_method_check;

ALTER TABLE merchant_operators
  ADD CONSTRAINT merchant_operators_method_check
  CHECK (method IN ('Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click'));

-- 3. Supprimer les operators BCIPAY (ne peuvent plus etre utilises)
DELETE FROM merchant_operators WHERE method = 'BCIPAY';

-- 4. Verification
SELECT 'v32 BCIPAY supprime' AS info;
SELECT method, count(*) FROM merchant_operators GROUP BY method ORDER BY method;
