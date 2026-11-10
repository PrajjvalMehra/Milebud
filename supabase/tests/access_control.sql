-- Local database test only; do not run with --remote.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'milebud-test-driver-1@example.invalid',
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"test_driver_one"}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'milebud-test-driver-2@example.invalid',
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"test_driver_two"}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'milebud-test-driver-3@example.invalid',
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"test_driver_three"}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'milebud-test-moderator@example.invalid',
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"],"is_moderator":true}'::jsonb,
    '{"username":"test_driver_moderator"}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  );

INSERT INTO public.facilities (id, name, facility_type, location, country_code, status)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Milebud test approved facility',
    'truck_stop',
    extensions.st_geogfromtext('SRID=4326;POINT(-123 49)'),
    'CA',
    'approved'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Milebud test pending facility',
    'truck_stop',
    extensions.st_geogfromtext('SRID=4326;POINT(-122 49)'),
    'CA',
    'pending'
  );

INSERT INTO public.facility_amenities (facility_id, amenity)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'truck_parking'),
  ('10000000-0000-0000-0000-000000000002', 'showers');

INSERT INTO public.facility_submissions (
  id,
  submitted_by,
  name,
  facility_type,
  location,
  country_code
)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Driver one submission',
    'truck_stop',
    extensions.st_geogfromtext('SRID=4326;POINT(-121 49)'),
    'CA'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Driver two submission',
    'truck_stop',
    extensions.st_geogfromtext('SRID=4326;POINT(-120 49)'),
    'CA'
  );

INSERT INTO public.facility_reports (
  id,
  facility_id,
  submitted_by,
  report_type,
  parking_status,
  moderation_status,
  created_at,
  expires_at
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'parking_availability',
    'limited',
    'visible',
    pg_catalog.now(),
    pg_catalog.now() + interval '1 hour'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'parking_availability',
    'full',
    'hidden',
    pg_catalog.now(),
    pg_catalog.now() + interval '1 hour'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'parking_availability',
    'available',
    'visible',
    pg_catalog.now() - interval '2 hours',
    pg_catalog.now() - interval '1 hour'
  );

SELECT extensions.plan(38);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facilities
    WHERE id IN (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002'
    )
  ),
  'anonymous users see approved facilities only'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facility_amenities
    WHERE facility_id IN (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002'
    )
  ),
  'anonymous users see amenities for approved facilities only'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facility_reports
    WHERE id IN (
      '20000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000003'
    )
  ),
  'anonymous users see only active visible reports'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 4
    FROM public.profiles
    WHERE id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004'
    )
  ),
  'profiles are publicly readable'
);
SELECT extensions.ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.private_profiles', 'SELECT'),
  'anonymous users have no private profile privilege'
);
SELECT extensions.ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.facility_report_feedback', 'SELECT'),
  'anonymous users cannot read report feedback'
);
SELECT extensions.ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.facilities', 'INSERT'),
  'anonymous users cannot create facilities'
);
SELECT extensions.ok(
  NOT pg_catalog.has_table_privilege('authenticated', 'public.facilities', 'INSERT')
  AND NOT pg_catalog.has_table_privilege('authenticated', 'public.facility_amenities', 'INSERT'),
  'authenticated users cannot directly create facilities or amenities'
);

