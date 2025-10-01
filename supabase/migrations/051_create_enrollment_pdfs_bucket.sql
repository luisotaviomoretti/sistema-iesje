-- =====================================================
-- MIGRATION: 051_create_enrollment_pdfs_bucket.sql
-- PURPOSE: Create Supabase Storage bucket 'enrollment-pdfs' and secure RLS policies
-- DATE: 2025-09-30
-- =====================================================

-- 1) Create bucket if it doesn't exist (public read)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'enrollment-pdfs') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('enrollment-pdfs', 'enrollment-pdfs', true);
  END IF;
END $$;

-- 2) Policies on storage.objects for bucket 'enrollment-pdfs'
--    Note: storage.objects already has RLS enabled by default in Supabase

-- Helper comment: object path layout => enrollments/{enrollment_id}/latest.pdf
-- We validate {enrollment_id} with a UUID regex before casting

-- a) Public read: anyone can read objects from this bucket
DROP POLICY IF EXISTS "public_read_enrollment_pdfs" ON storage.objects;
CREATE POLICY "public_read_enrollment_pdfs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'enrollment-pdfs'
  );

-- b) Authenticated admins: full access to this bucket
DROP POLICY IF EXISTS "admin_all_enrollment_pdfs" ON storage.objects;
CREATE POLICY "admin_all_enrollment_pdfs"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'enrollment-pdfs' AND public.is_admin_user()
  )
  WITH CHECK (
    bucket_id = 'enrollment-pdfs' AND public.is_admin_user()
  );

-- c) Authenticated non-admin: can insert/update their own enrollment's PDF
--    (when the enrollment_id in the path belongs to auth.uid())
DROP POLICY IF EXISTS "auth_write_own_enrollment_pdfs" ON storage.objects;
CREATE POLICY "auth_write_own_enrollment_pdfs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'enrollment-pdfs'
    AND name ~ '^enrollments/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.id = (split_part(name, '/', 2))::uuid
        AND (public.is_admin_user() OR e.created_by_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "auth_update_own_enrollment_pdfs" ON storage.objects;
CREATE POLICY "auth_update_own_enrollment_pdfs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'enrollment-pdfs'
    AND name ~ '^enrollments/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.id = (split_part(name, '/', 2))::uuid
        AND (public.is_admin_user() OR e.created_by_user_id = auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'enrollment-pdfs'
    AND name ~ '^enrollments/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.id = (split_part(name, '/', 2))::uuid
        AND (public.is_admin_user() OR e.created_by_user_id = auth.uid())
    )
  );

-- d) Anonymous (não autenticado): permitir INSERT para matrículas muito recentes
--    (para o fluxo de novo aluno sem login). Janela de 6 horas para mitigar abuso.
DROP POLICY IF EXISTS "anon_insert_recent_enrollment_pdfs" ON storage.objects;
CREATE POLICY "anon_insert_recent_enrollment_pdfs"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'enrollment-pdfs'
    AND name ~ '^enrollments/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.id = (split_part(name, '/', 2))::uuid
        AND e.created_at >= (NOW() - INTERVAL '6 hours')
    )
  );

-- 3) Info
DO $$ BEGIN
  RAISE NOTICE '051_create_enrollment_pdfs_bucket applied: bucket created and policies set.';
END $$;
