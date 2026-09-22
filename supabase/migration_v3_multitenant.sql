-- =====================================================================
-- KitPay v3 - Multi-tenancy
-- =====================================================================
-- Turns KitPay from a single-merchant POC into a multi-merchant platform.
--   - Each merchant has its own account, API keys and webhooks
--   - Payments are isolated per merchant (RLS enforced from v14)
--   - After migration, create your first merchant via the /signup and
--     /onboarding flow in the UI (no seed data is inserted here).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============ 1. Marchands ============
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identite
  name text NOT NULL,                       -- Nom commercial affiche au client
  legal_name text,                          -- Raison sociale officielle
  business_type text CHECK (business_type IN ('sarl','sa','individual','association','public','autre') OR business_type IS NULL),
  rc_number text,                           -- Numero Registre de Commerce
  nif text,                                 -- Numero Identification Fiscale

  -- Contact
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  city text DEFAULT 'Nouakchott',
  country text DEFAULT 'MR',

  -- Configuration paiement
  expected_phone text,                      -- Numero du tel marchand qui recoit les SMS
  payout_phone text,                        -- Numero pour les versements (futur)
  payout_method text,
  default_currency text DEFAULT 'MRU',

  -- Statut
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending_kyc','active','suspended','closed')),
  kyc_verified_at timestamptz,
  kyc_notes text,

  -- Branding
  brand_color text DEFAULT '#171717',
  logo_url text,

  -- Auth (lien vers users si on veut)
  owner_email text NOT NULL,
  owner_password_hash text,                 -- bcrypt

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT merchants_email_unique UNIQUE (owner_email)
);

CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(lower(owner_email));
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);

ALTER TABLE merchants DISABLE ROW LEVEL SECURITY;

