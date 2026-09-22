-- v34 : Protection contre les collisions Tier 2
-- Probleme : si plusieurs intents pending ont le meme montant/methode,
-- le Tier 2 matchait au hasard (LIFO). Un client pouvait valider
-- le paiement d'un autre client.
-- Fix : compter les candidats Tier 2. Si > 1 → orphan (tier2_ambiguous).
-- Le reconciliateur manuel traite ensuite l'orphan.

-- -----------------------------------------------------------------------
-- 1. match_payment_v3 (Bankily / Sedad / Click GIMTEL)
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
  v_tier2_count integer;
BEGIN
  -- 1. Identifier le marchand via le numero recepteur
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
    RETURN jsonb_build_object('matched', false, 'tier', 4, 'reason', 'unknown_merchant', 'orphan_id', v_orphan_id);
  END IF;

  -- 2. Tier 1 : montant + telephone exact — LIFO
  SELECT * INTO v_intent FROM payment_intents
  WHERE merchant_id = v_merchant_id AND amount = p_amount
    AND expected_phone = p_sender_phone AND method = p_method
    AND status = 'pending' AND mode = 'live' AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE payment_intents SET status='paid', matched_tier=1,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms,
        paid_at=now(), merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_merchant_id);
  END IF;

  -- 3. Tier 2 : montant seul — GUARD : uniquement si exactement 1 candidat
  SELECT COUNT(*) INTO v_tier2_count FROM payment_intents
  WHERE merchant_id = v_merchant_id AND amount = p_amount AND method = p_method
    AND status = 'pending' AND mode = 'live' AND expires_at > now();

  IF v_tier2_count > 1 THEN
    -- Ambiguite : plusieurs intents pour ce montant → orphan pour reconciliation manuelle
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method, merchant_id)
    VALUES (p_raw_sms, p_amount, p_sender_phone, p_method, v_merchant_id)
    RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object('matched', false, 'tier', 2, 'reason', 'tier2_ambiguous',
      'candidates', v_tier2_count, 'orphan_id', v_orphan_id);
  END IF;

  IF v_tier2_count = 1 THEN
    SELECT * INTO v_intent FROM payment_intents
    WHERE merchant_id = v_merchant_id AND amount = p_amount AND method = p_method
      AND status = 'pending' AND mode = 'live' AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;

    UPDATE payment_intents SET status='paid', matched_tier=2,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms,
        paid_at=now(), merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
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
  v_tier2_count integer;
BEGIN
  -- Tier 1 : montant + telephone — LIFO
  SELECT pi.* INTO v_intent FROM payment_intents pi
  WHERE pi.method = 'BIM' AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
  ORDER BY pi.created_at DESC LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'BIM' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=1,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  -- Tier 2 : montant seul — GUARD
  SELECT COUNT(*) INTO v_tier2_count FROM payment_intents pi
  WHERE pi.method = 'BIM' AND pi.amount = p_amount
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now();

  IF v_tier2_count > 1 THEN
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
    VALUES (p_raw_sms, p_amount, p_sender_phone, 'BIM') RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object('matched', false, 'tier', 2, 'reason', 'tier2_ambiguous',
      'candidates', v_tier2_count, 'orphan_id', v_orphan_id);
  END IF;

  IF v_tier2_count = 1 THEN
    SELECT pi.* INTO v_intent FROM payment_intents pi
    WHERE pi.method = 'BIM' AND pi.amount = p_amount
      AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
    ORDER BY pi.created_at DESC LIMIT 1;
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'BIM' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=2,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
  VALUES (p_raw_sms, p_amount, p_sender_phone, 'BIM') RETURNING id INTO v_orphan_id;
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
  v_tier2_count integer;
BEGIN
  -- Tier 1 : montant + telephone — LIFO
  SELECT pi.* INTO v_intent FROM payment_intents pi
  WHERE pi.method = 'Masrvi' AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
  ORDER BY pi.created_at DESC LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Masrvi' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=1,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  -- Tier 2 : montant seul — GUARD
  SELECT COUNT(*) INTO v_tier2_count FROM payment_intents pi
  WHERE pi.method = 'Masrvi' AND pi.amount = p_amount
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now();

  IF v_tier2_count > 1 THEN
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
    VALUES (p_raw_sms, p_amount, p_sender_phone, 'Masrvi') RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object('matched', false, 'tier', 2, 'reason', 'tier2_ambiguous',
      'candidates', v_tier2_count, 'orphan_id', v_orphan_id);
  END IF;

  IF v_tier2_count = 1 THEN
    SELECT pi.* INTO v_intent FROM payment_intents pi
    WHERE pi.method = 'Masrvi' AND pi.amount = p_amount
      AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
    ORDER BY pi.created_at DESC LIMIT 1;
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Masrvi' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=2,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
  VALUES (p_raw_sms, p_amount, p_sender_phone, 'Masrvi') RETURNING id INTO v_orphan_id;
  RETURN jsonb_build_object('matched', false, 'tier', 3, 'reason', 'no_intent_found', 'orphan_id', v_orphan_id);
