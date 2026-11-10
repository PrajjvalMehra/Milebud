CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  name text NOT NULL,
  facility_type text NOT NULL,
  location extensions.geography(POINT, 4326) NOT NULL,
  address text,
  city text,
  region text,
  country_code char(2) NOT NULL,
  postal_code text,
  phone text,
  website text,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT facilities_name_nonempty CHECK (pg_catalog.btrim(name) <> ''),
  CONSTRAINT facilities_type_valid CHECK (
    facility_type IN (
      'truck_stop',
      'shipper',
      'receiver',
      'rest_area',
      'weigh_station',
      'fuel_station',
      'repair_shop',
      'parking_facility',
      'other'
    )
  ),
  CONSTRAINT facilities_country_code_valid CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT facilities_status_valid CHECK (
    status IN ('pending', 'approved', 'rejected', 'inactive')
  ),
  CONSTRAINT facilities_location_valid CHECK (
    extensions.st_x(location::extensions.geometry) BETWEEN -180 AND 180
    AND extensions.st_y(location::extensions.geometry) BETWEEN -90 AND 90
  )
);

CREATE INDEX facilities_type_idx ON public.facilities (facility_type);
CREATE INDEX facilities_country_code_idx ON public.facilities (country_code);
CREATE INDEX facilities_status_idx ON public.facilities (status);
CREATE INDEX facilities_submitted_by_idx ON public.facilities (submitted_by);
CREATE INDEX facilities_location_gist_idx ON public.facilities USING gist (location);

CREATE TABLE public.facility_amenities (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities (id) ON DELETE CASCADE,
  amenity text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT facility_amenities_amenity_valid CHECK (
    amenity IN (
      'truck_parking',
      'free_parking',
      'paid_parking',
      'showers',
      'restrooms',
      'restaurant',
      'fuel',
      'ev_charging',
      'laundry',
      'wifi',
      'security',
      'overnight_parking',
      'repair_service',
      'scales'
    )
  ),
  CONSTRAINT facility_amenities_facility_amenity_unique UNIQUE (facility_id, amenity)
);

CREATE TABLE public.facility_submissions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  facility_type text NOT NULL,
  location extensions.geography(POINT, 4326) NOT NULL,
  address text,
  city text,
  region text,
  country_code char(2) NOT NULL,
  postal_code text,
  phone text,
  website text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT facility_submissions_name_nonempty CHECK (pg_catalog.btrim(name) <> ''),
  CONSTRAINT facility_submissions_type_valid CHECK (
    facility_type IN (
      'truck_stop',
      'shipper',
      'receiver',
      'rest_area',
      'weigh_station',
      'fuel_station',
      'repair_shop',
      'parking_facility',
      'other'
    )
  ),
  CONSTRAINT facility_submissions_country_code_valid CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT facility_submissions_status_valid CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  CONSTRAINT facility_submissions_review_consistent CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL)
  ),
  CONSTRAINT facility_submissions_location_valid CHECK (
    extensions.st_x(location::extensions.geometry) BETWEEN -180 AND 180
    AND extensions.st_y(location::extensions.geometry) BETWEEN -90 AND 90
  )
);

CREATE INDEX facility_submissions_type_idx
  ON public.facility_submissions (facility_type);
CREATE INDEX facility_submissions_country_code_idx
  ON public.facility_submissions (country_code);
CREATE INDEX facility_submissions_status_idx
  ON public.facility_submissions (status);
CREATE INDEX facility_submissions_submitted_by_idx
  ON public.facility_submissions (submitted_by);
CREATE INDEX facility_submissions_reviewed_by_idx
  ON public.facility_submissions (reviewed_by);
CREATE INDEX facility_submissions_location_gist_idx
  ON public.facility_submissions USING gist (location);

CREATE TRIGGER facilities_set_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER facility_submissions_set_updated_at
  BEFORE UPDATE ON public.facility_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_submissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.facilities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.facility_amenities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.facility_submissions FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.facilities TO anon, authenticated;
GRANT SELECT ON TABLE public.facility_amenities TO anon, authenticated;
GRANT SELECT ON TABLE public.facility_submissions TO authenticated;
GRANT INSERT (
  submitted_by,
  name,
  facility_type,
  location,
  address,
  city,
  region,
  country_code,
  postal_code,
  phone,
  website
) ON TABLE public.facility_submissions TO authenticated;
GRANT UPDATE (
  name,
  facility_type,
  location,
  address,
  city,
  region,
  country_code,
  postal_code,
  phone,
  website
) ON TABLE public.facility_submissions TO authenticated;

CREATE POLICY facilities_approved_read
  ON public.facilities
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY facility_amenities_approved_read
  ON public.facility_amenities
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.facilities
      WHERE facilities.id = facility_amenities.facility_id
        AND facilities.status = 'approved'
    )
  );

CREATE POLICY facility_submissions_owner_read
  ON public.facility_submissions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = submitted_by);

CREATE POLICY facility_submissions_owner_insert
  ON public.facility_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = submitted_by);

CREATE POLICY facility_submissions_owner_update_pending
  ON public.facility_submissions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = submitted_by AND status = 'pending')
  WITH CHECK ((SELECT auth.uid()) = submitted_by AND status = 'pending');