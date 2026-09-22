-- =====================================================================
-- KitPay v36 - match_payment_bankily
-- SMS example: "Transfert recu : 5  de +222XXXXXXXX (BANKILY)"
-- Same shape as match_payment_masrvi: method + amount + client phone.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.match_payment_bankily(
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
  v_tier2_count integer;
BEGIN
  -- Tier 1 : montant + telephone client exact — LIFO (plus recente en premier)
  SELECT pi.* INTO v_intent
  FROM payment_intents pi
  WHERE pi.method = 'Bankily'
    AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now()
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Bankily' AND merchant_id = v_intent.merchant_id AND enabled = true
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

  -- Tier 2 : montant seul — GUARD anti-collision
  SELECT COUNT(*) INTO v_tier2_count
  FROM payment_intents pi
  WHERE pi.method = 'Bankily'
    AND pi.amount = p_amount
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now();

  IF v_tier2_count > 1 THEN
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
    VALUES (p_raw_sms, p_amount, p_sender_phone, 'Bankily')
    RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object('matched', false, 'tier', 2, 'reason', 'tier2_ambiguous',
      'candidates', v_tier2_count, 'orphan_id', v_orphan_id);
  END IF;

  IF v_tier2_count = 1 THEN
    SELECT pi.* INTO v_intent
    FROM payment_intents pi
    WHERE pi.method = 'Bankily'
      AND pi.amount = p_amount
      AND pi.status = 'pending'
      AND pi.mode = 'live'
      AND pi.expires_at > now()
    ORDER BY pi.created_at DESC LIMIT 1;

    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Bankily' AND merchant_id = v_intent.merchant_id AND enabled = true
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
  VALUES (p_raw_sms, p_amount, p_sender_phone, 'Bankily')
  RETURNING id INTO v_orphan_id;

  RETURN jsonb_build_object('matched', false, 'tier', 3, 'reason', 'no_intent_found', 'orphan_id', v_orphan_id);
END;
$$;

SELECT 'v36_match_payment_bankily applied' AS info;
