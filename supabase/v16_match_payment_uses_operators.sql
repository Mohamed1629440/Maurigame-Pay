-- =====================================================================
-- KitPay v16 — Refonte match_payment_v3 utilisant merchant_operators
-- Au lieu de chercher merchants.expected_phone, on cherche dans merchant_operators
-- où (method, expected_phone) UNIQUE par row enabled.
-- =====================================================================

-- Ensure orphan_sms has merchant_id (for tier 3/4 distinction)
ALTER TABLE orphan_sms ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION match_payment_v3(
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
BEGIN
  -- 1. Identify merchant via merchant_operators (the canonical lookup)
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
    -- Tier 4 : SMS arrived on a phone not linked to any operator
    INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method, merchant_id)
    VALUES (p_raw_sms, p_amount, p_sender_phone, p_method, NULL)
    RETURNING id INTO v_orphan_id;
    RETURN jsonb_build_object(
      'matched', false, 'tier', 4,
      'reason', 'unknown_merchant', 'orphan_id', v_orphan_id
    );
  END IF;

  -- 2. Tier 1 : sender_phone + amount + merchant + method
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE merchant_id = v_merchant_id
    AND amount = p_amount
    AND expected_phone = p_sender_phone
    AND method = p_method
    AND status = 'pending'
    AND mode = 'live'
    AND expires_at > now()
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE payment_intents
    SET status='paid', matched_tier=1,
        actual_sender_phone=p_sender_phone,
        sms_received=p_raw_sms,
        paid_at=now(),
        merchant_operator_id = COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    RETURN jsonb_build_object('matched', true, 'tier', 1, 'ref', v_intent.ref, 'merchant_id', v_merchant_id);
  END IF;

  -- 3. Tier 2 : amount + merchant + method, FIFO
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE merchant_id = v_merchant_id
    AND amount = p_amount
    AND method = p_method
    AND status = 'pending'
    AND mode = 'live'
    AND expires_at > now()
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE payment_intents
    SET status='paid', matched_tier=2,
        actual_sender_phone=p_sender_phone,
        sms_received=p_raw_sms,
        paid_at=now(),
        merchant_operator_id = COALESCE(merchant_operator_id, v_operator_id)
    WHERE ref = v_intent.ref;
    RETURN jsonb_build_object('matched', true, 'tier', 2, 'ref', v_intent.ref, 'merchant_id', v_merchant_id);
  END IF;

  -- 4. Tier 3 : orphan tied to identified merchant
  INSERT INTO orphan_sms (raw_body, parsed_amount, parsed_phone, parsed_method, merchant_id)
  VALUES (p_raw_sms, p_amount, p_sender_phone, p_method, v_merchant_id)
  RETURNING id INTO v_orphan_id;

  RETURN jsonb_build_object('matched', false, 'tier', 3, 'merchant_id', v_merchant_id, 'orphan_id', v_orphan_id);
END;
$$;

SELECT 'v16 applied' AS info,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname='match_payment_v3') AS has_match_v3;