END;
$$;

-- -----------------------------------------------------------------------
-- 4. match_payment_sedad
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_payment_sedad(
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
  -- Tier 1 : montant + telephone client exact — LIFO
  SELECT pi.* INTO v_intent FROM payment_intents pi
  WHERE pi.method = 'Sedad' AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
  ORDER BY pi.created_at DESC LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Sedad' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=1,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  -- Tier 2 : montant seul — GUARD
  SELECT COUNT(*) INTO v_tier2_count FROM payment_intents pi
  WHERE pi.method = 'Sedad' AND pi.amount = p_amount
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now();

  IF v_tier2_count > 1 THEN
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
    VALUES (p_raw_sms, p_amount, p_sender_phone, 'Sedad') RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object('matched', false, 'tier', 2, 'reason', 'tier2_ambiguous',
      'candidates', v_tier2_count, 'orphan_id', v_orphan_id);
  END IF;

  IF v_tier2_count = 1 THEN
    SELECT pi.* INTO v_intent FROM payment_intents pi
    WHERE pi.method = 'Sedad' AND pi.amount = p_amount
      AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
    ORDER BY pi.created_at DESC LIMIT 1;
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Sedad' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=2,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
  VALUES (p_raw_sms, p_amount, p_sender_phone, 'Sedad') RETURNING id INTO v_orphan_id;
  RETURN jsonb_build_object('matched', false, 'tier', 3, 'reason', 'no_intent_found', 'orphan_id', v_orphan_id);
END;
$$;

-- -----------------------------------------------------------------------
-- 5. match_payment_click
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_payment_click(
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
  -- Tier 1 : montant + telephone client exact — LIFO
  SELECT pi.* INTO v_intent FROM payment_intents pi
  WHERE pi.method = 'Click' AND pi.amount = p_amount
    AND pi.expected_phone = p_sender_phone
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
  ORDER BY pi.created_at DESC LIMIT 1;

  IF FOUND THEN
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Click' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=1,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  -- Tier 2 : montant seul — GUARD
  SELECT COUNT(*) INTO v_tier2_count FROM payment_intents pi
  WHERE pi.method = 'Click' AND pi.amount = p_amount
    AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now();

  IF v_tier2_count > 1 THEN
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
    VALUES (p_raw_sms, p_amount, p_sender_phone, 'Click') RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object('matched', false, 'tier', 2, 'reason', 'tier2_ambiguous',
      'candidates', v_tier2_count, 'orphan_id', v_orphan_id);
  END IF;

  IF v_tier2_count = 1 THEN
    SELECT pi.* INTO v_intent FROM payment_intents pi
    WHERE pi.method = 'Click' AND pi.amount = p_amount
      AND pi.status = 'pending' AND pi.mode = 'live' AND pi.expires_at > now()
    ORDER BY pi.created_at DESC LIMIT 1;
    SELECT id INTO v_operator_id FROM merchant_operators
    WHERE method = 'Click' AND merchant_id = v_intent.merchant_id AND enabled = true LIMIT 1;
    UPDATE payment_intents SET status='paid', matched_tier=2,
        actual_sender_phone=p_sender_phone, sms_received=p_raw_sms, paid_at=now(),
        merchant_operator_id=COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    SELECT row_to_json(pi.*)::jsonb INTO v_payload FROM payment_intents pi WHERE ref = v_intent.ref;
    PERFORM enqueue_webhook_delivery(v_intent.merchant_id, 'payment.succeeded', jsonb_build_object(
      'id', 'evt_' || encode(gen_random_bytes(12), 'hex'), 'type', 'payment.succeeded',
      'created', extract(epoch from now())::int, 'livemode', true,
      'data', jsonb_build_object('object', v_payload)
    ));
    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_intent.merchant_id);
  END IF;

  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method)
  VALUES (p_raw_sms, p_amount, p_sender_phone, 'Click') RETURNING id INTO v_orphan_id;
  RETURN jsonb_build_object('matched', false, 'tier', 3, 'reason', 'no_intent_found', 'orphan_id', v_orphan_id);
END;
$$;

SELECT 'v34 Tier 2 collision guard applied (match_payment_v3 + _bim + _masrvi + _sedad + _click)' AS info;
