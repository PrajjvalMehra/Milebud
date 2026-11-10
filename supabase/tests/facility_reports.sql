-- Local database test only; do not run with --remote.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(15);

WITH checks (name, passed) AS (
  VALUES
    (
      'report migration is recorded as applied',
      EXISTS (
        SELECT 1
        FROM supabase_migrations.schema_migrations
        WHERE version = '20261106201500'
      )
    ),
    (
      'report types, payloads, and expiry are constrained',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.facility_reports'::regclass
          AND conname = 'facility_reports_type_data_valid'
      )
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.facility_reports'::regclass
          AND conname = 'facility_reports_expiry_valid'
      )
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.facility_report_feedback'::regclass
          AND conname = 'facility_report_feedback_reason_valid'
      )
    ),
    (
      'reports table has RLS enabled',
      COALESCE((
        SELECT relrowsecurity
        FROM pg_catalog.pg_class
        WHERE oid = pg_catalog.to_regclass('public.facility_reports')
      ), false)
    ),
    (
      'feedback table has RLS enabled',
      COALESCE((
        SELECT relrowsecurity
        FROM pg_catalog.pg_class
        WHERE oid = pg_catalog.to_regclass('public.facility_report_feedback')
      ), false)
    ),
    (
      'report submitter is not selectable by clients',
      NOT pg_catalog.has_column_privilege(
        'anon', 'public.facility_reports', 'submitted_by', 'SELECT'
      )
      AND NOT pg_catalog.has_column_privilege(
        'authenticated', 'public.facility_reports', 'submitted_by', 'SELECT'
      )
    ),
    (
      'authenticated inserts cannot supply report owner',
      pg_catalog.has_column_privilege(
        'authenticated', 'public.facility_reports', 'facility_id', 'INSERT'
      )
      AND NOT pg_catalog.has_column_privilege(
        'authenticated', 'public.facility_reports', 'submitted_by', 'INSERT'
      )
    ),
    (
      'authenticated feedback cannot supply voter identity',
      pg_catalog.has_column_privilege(
        'authenticated', 'public.facility_report_feedback', 'report_id', 'INSERT'
      )
      AND NOT pg_catalog.has_column_privilege(
        'authenticated', 'public.facility_report_feedback', 'user_id', 'INSERT'
      )
    ),
    (
      'feedback identities are private from anon',
      NOT pg_catalog.has_table_privilege(
        'anon', 'public.facility_report_feedback', 'SELECT'
      )
      AND NOT pg_catalog.has_table_privilege(
        'anon', 'public.facility_report_feedback', 'INSERT'
      )
    ),
    (
      'feedback is immutable to authenticated users',
      NOT pg_catalog.has_table_privilege(
        'authenticated', 'public.facility_report_feedback', 'UPDATE'
      )
      AND NOT pg_catalog.has_table_privilege(
        'authenticated', 'public.facility_report_feedback', 'DELETE'
      )
    ),
    (
      'active report policy excludes expired and moderated reports',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'facility_reports'
          AND policyname = 'facility_reports_active_read'
          AND qual LIKE '%expires_at%'
          AND qual LIKE '%moderation_status%'
          AND qual LIKE '%facilities.status%'
      )
    ),
    (
      'moderation requires trusted app metadata',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'facility_reports'
          AND policyname = 'facility_reports_moderator_update'
          AND qual LIKE '%is_moderator%'
          AND with_check LIKE '%is_moderator%'
      )
    ),
    (
      'feedback insert requires authenticated ownership and valid report',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'facility_report_feedback'
          AND policyname = 'facility_report_feedback_authenticated_insert'
          AND with_check LIKE '%auth.uid%'
          AND with_check LIKE '%facility_reports%'
          AND with_check LIKE '%expires_at%'
      )
    ),
    (
      'feedback counter trigger is installed',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger
        WHERE tgrelid = 'public.facility_report_feedback'::regclass
          AND tgname = 'facility_report_feedback_update_counts'
          AND NOT tgisinternal
      )
    ),
    (
      'counter trigger function is not executable by client roles',
      NOT pg_catalog.has_function_privilege(
        'anon', 'public.update_facility_report_feedback_counts()', 'EXECUTE'
      )
      AND NOT pg_catalog.has_function_privilege(
        'authenticated', 'public.update_facility_report_feedback_counts()', 'EXECUTE'
      )
    ),
    (
      'counter trigger is security definer with empty search path',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS proc
        JOIN pg_catalog.pg_namespace AS ns ON ns.oid = proc.pronamespace
        WHERE ns.nspname = 'public'
          AND proc.proname = 'update_facility_report_feedback_counts'
          AND proc.prosecdef
          AND COALESCE(pg_catalog.array_to_string(proc.proconfig, ','), '')
            LIKE '%search_path=""%'
      )
    )
)
SELECT extensions.ok(passed, name)
FROM checks
ORDER BY name;

SELECT * FROM extensions.finish();

ROLLBACK;