-- ============ 2. API keys ============
-- Format : kp_{mode}_{32 chars}
-- Mode = test (sandbox, ne touche pas l'argent reel) ou live (production)
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  -- Cle (hashee au repos, le prefixe affichable cote dashboard)
  key_prefix text NOT NULL,                 -- ex: "kp_live_aBcD" pour identifier sans exposer
  key_hash text NOT NULL,                   -- sha256 de la cle complete

  -- Mode
  mode text NOT NULL CHECK (mode IN ('test','live')),

  -- Permissions (futur fine-grained)
  scopes text[] NOT NULL DEFAULT ARRAY['intents.create','intents.read'],

  -- Etat
  label text,                               -- "Production server", "CI", etc.
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_merchant ON api_keys(merchant_id);

ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- ============ 3. Webhooks sortants ============
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  url text NOT NULL,                        -- URL du marchand qui recoit
  secret text NOT NULL,                     -- HMAC SHA-256 secret
  events text[] NOT NULL DEFAULT ARRAY['payment.succeeded','payment.failed','payment.expired'],
  enabled boolean NOT NULL DEFAULT true,

  -- Stats
  last_delivered_at timestamptz,
  last_failed_at timestamptz,
  failure_count int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_merchant ON webhooks(merchant_id) WHERE enabled = true;

ALTER TABLE webhooks DISABLE ROW LEVEL SECURITY;

-- ============ 4. Webhook deliveries (log + retry) ============
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  event_type text NOT NULL,
  payload jsonb NOT NULL,

  -- Tentatives
  attempt int NOT NULL DEFAULT 1,
  next_retry_at timestamptz,

  -- Resultat
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','delivered','failed','expired')),
  http_status int,
  response_body text,
  delivered_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_pending
  ON webhook_deliveries(next_retry_at)
  WHERE status = 'pending';

ALTER TABLE webhook_deliveries DISABLE ROW LEVEL SECURITY;

-- ============ 5. Refonte payment_intents : ajout merchant_id ============
ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES merchants(id) ON DELETE RESTRICT;

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS customer_phone text;     -- numero du client final (si different de expected_phone)

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS description text;        -- libre, affiche au client

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS callback_url text;       -- URL ou rediriger apres paiement (success page)

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'live'
  CHECK (mode IN ('test','live'));

CREATE INDEX IF NOT EXISTS idx_pi_merchant ON payment_intents(merchant_id, created_at DESC);

-- ============ 6. Legacy retrofit (fresh installs: no-op) ============
-- On a brand new database this block does nothing because payment_intents
-- is empty. Kept for backward compatibility with pre-multitenant deployments.
DO $$
DECLARE
  v_orphan_count int;
  v_first_merchant uuid;
BEGIN
  SELECT count(*) INTO v_orphan_count FROM payment_intents WHERE merchant_id IS NULL;
  IF v_orphan_count > 0 THEN
    SELECT id INTO v_first_merchant FROM merchants ORDER BY created_at ASC LIMIT 1;
    IF v_first_merchant IS NOT NULL THEN
      UPDATE payment_intents SET merchant_id = v_first_merchant WHERE merchant_id IS NULL;
      RAISE NOTICE 'Retrofitted % legacy payment_intents to merchant %', v_orphan_count, v_first_merchant;
    END IF;
  END IF;
END $$;

-- Lock the column: from now on every payment_intent must belong to a merchant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_intents' AND column_name = 'merchant_id' AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM payment_intents WHERE merchant_id IS NULL) THEN
    ALTER TABLE payment_intents ALTER COLUMN merchant_id SET NOT NULL;
  END IF;
END $$;

-- ============ 7. Refonte match_payment pour etre multi-tenant ============
-- Le SMS arrive avec : amount, sender_phone, method
-- On cherche dans les intents du marchand qui correspond a expected_phone (= tel marchand)
CREATE OR REPLACE FUNCTION match_payment_v3(
  p_amount integer,
  p_sender_phone text,         -- phone du payeur
  p_method text,
  p_merchant_phone text,       -- phone du marchand qui a recu le SMS (= expected_phone du marchand)
  p_raw_sms text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_merchant_id uuid;
  v_intent payment_intents%ROWTYPE;
  v_count int;
  v_orphan_id uuid;
BEGIN
  -- 1. Identifier le marchand par son tel
  SELECT id INTO v_merchant_id
  FROM merchants
  WHERE expected_phone = p_merchant_phone
    AND status = 'active';

  IF v_merchant_id IS NULL THEN
    -- SMS arrive sur un tel non rattache : orphan global
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
    VALUES (p_raw_sms, p_amount, p_sender_phone, p_method)
    RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object('matched', false, 'tier', 4, 'reason', 'unknown_merchant', 'orphan_id', v_orphan_id);
  END IF;

  -- 2. Tier 1 : phone client + amount + method match
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE merchant_id = v_merchant_id
    AND amount = p_amount
    AND expected_phone = p_sender_phone   -- (le client a saisi son numero a l'avance)
    AND method = p_method
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE payment_intents
    SET status='paid', matched_tier=1, actual_sender_phone=p_sender_phone,
        sms_received=p_raw_sms, paid_at=now()
    WHERE ref = v_intent.ref;
    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_merchant_id);
  END IF;

  -- 3. Tier 2 : amount + method, FIFO si plusieurs candidats
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE merchant_id = v_merchant_id
    AND amount = p_amount
    AND method = p_method
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE payment_intents
    SET status='paid', matched_tier=2, actual_sender_phone=p_sender_phone,
        sms_received=p_raw_sms, paid_at=now()
    WHERE ref = v_intent.ref;
    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_merchant_id);
  END IF;

  -- 4. Tier 3 : orphan pour ce marchand
  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
  VALUES (p_raw_sms, p_amount, p_sender_phone, p_method)
  RETURNING id INTO v_orphan_id;

  RETURN jsonb_build_object('matched', false, 'tier', 3, 'merchant_id', v_merchant_id, 'orphan_id', v_orphan_id);
END;
$$;

-- ============ 8. Helper : verifier une API key ============
CREATE OR REPLACE FUNCTION verify_api_key(p_key text)
RETURNS TABLE(merchant_id uuid, mode text, scopes text[])
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT k.merchant_id, k.mode, k.scopes
  FROM api_keys k
  WHERE k.key_hash = encode(digest(p_key, 'sha256'), 'hex')
    AND k.revoked_at IS NULL
  LIMIT 1;

  -- Met a jour last_used_at si trouve
  UPDATE api_keys
  SET last_used_at = now()
  WHERE key_hash = encode(digest(p_key, 'sha256'), 'hex')
    AND revoked_at IS NULL;
END;
$$;

-- ============ Verification ============
SELECT 'KitPay v4 multi-tenant migration applied' AS info,
       (SELECT count(*) FROM merchants) AS merchants_count,
       (SELECT count(*) FROM payment_intents WHERE merchant_id IS NOT NULL) AS intents_linked;
