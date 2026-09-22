-- =====================================================================
-- KitPay v4 — Migration : noms d'operateurs alignes
-- À exécuter dans Supabase SQL Editor
-- =====================================================================
--
-- Avant : "Bimbank", "BCI Pay"
-- Apres : "BIM",     "BCIPAY"
--
-- Cette migration :
-- 1. Renomme les valeurs existantes dans payment_intents et orphan_sms
-- 2. Met a jour la contrainte CHECK pour refleter les 6 operateurs corrects
-- 3. Idempotente (peut etre rejouee sans casse)
-- =====================================================================

-- 1. Mise a jour des donnees existantes
UPDATE payment_intents
   SET method = 'BIM'
 WHERE method = 'Bimbank';

UPDATE payment_intents
   SET method = 'BCIPAY'
 WHERE method = 'BCI Pay';

UPDATE orphan_sms
   SET parsed_method = 'BIM'
 WHERE parsed_method = 'Bimbank';

UPDATE orphan_sms
   SET parsed_method = 'BCIPAY'
 WHERE parsed_method = 'BCI Pay';

-- 2. Drop l'ancienne contrainte CHECK quel que soit son nom genere
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'payment_intents'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%method%IN%'
  LOOP
    EXECUTE format('ALTER TABLE payment_intents DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 3. Recreer la contrainte avec les 6 operateurs corrects
ALTER TABLE payment_intents
  ADD CONSTRAINT payment_intents_method_check
  CHECK (method IN ('Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click', 'BCIPAY'));

-- 4. Verification (optionnelle — affiche le decompte par operateur)
-- SELECT method, count(*) FROM payment_intents GROUP BY method ORDER BY method;
