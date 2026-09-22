-- =====================================================================
-- KitPay v8 — Multi-utilisateur par marchand + helper RLS
-- =====================================================================

CREATE TABLE IF NOT EXISTS merchant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','dev','viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_members_unique UNIQUE (merchant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_members_user ON merchant_members(user_id) WHERE accepted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_merchant_members_merchant ON merchant_members(merchant_id);

-- RLS helper used by all member-scoped policies in v14.
-- Placed in `public` schema because Supabase reserves `auth` (no DDL allowed there).
CREATE OR REPLACE FUNCTION public.user_is_member_of(p_merchant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.merchant_members
    WHERE merchant_id = p_merchant_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_is_member_of(uuid) TO authenticated, anon;

-- Helper for super_admin (set in app_metadata.role)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin',
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

SELECT 'v8 applied' AS info;