RESET ROLE;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 4
    FROM public.profiles
    WHERE id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004'
    )
  ),
  'authenticated users can read public profiles'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.private_profiles
    WHERE user_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004'
    )
  ),
  'users can read only their own private profile'
);
SELECT extensions.ok(
  (
    WITH updated AS (
      UPDATE public.profiles
      SET bio = 'Updated by owner'
      WHERE id = '00000000-0000-0000-0000-000000000001'
      RETURNING id
    )
    SELECT pg_catalog.count(*) = 1 FROM updated
  ),
  'users can update their own public profile'
);
SELECT extensions.ok(
  (
    WITH updated AS (
      UPDATE public.profiles
      SET bio = 'Unauthorized update'
      WHERE id = '00000000-0000-0000-0000-000000000002'
      RETURNING id
    )
    SELECT pg_catalog.count(*) = 0 FROM updated
  ),
  'users cannot update another public profile'
);
SELECT extensions.ok(
  (
    WITH updated AS (
      UPDATE public.private_profiles
      SET real_name = 'Owner real name'
      WHERE user_id = '00000000-0000-0000-0000-000000000001'
      RETURNING user_id
    )
    SELECT pg_catalog.count(*) = 1 FROM updated
  ),
  'users can update their own private profile'
);
SELECT extensions.ok(
  (
    WITH updated AS (
      UPDATE public.private_profiles
      SET real_name = 'Unauthorized update'
      WHERE user_id = '00000000-0000-0000-0000-000000000002'
      RETURNING user_id
    )
    SELECT pg_catalog.count(*) = 0 FROM updated
  ),
  'users cannot update another private profile'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facility_submissions
    WHERE id = '30000000-0000-0000-0000-000000000001'
  ),
  'users can read their own facility submissions'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 0
    FROM public.facility_submissions
    WHERE id = '30000000-0000-0000-0000-000000000002'
  ),
  'users cannot read another users facility submissions'
);
SELECT extensions.ok(
  (
    WITH updated AS (
      UPDATE public.facility_submissions
      SET name = 'Owner edited submission'
      WHERE id = '30000000-0000-0000-0000-000000000001'
      RETURNING id
    )
    SELECT pg_catalog.count(*) = 1 FROM updated
  ),
  'owners can update their own pending facility submissions'
);
SELECT extensions.ok(
  NOT pg_catalog.has_column_privilege(
    'authenticated',
    'public.facility_submissions',
    'status',
    'UPDATE'
  ),
  'users cannot update submission review status'
);
SELECT extensions.ok(
  (
    WITH inserted AS (
      INSERT INTO public.facility_submissions (
        submitted_by,
        name,
        facility_type,
        location,
        country_code
      )
      VALUES (
        auth.uid(),
        'Driver one new submission',
        'truck_stop',
        extensions.st_geogfromtext('SRID=4326;POINT(-119 49)'),
        'CA'
      )
      RETURNING id
    )
    SELECT pg_catalog.count(*) = 1 FROM inserted
  ),
  'users can create facility submissions for themselves'
);
SELECT extensions.ok(
  (
    WITH inserted AS (
      INSERT INTO public.facility_reports (
        facility_id,
        report_type,
        parking_status
      )
      VALUES (
        '10000000-0000-0000-0000-000000000001',
        'parking_availability',
        'limited'
      )
      RETURNING id
    )
    SELECT pg_catalog.count(*) = 1 FROM inserted
  ),
  'authenticated users can submit reports for approved facilities'
);
SELECT extensions.ok(
  NOT pg_catalog.has_column_privilege(
    'authenticated',
    'public.profiles',
    'id',
    'UPDATE'
  ),
  'users cannot change their profile ID'
);
SELECT extensions.ok(
  (
    WITH inserted AS (
      INSERT INTO public.facility_report_feedback (report_id, feedback_type)
      VALUES (
        '20000000-0000-0000-0000-000000000001',
        'confirm'
      )
      RETURNING report_id
    )
    SELECT pg_catalog.count(*) = 1 FROM inserted
  ),
  'authenticated users can confirm active reports'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facility_report_feedback
    WHERE report_id = '20000000-0000-0000-0000-000000000001'
  ),
  'users can read their own feedback'
);
SELECT extensions.ok(
  (
    SELECT confirmation_count = 1
    FROM public.facility_reports
    WHERE id = '20000000-0000-0000-0000-000000000001'
  ),
  'confirmation feedback increments its report counter'
);
SELECT extensions.ok(
  NOT pg_catalog.has_column_privilege(
    'authenticated',
    'public.facility_report_feedback',
    'user_id',
    'INSERT'
  ),
  'feedback users cannot supply their user ID'
);
SELECT extensions.ok(
  NOT pg_catalog.has_table_privilege('authenticated', 'public.private_profiles', 'INSERT')
  AND NOT pg_catalog.has_table_privilege('authenticated', 'public.private_profiles', 'DELETE'),
  'users cannot directly create or delete private profiles'
);

