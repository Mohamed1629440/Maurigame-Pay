-- =====================================================================
-- KitPay v15 — Trigger Supabase Auth → auto-création merchant placeholder
-- Au signup, on crée :
--   - 1 row merchants (status pending_kyc, plan_free, name='Mon entreprise')
--   - 1 row merchant_members (role owner, accepted_at=now())
--   - 1 row api_keys (mode test, kp_test_xxx) — la clé en clair n'est pas stockée
-- L'app frontend recoit la kp_test en clair via la response du callback signup, pas la DB
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
BEGIN
  -- Skip if email is null (shouldn't happen, but defensive)
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if merchant already exists for this user (e.g. test reruns)
  IF EXISTS (SELECT 1 FROM public.merchants WHERE owner_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Get free plan id
  SELECT id INTO v_plan_id FROM public.merchant_plans WHERE code='free';

  -- Create placeholder merchant
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

  -- Create membership (owner, auto-accepted)
  INSERT INTO public.merchant_members (merchant_id, user_id, role, accepted_at)
  VALUES (v_merchant_id, NEW.id, 'owner', now());

  -- Generate one test API key
  v_test_key := 'kp_test_' || encode(gen_random_bytes(16), 'hex');
  v_test_key_hash := encode(digest(v_test_key, 'sha256'), 'hex');
  v_test_key_prefix := substring(v_test_key from 1 for 12);

  INSERT INTO public.api_keys (merchant_id, key_prefix, key_hash, mode, label)
  VALUES (v_merchant_id, v_test_key_prefix, v_test_key_hash, 'test', 'Auto-generated at signup');

  -- Stash the cleartext key in user_metadata so the frontend can show it ONCE
  -- after first login. Cleared by the dashboard's first onboarding step.
  UPDATE auth.users
  SET raw_user_meta_data =
    COALESCE(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'kitpay_initial_test_key', v_test_key,
      'kitpay_merchant_id', v_merchant_id::text
    )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'v15 applied' AS info,
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created') AS trigger_active;
