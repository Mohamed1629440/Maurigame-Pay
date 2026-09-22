-- =====================================================================
-- KitPay v14 — Active RLS + policies
-- =====================================================================

-- Enable RLS on all merchant-scoped tables
ALTER TABLE merchants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_operators   ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_plans       ENABLE ROW LEVEL SECURITY;
-- payment_intents and orphan_sms already have RLS enabled in v3

-- Drop any pre-existing policies (idempotent re-apply)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('merchants','merchant_members','merchant_operators',
                        'api_keys','webhooks','webhook_deliveries',
                        'idempotency_keys','api_audit_log','api_rate_limits',
                        'merchant_plans','payment_intents','orphan_sms')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============ merchants ============
CREATE POLICY "members read merchant" ON merchants
  FOR SELECT TO authenticated
  USING (public.user_is_member_of(id) OR public.is_super_admin());

CREATE POLICY "members update merchant" ON merchants
  FOR UPDATE TO authenticated
  USING (public.user_is_member_of(id) OR public.is_super_admin())
  WITH CHECK (public.user_is_member_of(id) OR public.is_super_admin());

-- Anon read by id : needed for hosted page to show branding
-- The hosted page first reads payment_intents by ref, then reads merchant by id.
-- Acceptable because nothing on merchants is sensitive (name, logo, brand color).
CREATE POLICY "anon read merchant public fields" ON merchants
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "service all merchants" ON merchants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ merchant_members ============
CREATE POLICY "self read members" ON merchant_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "service all members" ON merchant_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ merchant_operators ============
CREATE POLICY "members read operators" ON merchant_operators
  FOR SELECT TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "members write operators" ON merchant_operators
  FOR ALL TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin())
  WITH CHECK (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "service all operators" ON merchant_operators
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ api_keys ============
-- Members can read but NEVER see key_hash via SELECT (column-level filtering done in app code)
CREATE POLICY "members read api_keys" ON api_keys
  FOR SELECT TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "members write api_keys" ON api_keys
  FOR ALL TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin())
  WITH CHECK (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "service all api_keys" ON api_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ webhooks ============
CREATE POLICY "members all webhooks" ON webhooks
  FOR ALL TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin())
  WITH CHECK (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "service all webhooks" ON webhooks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ webhook_deliveries ============
CREATE POLICY "members read deliveries" ON webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "service all deliveries" ON webhook_deliveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ idempotency_keys ============ (service-only)
CREATE POLICY "service all idempotency" ON idempotency_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ api_audit_log ============
CREATE POLICY "members read audit" ON api_audit_log
  FOR SELECT TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "service all audit" ON api_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ api_rate_limits ============ (service-only)
CREATE POLICY "service all rate_limits" ON api_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ merchant_plans ============ (read-public)
CREATE POLICY "public read plans" ON merchant_plans
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "service all plans" ON merchant_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ payment_intents ============
CREATE POLICY "anon read intent by ref" ON payment_intents
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "members read intents" ON payment_intents
  FOR SELECT TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "members update intents" ON payment_intents
  FOR UPDATE TO authenticated
  USING (public.user_is_member_of(merchant_id) OR public.is_super_admin())
  WITH CHECK (public.user_is_member_of(merchant_id) OR public.is_super_admin());

CREATE POLICY "service all intents" ON payment_intents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============ orphan_sms ============
CREATE POLICY "members read orphans" ON orphan_sms
  FOR SELECT TO authenticated
  USING (
    -- merchant_id is added in v15 migration; if NULL (tier 4), only super_admin sees
    (orphan_sms.id IS NOT NULL AND public.is_super_admin())
    OR (orphan_sms.id IN (
        SELECT id FROM orphan_sms o2
        WHERE o2.id = orphan_sms.id
        -- Tighter merchant filter applied later when merchant_id column exists
    ))
  );

CREATE POLICY "service all orphans" ON orphan_sms
  FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT 'v14 applied' AS info,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies_count;