RESET ROLE;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000002',
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT extensions.ok(
  (
    WITH inserted AS (
      INSERT INTO public.facility_report_feedback (
        report_id,
        feedback_type,
        reason
      )
      VALUES (
        '20000000-0000-0000-0000-000000000001',
        'dispute',
        'Driver two dispute'
      )
      RETURNING report_id
    )
    SELECT pg_catalog.count(*) = 1 FROM inserted
  ),
  'authenticated users can dispute active reports'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facility_report_feedback
    WHERE report_id = '20000000-0000-0000-0000-000000000001'
  ),
  'users cannot read another users feedback'
);
SELECT extensions.ok(
  (
    SELECT dispute_count = 1
    FROM public.facility_reports
    WHERE id = '20000000-0000-0000-0000-000000000001'
  ),
  'dispute feedback increments its report counter'
);
SELECT extensions.ok(
  NOT pg_catalog.has_column_privilege(
    'authenticated',
    'public.facility_reports',
    'moderation_status',
    'UPDATE'
  ),
  'regular users cannot update report moderation status'
);

RESET ROLE;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000003',
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT extensions.ok(
  (
    WITH inserted AS (
      INSERT INTO public.facility_report_feedback (
        report_id,
        feedback_type,
        reason
      )
      VALUES (
        '20000000-0000-0000-0000-000000000001',
        'dispute',
        'Driver three dispute'
      )
      RETURNING report_id
    )
    SELECT pg_catalog.count(*) = 1 FROM inserted
  ),
  'a distinct authenticated driver can dispute a report'
);
SELECT extensions.ok(
  (
    SELECT moderation_status = 'visible' AND dispute_count = 2
    FROM public.facility_reports
    WHERE id = '20000000-0000-0000-0000-000000000001'
  ),
  'reports remain visible below the dispute threshold'
);

RESET ROLE;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000004',
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated","app_metadata":{"is_moderator":true}}',
  true
);
SET LOCAL ROLE authenticated;

SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facility_reports
    WHERE id = '20000000-0000-0000-0000-000000000002'
  ),
  'moderators can read hidden reports'
);
SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 3
    FROM public.facility_report_feedback
    WHERE report_id = '20000000-0000-0000-0000-000000000001'
  ),
  'moderators can read feedback from all users'
);
SELECT extensions.ok(
  (
    WITH inserted AS (
      INSERT INTO public.facility_report_feedback (
        report_id,
        feedback_type,
        reason
      )
      VALUES (
        '20000000-0000-0000-0000-000000000001',
        'dispute',
        'Moderator dispute'
      )
      RETURNING report_id
    )
    SELECT pg_catalog.count(*) = 1 FROM inserted
  ),
  'moderators can submit report feedback as authenticated users'
);
SELECT extensions.ok(
  (
    SELECT moderation_status = 'under_review' AND dispute_count = 3
    FROM public.facility_reports
    WHERE id = '20000000-0000-0000-0000-000000000001'
  ),
  'three distinct disputes move a report under review'
);
SELECT extensions.ok(
  (
    WITH updated AS (
      UPDATE public.facility_reports
      SET moderation_status = 'visible',
          moderated_by = '00000000-0000-0000-0000-000000000004',
          moderated_at = pg_catalog.now()
      WHERE id = '20000000-0000-0000-0000-000000000001'
      RETURNING id
    )
    SELECT pg_catalog.count(*) = 1 FROM updated
  ),
  'moderators can resolve reports with their own reviewer identity'
);

RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claim.sub', '', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

SELECT extensions.ok(
  (
    SELECT pg_catalog.count(*) = 1
    FROM public.facility_reports
    WHERE id = '20000000-0000-0000-0000-000000000001'
  ),
  'resolved visible reports return to public discovery'
);

RESET ROLE;

SELECT * FROM extensions.finish();

ROLLBACK;
