-- =====================================================================
-- KitPay v26 — match_payment_bim
-- Matching BIM sans merchant_phone : method + amount + client_phone
-- =====================================================================

CREATE OR REPLACE FUNCTION public.match_payment_bim(
  p_amount integer,
  p_sender_phone text,
  p_raw_sms text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_intent payment_intents%ROWTYPE;
  v_operator_id uuid;
  v_orphan_id uuid;
  v_payload jsonb;
BEGIN
  -- Tier 1 : montant + téléphone client exact
  SELECT pi.* INTO v_intent
  FROM payment_intents pi
  WHERE pi.method = 'BIM'
    AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now()
  ORDER BY pi.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'BIM' AND merchant_id = v_intent.merchant_id AND enabled = true
    LIMIT 1;

    UPDATE payment_intents
    SET status = 'paid', matched_tier = 1,
        actual_sender_phone = p_sender_phone, sms_received = p_raw_sms,
        paid_at = now(),
        merchant_operator_id = COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;

    SELECT row_to_json(pi.*)::jsonb INTO v_payload
    FROM payment_intents pi WHERE ref = v_intent.ref;

    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'),
      'type', 'payment.succeeded',
      'created', extract(epoch from now())::int,
      'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));

    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  -- Tier 2 : montant seul
  SELECT pi.* INTO v_intent
  FROM payment_intents pi
  WHERE pi.method = 'BIM'
    AND pi.amount = p_amount
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now()
  ORDER BY pi.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'BIM' AND merchant_id = v_intent.merchant_id AND enabled = true
    LIMIT 1;

    UPDATE payment_intents
    SET status = 'paid', matched_tier = 2,
        actual_sender_phone = p_sender_phone, sms_received = p_raw_sms,
        paid_at = now(),
        merchant_operator_id = COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;

    SELECT row_to_json(pi.*)::jsonb INTO v_payload
    FROM payment_intents pi WHERE ref = v_intent.ref;

    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'),
      'type', 'payment.succeeded',
      'created', extract(epoch from now())::int,
      'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));

    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  -- Tier 3 : orphan
  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
  VALUES (p_raw_sms, p_amount, p_sender_phone, 'BIM')
  RETURNING id INTO v_orphan_id;

  RETURN jsonb_build_object('matched', false, 'tier', 3, 'reason', 'no_intent_found', 'orphan_id', v_orphan_id);
END;
$$;

SELECT 'v26 match_payment_bim created' AS info;
