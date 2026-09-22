-- =====================================================================
-- KitPay v5 — Idempotent re-apply of v3 (multitenant) + v4 (operator names)
-- Safe to run on a DB where v3/v4 are already applied (no-op).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- v3 tables (idempotent)
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  business_type text CHECK (business_type IN ('sarl','sa','individual','association','public','autre') OR business_type IS NULL),
  rc_number text,
  nif text,
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  city text DEFAULT 'Nouakchott',
  country text DEFAULT 'MR',
  expected_phone text,
  payout_phone text,
  payout_method text,
  default_currency text DEFAULT 'MRU',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending_kyc','active','suspended','closed')),
  kyc_verified_at timestamptz,
  kyc_notes text,
  brand_color text DEFAULT '#171717',
  logo_url text,
  owner_email text NOT NULL,
  owner_password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchants_email_unique UNIQUE (owner_email)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('test','live')),
  scopes text[] NOT NULL DEFAULT ARRAY['intents.create','intents.read'],
  label text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['payment.succeeded','payment.failed','payment.expired'],
  enabled boolean NOT NULL DEFAULT true,
  last_delivered_at timestamptz,
  last_failed_at timestamptz,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  attempt int NOT NULL DEFAULT 1,
  next_retry_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','failed','expired')),
  http_status int,
  response_body text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- payment_intents extensions (idempotent)
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES merchants(id) ON DELETE RESTRICT;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS callback_url text;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'live' CHECK (mode IN ('test','live'));

-- Legacy retrofit (fresh installs: no-op).
-- If old payment_intents exist without merchant_id, rattach them to the first
-- merchant available (if any). On a brand new database this is a no-op.
DO $$
DECLARE
  v_first_merchant uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM payment_intents WHERE merchant_id IS NULL) THEN
    SELECT id INTO v_first_merchant FROM merchants ORDER BY created_at ASC LIMIT 1;
    IF v_first_merchant IS NOT NULL THEN
      UPDATE payment_intents SET merchant_id = v_first_merchant WHERE merchant_id IS NULL;
    END IF;
  END IF;
END $$;

-- Lock NOT NULL on merchant_id (only if column still nullable and no orphans left)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='payment_intents' AND column_name='merchant_id' AND is_nullable='YES'
  ) AND NOT EXISTS (SELECT 1 FROM payment_intents WHERE merchant_id IS NULL) THEN
    ALTER TABLE payment_intents ALTER COLUMN merchant_id SET NOT NULL;
  END IF;
END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(lower(owner_email));
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_merchant ON api_keys(merchant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_merchant ON webhooks(merchant_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_deliveries_pending ON webhook_deliveries(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pi_merchant ON payment_intents(merchant_id, created_at DESC);

-- Drop method CHECK first so that the legacy 'BCI Pay'/'Bimbank' UPDATEs below
-- are not blocked by the v1 constraint (which only allowed Bankily/Masrvi).
-- We match by COLUMN (not by text in def) because Postgres reformats `IN` as `= ANY`.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'payment_intents'
      AND con.contype = 'c'
      AND EXISTS (
        SELECT 1 FROM pg_attribute att
        WHERE att.attrelid = rel.oid
          AND att.attnum = ANY(con.conkey)
          AND att.attname = 'method'
      )
  LOOP
    EXECUTE format('ALTER TABLE payment_intents DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- v4: rename legacy operator names (idempotent), now safe with the constraint dropped
UPDATE payment_intents SET method = 'BIM'    WHERE method = 'Bimbank';
UPDATE payment_intents SET method = 'BCIPAY' WHERE method = 'BCI Pay';
UPDATE orphan_sms     SET parsed_method = 'BIM'    WHERE parsed_method = 'Bimbank';
UPDATE orphan_sms     SET parsed_method = 'BCIPAY' WHERE parsed_method = 'BCI Pay';

ALTER TABLE payment_intents
  ADD CONSTRAINT payment_intents_method_check
  CHECK (method IN ('Bankily', 'Masrvi', 'Sedad', 'BIM', 'Click', 'BCIPAY'));

-- Verification
SELECT
  'v5 applied' AS info,
  (SELECT count(*) FROM merchants) AS merchants_count,
  (SELECT count(*) FROM payment_intents WHERE merchant_id IS NOT NULL) AS intents_linked;
