-- =====================================================================
-- KitPay v22 - enqueue_webhook_delivery() helper
-- For each active webhook of the merchant, INSERT one row in
-- webhook_deliveries with status 'pending'. The delivery worker
-- (/api/cron/deliver-webhooks, triggered by an external cron) then
-- picks pending rows, signs them with HMAC and POSTs to the merchant URL.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.enqueue_webhook_delivery(
  p_merchant_id uuid,
  p_event_type text,
  p_payload jsonb
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count int := 0;
  v_webhook record;
BEGIN
  FOR v_webhook IN
    SELECT id FROM public.webhooks
    WHERE merchant_id = p_merchant_id
      AND enabled = true
      AND p_event_type = ANY(events)
  LOOP
    INSERT INTO public.webhook_deliveries (
      webhook_id, merchant_id, event_type, payload,
      status, next_retry_at
    )
    VALUES (
      v_webhook.id, p_merchant_id, p_event_type, p_payload,
      'pending', now()
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_webhook_delivery(uuid, text, jsonb) TO service_role;

SELECT 'v22 applied' AS info;
