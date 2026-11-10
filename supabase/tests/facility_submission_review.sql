-- Run only against an isolated development database. Never run against production.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('01000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'review-owner@example.invalid', '', pg_catalog.now(), '{}', '{}', pg_catalog.now(), pg_catalog.now()),
  ('01000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'review-moderator@example.invalid', '', pg_catalog.now(),
   '{"is_moderator":true}', '{}', pg_catalog.now(), pg_catalog.now());

INSERT INTO public.facility_submissions (id, submitted_by, name, facility_type, location, country_code)
VALUES
  ('31000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001',
   'Approval fixture', 'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-123 49)'), 'CA'),
  ('31000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000001',
   'Rejection fixture', 'fuel_station', extensions.st_geogfromtext('SRID=4326;POINT(-122 49)'), 'CA'),
  ('31000000-0000-0000-0000-000000000003', '01000000-0000-0000-0000-000000000002',
   'Moderator own fixture', 'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-121 49)'), 'CA');

SELECT extensions.plan(14);
SELECT extensions.ok(NOT pg_catalog.has_function_privilege(
  'anon', 'public.review_facility_submission(uuid,text,timestamptz)', 'EXECUTE'),
  'anonymous users cannot invoke review');
SELECT extensions.ok(NOT pg_catalog.has_column_privilege(
  'authenticated', 'public.facility_submissions', 'status', 'UPDATE'),
  'authenticated users cannot directly change review status');

SELECT pg_catalog.set_config('request.jwt.claims',
  '{"sub":"01000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT extensions.throws_ok(
  $$SELECT public.pending_facility_reviews(0)$$, '42501', 'Moderator access required',
  'non-moderators cannot open the queue');
SELECT extensions.throws_ok(
  $$SELECT public.review_facility_submission('31000000-0000-0000-0000-000000000001', 'approved', now())$$,
  '42501', 'Moderator access required', 'non-moderators cannot approve');
SELECT extensions.is(
  (SELECT pg_catalog.count(*) FROM public.facility_submissions
   WHERE id = '31000000-0000-0000-0000-000000000003'),
  0::bigint, 'non-moderators cannot read other submissions');

SELECT pg_catalog.set_config('request.jwt.claims',
  '{"sub":"01000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"is_moderator":true}}', true);
SELECT extensions.is((SELECT pg_catalog.count(*) FROM public.pending_facility_reviews(0)),
  2::bigint, 'queue contains other users pending submissions only');
SELECT extensions.throws_ok(
  $$SELECT public.review_facility_submission('31000000-0000-0000-0000-000000000003', 'approved',
    (SELECT updated_at FROM public.facility_submissions WHERE id = '31000000-0000-0000-0000-000000000003'))$$,
  '42501', 'Moderators cannot review their own suggestions', 'self review is denied');
SELECT extensions.throws_ok(
  $$SELECT public.review_facility_submission('31000000-0000-0000-0000-000000000001', 'approved', '2000-01-01'::timestamptz)$$,
  'P0001', 'Suggestion changed since it was loaded; refresh before reviewing', 'stale reviews are denied');
SELECT extensions.throws_ok(
  $$SELECT public.review_facility_submission('31000000-0000-0000-0000-000000000001', 'invalid', now())$$,
  '22023', 'Invalid review request', 'invalid decisions are denied');
SELECT extensions.lives_ok(
  $$SELECT public.review_facility_submission('31000000-0000-0000-0000-000000000001', 'approved',
    (SELECT updated_at FROM public.facility_submissions WHERE id = '31000000-0000-0000-0000-000000000001'))$$,
  'moderator can approve a pending suggestion');
SELECT extensions.ok(
  (SELECT s.status = 'approved' AND s.reviewed_by = auth.uid() AND s.reviewed_at IS NOT NULL
     AND f.status = 'approved' AND f.name = s.name AND f.submitted_by = s.submitted_by
   FROM public.facility_submissions s JOIN public.facilities f ON f.id = s.approved_facility_id
   WHERE s.id = '31000000-0000-0000-0000-000000000001'),
  'approval records the reviewer and publishes the submitted facility');
SELECT extensions.throws_ok(
  $$SELECT public.review_facility_submission('31000000-0000-0000-0000-000000000001', 'approved', now())$$,
  'P0001', 'Suggestion is no longer pending or is unavailable', 'duplicate review is denied');
SELECT extensions.lives_ok(
  $$SELECT public.review_facility_submission('31000000-0000-0000-0000-000000000002', 'rejected',
    (SELECT updated_at FROM public.facility_submissions WHERE id = '31000000-0000-0000-0000-000000000002'))$$,
  'moderator can reject a pending suggestion');
SELECT extensions.ok(
  (SELECT status = 'rejected' AND approved_facility_id IS NULL AND reviewed_by = auth.uid()
   FROM public.facility_submissions WHERE id = '31000000-0000-0000-0000-000000000002'),
  'rejection records the reviewer without publishing a facility');

SELECT * FROM extensions.finish();
ROLLBACK;
