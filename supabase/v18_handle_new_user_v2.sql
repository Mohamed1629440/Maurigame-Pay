-- =====================================================================
-- KitPay v18 — handle_new_user v2
-- Si un merchant existe déjà avec owner_email matchant l'email du nouveau
-- user ET owner_user_id IS NULL, on le BIND au lieu de créer un duplicate.
-- Sinon, on crée un nouveau merchant 'Mon entreprise' (comportement v15).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_merchant_id uuid;
  v_plan_id uuid;
  v_test_key text;
  v_test_key_hash text;
  v_test_key_prefix text;
  v_existing_unbound_merchant_id uuid;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if a merchant is already bound to this auth.user
  IF EXISTS (SELECT 1 FROM public.merchants WHERE owner_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Look for an unbound merchant matching the email (e.g. a pre-seeded merchant)
  SELECT id INTO v_existing_unbound_merchant_id
  FROM public.merchants
  WHERE lower(owner_email) = lower(NEW.email)
    AND owner_user_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_unbound_merchant_id IS NOT NULL THEN
    -- Bind the existing merchant to this new user
    UPDATE public.merchants
    SET owner_user_id = NEW.id,
        updated_at = now()
    WHERE id = v_existing_unbound_merchant_id;

    v_merchant_id := v_existing_unbound_merchant_id;
  ELSE
    -- Create a new placeholder merchant
    SELECT id INTO v_plan_id FROM public.merchant_plans WHERE code='free';

    INSERT INTO public.merchants (
      name, contact_email, owner_email, owner_user_id, status, plan_id
    )
    VALUES (
      'Mon entreprise',
      NEW.email,
      NEW.email,
      NEW.id,
      'pending_kyc',
      v_plan_id
    )
    RETURNING id INTO v_merchant_id;
  END IF;

  -- Idempotent membership insert (owner role, auto-accepted)
  INSERT INTO public.merchant_members (merchant_id, user_id, role, accepted_at)
  VALUES (v_merchant_id, NEW.id, 'owner', now())
  ON CONFLICT (merchant_id, user_id) DO NOTHING;

  -- Generate one test API key, only if none exists yet for this merchant
  IF NOT EXISTS (
    SELECT 1 FROM public.api_keys
    WHERE merchant_id = v_merchant_id
      AND mode='test'
      AND revoked_at IS NULL
  ) THEN
    v_test_key := 'kp_test_' || encode(gen_random_bytes(16), 'hex');
    v_test_key_hash := encode(digest(v_test_key, 'sha256'), 'hex');
    v_test_key_prefix := substring(v_test_key from 1 for 12);

    INSERT INTO public.api_keys (merchant_id, key_prefix, key_hash, mode, label)
    VALUES (v_merchant_id, v_test_key_prefix, v_test_key_hash, 'test', 'Auto-generated at signup');

    -- Stash cleartext key in user_metadata for one-time display in dashboard
    UPDATE auth.users
    SET raw_user_meta_data =
      COALESCE(raw_user_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'kitpay_initial_test_key', v_test_key,
        'kitpay_merchant_id', v_merchant_id::text
      )
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

SELECT 'v18 applied' AS info,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname='handle_new_user') AS has_v2;
