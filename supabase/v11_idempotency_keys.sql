-- =====================================================================
-- KitPay v11 — Idempotency keys (24h TTL)
-- =====================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  key text NOT NULL,
  body_hash text NOT NULL,
  response_status int NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT idempotency_keys_unique UNIQUE (merchant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Cleanup function for expired keys (called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE v_count int;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT 'v11 applied' AS info;
