-- Run only against an isolated development database. Never run against production.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('02000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'auto-review-test@example.invalid', '', pg_catalog.now(), '{}', '{}', pg_catalog.now(), pg_catalog.now()),
  ('02000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'auto-review-test-two@example.invalid', '', pg_catalog.now(), '{}', '{}', pg_catalog.now(), pg_catalog.now()),
  ('02000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'auto-review-test-three@example.invalid', '', pg_catalog.now(), '{}', '{}', pg_catalog.now(), pg_catalog.now());

INSERT INTO public.trusted_facility_sources (
  id, source_name, source_reference, verified_at, expires_at, name, facility_type,
  location, address, city, country_code
) VALUES
  ('41000000-0000-0000-0000-000000000001', 'test', 'one', now() - interval '1 day',
   now() + interval '1 day', 'Trusted Stop', 'truck_stop',
   extensions.st_geogfromtext('SRID=4326;POINT(-123 49)'), '100 Main St', 'Testville', 'CA'),
  ('41000000-0000-0000-0000-000000000002', 'test', 'expired', now() - interval '2 days',
   now() - interval '1 day', 'Expired Stop', 'truck_stop',
   extensions.st_geogfromtext('SRID=4326;POINT(-122 49)'), '200 Main St', 'Testville', 'CA');

SELECT extensions.plan(19);
SELECT extensions.ok(NOT pg_catalog.has_table_privilege('authenticated', 'public.trusted_facility_sources', 'SELECT'),
  'users cannot read or manipulate trusted records');
SELECT extensions.ok(NOT pg_catalog.has_table_privilege('authenticated', 'public.trusted_facility_sources', 'INSERT'),
  'users cannot create trusted records');
SELECT extensions.ok(NOT pg_catalog.has_table_privilege('authenticated', 'public.facility_auto_review_events', 'SELECT'),
  'automatic review audit is private');

SELECT pg_catalog.set_config('request.jwt.claims',
  '{"sub":"02000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.facility_submissions (submitted_by, name, facility_type, location, address, city, country_code, website)
VALUES (auth.uid(), 'Trusted Stop', 'truck_stop',
  extensions.st_geogfromtext('SRID=4326;POINT(-123 49)'), '100 Main St', 'Testville', 'CA', 'https://unverified.invalid');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Trusted Stop'),
  'approved', 'matching trusted record is automatically approved');
SELECT extensions.ok((SELECT f.website IS NULL AND f.name = 'Trusted Stop' AND s.reviewed_by IS NULL
  FROM public.facility_submissions s JOIN public.facilities f ON f.id = s.approved_facility_id
  WHERE s.name='Trusted Stop'),
  'published data comes from trusted source and cannot include unverified website');

INSERT INTO public.facility_submissions (submitted_by, name, facility_type, location, address, city, country_code)
VALUES
 (auth.uid(), 'Trusted Stop', 'truck_stop',
  extensions.st_geogfromtext('SRID=4326;POINT(-123 49)'), '100 Main St', 'Testville', 'CA'),
 (auth.uid(), 'Expired Stop', 'truck_stop',
  extensions.st_geogfromtext('SRID=4326;POINT(-122 49)'), '200 Main St', 'Testville', 'CA'),
 (auth.uid(), 'Unknown Stop', 'truck_stop',
  extensions.st_geogfromtext('SRID=4326;POINT(-120 49)'), '300 Main St', 'Testville', 'CA'),
 (auth.uid(), 'Other Stop', 'truck_stop',
  extensions.st_geogfromtext('SRID=4326;POINT(-119 49)'), NULL, 'Testville', 'CA');
SELECT extensions.is((SELECT pg_catalog.count(*) FROM public.facility_submissions WHERE name='Trusted Stop' AND status='pending'),
  1::bigint, 'nearby duplicate remains pending');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Expired Stop'),
  'pending', 'expired source does not approve');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Unknown Stop'),
  'pending', 'unmatched source remains pending');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Other Stop'),
  'pending', 'missing address remains pending');

RESET ROLE;
INSERT INTO public.trusted_facility_sources (
  source_name, source_reference, verified_at, expires_at, name, facility_type,
  location, address, city, country_code
) VALUES ('test', 'rate', now() - interval '1 day', now() + interval '1 day', 'Rate Stop', 'truck_stop',
  extensions.st_geogfromtext('SRID=4326;POINT(-118 49)'), '400 Main St', 'Testville', 'CA');
SET LOCAL ROLE authenticated;
INSERT INTO public.facility_submissions (submitted_by, name, facility_type, location, address, city, country_code)
VALUES (auth.uid(), 'Rate Stop', 'truck_stop',
  extensions.st_geogfromtext('SRID=4326;POINT(-118 49)'), '400 Main St', 'Testville', 'CA');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Rate Stop'),
  'pending', 'sixth submission within an hour remains pending');

