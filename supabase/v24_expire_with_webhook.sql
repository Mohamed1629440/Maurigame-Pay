-- =====================================================================
-- KitPay v24 — expire_old_intents enqueues payment.expired webhook
-- =====================================================================

CREATE OR REPLACE FUNCTION public.expire_old_intents()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer := 0;
  v_intent payment_intents%ROWTYPE;
  v_payload jsonb;
BEGIN
  FOR v_intent IN
    SELECT * FROM payment_intents
    WHERE status = 'pending' AND expires_at < now()
  LOOP
    UPDATE payment_intents SET status = 'expired' WHERE ref = v_intent.ref;
    v_count := v_count + 1;

    SELECT row_to_json(pi.*)::jsonb INTO v_payload
    FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.expired', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'),
      'type', 'payment.expired',
      'created', extract(epoch from now())::int,
      'livemode', v_intent.mode = 'live',
      'data', jsonb_build_object('object', v_payload)
    ));
  END LOOP;
  RETURN v_count;
END;
$$;

SELECT 'v24 applied' AS info;
