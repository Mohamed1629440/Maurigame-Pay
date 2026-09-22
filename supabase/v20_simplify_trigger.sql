-- =====================================================================
-- KitPay v20 — Simplification handle_new_user (no auth.users UPDATE)
-- =====================================================================
-- Le trigger v18 essayait de UPDATE auth.users.raw_user_meta_data pour
-- y stocker la kp_test cleartext. Supabase restreint ce type de write
-- même depuis SECURITY DEFINER → "Database error saving new user".
--
-- Fix : le trigger ne fait plus que créer/binder le merchant + member.
-- La génération de l'api_key test sera faite côté app Next.js
-- (server action) au premier accès dashboard ou onboarding.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_merchant_id uuid;
  v_plan_id uuid;
  v_existing_unbound_merchant_id uuid;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.merchants WHERE owner_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_unbound_merchant_id
  FROM public.merchants
  WHERE lower(owner_email) = lower(NEW.email)
    AND owner_user_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_unbound_merchant_id IS NOT NULL THEN
    UPDATE public.merchants
    SET owner_user_id = NEW.id, updated_at = now()
    WHERE id = v_existing_unbound_merchant_id;
    v_merchant_id := v_existing_unbound_merchant_id;
  ELSE
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

  INSERT INTO public.merchant_members (merchant_id, user_id, role, accepted_at)
  VALUES (v_merchant_id, NEW.id, 'owner', now())
  ON CONFLICT (merchant_id, user_id) DO NOTHING;

  -- NOTE: api_key generation moved to app code (post-signup)
  -- to avoid UPDATE on auth.users from within trigger (Supabase restricted).

  RETURN NEW;
END;
$$;

SELECT 'v20 applied' AS info;
