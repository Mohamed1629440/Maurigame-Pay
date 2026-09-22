-- =====================================================================
-- KitPay v25 — Storage RLS pour kyc-documents
-- Path convention : kyc-documents/<merchant_id>/<filename>
-- - Owner du merchant : peut INSERT/UPDATE/SELECT/DELETE ses propres docs
-- - Super-admin : peut SELECT tous les docs
-- - service_role : tout
-- =====================================================================

-- Activer RLS sur storage.objects (par défaut OFF)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on this bucket
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname LIKE 'kyc%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Owner: full CRUD on their own merchant folder
CREATE POLICY "kyc owner all" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.user_is_member_of((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND public.user_is_member_of((storage.foldername(name))[1]::uuid)
);

-- Super-admin: SELECT on all kyc docs
CREATE POLICY "kyc super_admin read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.is_super_admin()
);

-- service_role: bypass
CREATE POLICY "kyc service_role all" ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'kyc-documents') WITH CHECK (bucket_id = 'kyc-documents');

SELECT 'v25 applied' AS info;