RESET ROLE;
SELECT extensions.is((SELECT reason FROM public.facility_auto_review_events
 WHERE submission_id=(SELECT id FROM public.facility_submissions WHERE name='Rate Stop')),
 'submission_rate', 'pending decision is audited');

INSERT INTO public.trusted_facility_sources (
  source_name, source_reference, verified_at, expires_at, name, facility_type,
  location, address, city, country_code
) VALUES
  ('test', 'ambiguous-1', now() - interval '1 day', now() + interval '1 day', 'Ambiguous Stop',
   'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-117 49)'), '500 Main St', 'Testville', 'CA'),
  ('test', 'ambiguous-2', now() - interval '1 day', now() + interval '1 day', 'Ambiguous Stop',
   'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-117 49)'), '500 Main St', 'Testville', 'CA'),
  ('test', 'edit', now() - interval '1 day', now() + interval '1 day', 'Edit Stop',
   'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-116 49)'), '600 Main St', 'Testville', 'CA');
SELECT pg_catalog.set_config('request.jwt.claims',
  '{"sub":"02000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.facility_submissions (submitted_by, name, facility_type, location, address, city, country_code)
VALUES
  (auth.uid(), 'Ambiguous Stop', 'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-117 49)'),
   '500 Main St', 'Testville', 'CA'),
  (auth.uid(), 'Edit Stop', 'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-116 49)'),
   'wrong address', 'Testville', 'CA'),
  (auth.uid(), 'Rate Stop', 'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-118.01 49)'),
   '400 Main St', 'Testville', 'CA');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Ambiguous Stop'),
  'pending', 'multiple trusted matches remain pending');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Edit Stop'),
  'pending', 'incorrect address remains pending');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Rate Stop' AND submitted_by=auth.uid()),
  'pending', 'location outside the matching radius remains pending');
UPDATE public.facility_submissions SET address='600 Main St' WHERE name='Edit Stop';
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Edit Stop'),
  'approved', 'correcting a pending submission triggers review');

RESET ROLE;
INSERT INTO public.trusted_facility_sources (
  source_name, source_reference, verified_at, expires_at, name, facility_type,
  location, address, city, country_code
) VALUES
  ('test', 'radius', now() - interval '1 day', now() + interval '1 day', 'Radius Stop',
   'truck_stop', extensions.st_geogfromtext('SRID=4326;POINT(-100 40)'), '700 Main St', 'Testville', 'US'),
  ('test', 'duplicate-near', now() - interval '1 day', now() + interval '1 day', 'Nearby Stop',
   'truck_stop', extensions.st_project(extensions.st_geogfromtext('SRID=4326;POINT(-100 40)'), 199, 0),
   '800 Main St', 'Testville', 'US'),
  ('test', 'duplicate-far', now() - interval '1 day', now() + interval '1 day', 'Far Stop',
   'truck_stop', extensions.st_project(extensions.st_geogfromtext('SRID=4326;POINT(-100 40)'), 201, 0),
   '900 Main St', 'Testville', 'US');
SELECT pg_catalog.set_config('request.jwt.claims',
  '{"sub":"02000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.facility_submissions (submitted_by, name, facility_type, location, address, city, country_code)
VALUES (auth.uid(), 'Radius Stop', 'truck_stop',
  extensions.st_project(extensions.st_geogfromtext('SRID=4326;POINT(-100 40)'), 76, 0), '700 Main St', 'Testville', 'US');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Radius Stop'),
  'pending', '76 metres does not match the trusted location');
INSERT INTO public.facility_submissions (submitted_by, name, facility_type, location, address, city, country_code)
VALUES (auth.uid(), 'Radius Stop', 'truck_stop',
  extensions.st_project(extensions.st_geogfromtext('SRID=4326;POINT(-100 40)'), 74, 0), '700 Main St', 'Testville', 'US');
SELECT extensions.is((SELECT pg_catalog.count(*) FROM public.facility_submissions WHERE name='Radius Stop' AND status='approved'),
  1::bigint, '74 metres matches the trusted location');
INSERT INTO public.facility_submissions (submitted_by, name, facility_type, location, address, city, country_code)
VALUES
  (auth.uid(), 'Nearby Stop', 'truck_stop',
   extensions.st_project(extensions.st_geogfromtext('SRID=4326;POINT(-100 40)'), 199, 0), '800 Main St', 'Testville', 'US'),
  (auth.uid(), 'Far Stop', 'truck_stop',
   extensions.st_project(extensions.st_geogfromtext('SRID=4326;POINT(-100 40)'), 201, 0), '900 Main St', 'Testville', 'US');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Nearby Stop'),
  'pending', 'facility 199 metres away prevents automatic approval');
SELECT extensions.is((SELECT status FROM public.facility_submissions WHERE name='Far Stop'),
  'approved', 'facility 201 metres away does not prevent automatic approval');

SELECT * FROM extensions.finish();
ROLLBACK;
