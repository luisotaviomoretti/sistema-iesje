-- =====================================================
-- MIGRATION: 050_fix_admin_update_policy_enrollments.sql
-- PURPOSE: Allow admin users to update enrollments beyond 2 hours and
-- automatically link admin_users.auth_user_id to auth.users to satisfy RLS.
-- DATE: 2025-09-30
-- =====================================================

-- 1) Safety: ensure table exists
DO $$ BEGIN
  PERFORM 1 FROM pg_class WHERE relname = 'enrollments' AND relkind = 'r';
  IF NOT FOUND THEN
    RAISE NOTICE 'Table public.enrollments not found. Skipping policy changes.';
  END IF;
END $$;

-- 2) Backfill admin_users.auth_user_id using auth.users
--    This ensures RLS checks using auth.uid() succeed for existing admins
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'auth_user_id'
  ) THEN
    UPDATE public.admin_users a
    SET auth_user_id = u.id
    FROM auth.users u
    WHERE a.auth_user_id IS NULL
      AND lower(a.email) = lower(u.email);

    -- Optional: enforce uniqueness cleanup if duplicates exist (defensive)
    -- Removes any duplicate auth_user_id keeping the most recent active admin
    WITH ranked AS (
      SELECT id, auth_user_id,
             ROW_NUMBER() OVER (PARTITION BY auth_user_id ORDER BY ativo DESC, last_login DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
      FROM public.admin_users
      WHERE auth_user_id IS NOT NULL
    )
    UPDATE public.admin_users a
    SET auth_user_id = NULL
    FROM ranked r
    WHERE a.id = r.id AND r.rn > 1;
  END IF;
END $$;

  -- 3) replace policy: allow update when record is recent OR user is an admin (via function)
  --    Old policy used only auth.uid() IN (SELECT auth_user_id ...) which fails when auth_user_id isn't set.
  -- Drop and recreate policy using plain SQL (avoids nested EXECUTE issues in SQL Editor)
  DROP POLICY IF EXISTS "policy_update_enrollments" ON public.enrollments;

  CREATE POLICY "policy_update_enrollments"
    ON public.enrollments
    FOR UPDATE
    USING (
      -- Recent records (<= 2 hours) OR any valid admin (email fallback handled by function)
      created_at >= (NOW() - INTERVAL '2 hours')
      OR public.is_admin_user()
    )
    WITH CHECK (
      created_at >= (NOW() - INTERVAL '2 hours')
      OR public.is_admin_user()
    );

-- 4) Info
DO $$ BEGIN
  RAISE NOTICE '050_fix_admin_update_policy_enrollments applied: admin users can update enrollments regardless of age.';
END $$;
