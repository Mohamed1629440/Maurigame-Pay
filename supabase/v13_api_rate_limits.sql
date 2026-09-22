-- =====================================================================
-- KitPay v13 — Rate limit (sliding window 1 minute, Postgres-backed)
-- =====================================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON api_rate_limits(window_start);

-- Helper: increment counter and return current count for the api_key over the past minute
CREATE OR REPLACE FUNCTION rate_limit_increment(p_api_key_id uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_now_minute timestamptz := date_trunc('minute', now());
  v_count int;
BEGIN
  -- Insert or increment the current minute's bucket
  INSERT INTO api_rate_limits (api_key_id, window_start, count)
  VALUES (p_api_key_id, v_now_minute, 1)
  ON CONFLICT (api_key_id, window_start)
  DO UPDATE SET count = api_rate_limits.count + 1;

  -- Sum the last 60s of buckets for this api_key
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM api_rate_limits
  WHERE api_key_id = p_api_key_id
    AND window_start >= now() - interval '1 minute';

  RETURN v_count;
END;
$$;

-- Cleanup older than 5 min (called by cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE v_count int;
BEGIN
  DELETE FROM api_rate_limits WHERE window_start < now() - interval '5 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT 'v13 applied' AS info;
