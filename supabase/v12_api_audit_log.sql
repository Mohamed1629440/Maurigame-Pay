-- =====================================================================
-- KitPay v12 — Audit log des appels API publique
-- =====================================================================

CREATE TABLE IF NOT EXISTS api_audit_log (
  id bigserial PRIMARY KEY,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code int,
  ip text,
  user_agent text,
  body_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_audit_merchant ON api_audit_log(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_audit_created ON api_audit_log(created_at);

-- Retention purge (90j) — called by cron
CREATE OR REPLACE FUNCTION purge_old_api_audit_log()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE v_count int;
BEGIN
  DELETE FROM api_audit_log WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT 'v12 applied' AS info;
