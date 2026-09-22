-- =====================================================================
-- KitPay v29 — LIFO matching : prend le plus récent (DESC)
-- Fix : ORDER BY created_at ASC → DESC sur match_payment_v3, _bim, _masrvi
-- Raison : le client regarde toujours sa dernière fenêtre de paiement.
-- =====================================================================

-- -----------------------------------------------------------------------
-- 1. match_payment_v3 (Bankily / Sedad / Click via GIMTEL)
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_payment_v3(
  p_amount integer,
  p_sender_phone text,
  p_method text,
  p_merchant_phone text,
  p_raw_sms text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_merchant_id uuid;
  v_operator_id uuid;
  v_intent payment_intents%ROWTYPE;
  v_orphan_id uuid;
  v_payload jsonb;
BEGIN
  -- 1. Identify merchant
  SELECT mo.merchant_id, mo.id
  INTO v_merchant_id, v_operator_id
  FROM merchant_operators mo
  JOIN merchants m ON m.id = mo.merchant_id
  WHERE mo.method = p_method
    AND mo.expected_phone = p_merchant_phone
    AND mo.enabled = true
    AND m.status IN ('active','pending_kyc')
  LIMIT 1;

  IF v_merchant_id IS NULL THEN
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method, merchant_id)
    VALUES (p_raw_sms, p_amount, p_sender_phone, p_method, NULL)
    RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object(
      'matched', false, 'tier', 4,
      'reason', 'unknown_merchant', 'orphan_id', v_orphan_id
    );
  END IF;

  -- 2. Tier 1 : montant + téléphone exact — LIFO (plus récent en premier)
  SELECT * INTO v_intent FROM payment_intents
  WHERE merchant_id = v_merchant_id AND amount = p_amount
    AND expected_phone = p_sender_phone AND method = p_method
    AND status = 'pending' AND mode = 'live' AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE payment_intents SET status='paid', matched_tier=1,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms,
        paid_at=now(), merchant_operator_id = COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;

    SELECT row_to_json(pi.*)::jsonb INTO v_payload
    FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'),
      'type', 'payment.succeeded',
      'created', extract(epoch from now())::int,
      'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));

    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_merchant_id);
  END IF;

  -- 3. Tier 2 : montant seul — LIFO
  SELECT * INTO v_intent FROM payment_intents
  WHERE merchant_id = v_merchant_id AND amount = p_amount AND method = p_method
    AND status = 'pending' AND mode = 'live' AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE payment_intents SET status='paid', matched_tier=2,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms,
        paid_at=now(), merchant_operator_id = COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;

    SELECT row_to_json(pi.*)::jsonb INTO v_payload
    FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'),
      'type', 'payment.succeeded',
      'created', extract(epoch from now())::int,
      'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));

    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_merchant_id);
  END IF;

  -- 4. Tier 3 : orphan
  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method, merchant_id)
  VALUES (p_raw_sms, p_amount, p_sender_phone, p_method, v_merchant_id)
  RETURNING id INTO v_orphan_id;

  RETURN jsonb_build_object('matched', false, 'tier', 3, 'merchant_id', v_merchant_id, 'orphan_id', v_orphan_id);
END;
$$;

-- -----------------------------------------------------------------------
-- 2. match_payment_bim
-- -----------------------------------------------------------------------
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
  -- Tier 1 : montant + téléphone client exact — LIFO
  SELECT pi.* INTO v_intent
  FROM payment_intents pi
  WHERE pi.method = 'BIM'
    AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now()
  ORDER BY pi.created_at DESC
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

  -- Tier 2 : montant seul — LIFO
  SELECT pi.* INTO v_intent
  FROM payment_intents pi
  WHERE pi.method = 'BIM'
    AND pi.amount = p_amount
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now()
  ORDER BY pi.created_at DESC
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

-- -----------------------------------------------------------------------
-- 3. match_payment_masrvi
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_payment_masrvi(
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
  -- Tier 1 : montant + téléphone client exact — LIFO
  SELECT pi.* INTO v_intent
  FROM payment_intents pi
  WHERE pi.method = 'Masrvi'
    AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now()
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Masrvi' AND merchant_id = v_intent.merchant_id AND enabled = true
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

  -- Tier 2 : montant seul — LIFO
  SELECT pi.* INTO v_intent
  FROM payment_intents pi
  WHERE pi.method = 'Masrvi'
    AND pi.amount = p_amount
    AND pi.status = 'pending'
    AND pi.mode = 'live'
    AND pi.expires_at > now()
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Masrvi' AND merchant_id = v_intent.merchant_id AND enabled = true
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
  VALUES (p_raw_sms, p_amount, p_sender_phone, 'Masrvi')
  RETURNING id INTO v_orphan_id;

  RETURN jsonb_build_object('matched', false, 'tier', 3, 'reason', 'no_intent_found', 'orphan_id', v_orphan_id);
END;
$$;

SELECT 'v29 LIFO matching applied (match_payment_v3 + _bim + _masrvi)' AS info;
