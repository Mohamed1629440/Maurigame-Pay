-- =====================================================================
-- KitPay v21 — verify_api_key() (deferred from Plan 1)
-- Pris en argument la clé en clair, hash sha256, lookup api_keys, retourne
-- merchant_id + mode + scopes ou rien si invalide/revoked.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.verify_api_key(p_key text)
RETURNS TABLE(merchant_id uuid, api_key_id uuid, mode text, scopes text[])
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
BEGIN
  IF p_key IS NULL OR length(p_key) < 16 THEN
    RETURN;
  END IF;

  v_hash := encode(digest(p_key, 'sha256'), 'hex');

  RETURN QUERY
  SELECT k.merchant_id, k.id AS api_key_id, k.mode, k.scopes
  FROM public.api_keys k
  WHERE k.key_hash = v_hash
    AND k.revoked_at IS NULL
  LIMIT 1;

  -- Update last_used_at fire-and-forget
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE key_hash = v_hash
    AND revoked_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_api_key(text) TO service_role;

SELECT 'v21 applied' AS info,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname='verify_api_key') AS has_fn;
