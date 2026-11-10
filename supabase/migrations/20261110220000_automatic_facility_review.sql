-- Only database administrators may manage trusted records and review outcomes.
CREATE TABLE public.trusted_facility_sources (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  source_name text NOT NULL CHECK (pg_catalog.btrim(source_name) <> ''),
  source_reference text NOT NULL CHECK (pg_catalog.btrim(source_reference) <> ''),
  verified_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > verified_at),
  name text NOT NULL CHECK (pg_catalog.btrim(name) <> ''),
  facility_type text NOT NULL,
  location extensions.geography(POINT, 4326) NOT NULL,
  address text NOT NULL CHECK (pg_catalog.btrim(address) <> ''),
  city text NOT NULL CHECK (pg_catalog.btrim(city) <> ''),
  region text,
  country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  postal_code text,
  UNIQUE (source_name, source_reference),
  CHECK (extensions.st_x(location::extensions.geometry) BETWEEN -180 AND 180),
  CHECK (extensions.st_y(location::extensions.geometry) BETWEEN -90 AND 90)
);

CREATE INDEX trusted_facility_sources_location_idx
  ON public.trusted_facility_sources USING gist (location);

CREATE TABLE public.facility_auto_review_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.facility_submissions (id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('approved', 'pending')),
  reason text NOT NULL,
  source_id uuid REFERENCES public.trusted_facility_sources (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.trusted_facility_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_auto_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trusted_facility_sources FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.facility_auto_review_events FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.auto_review_facility_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  matched_source public.trusted_facility_sources%ROWTYPE;
  match_count bigint;
  facility_id uuid;
  reason text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Serialize automatic decisions so concurrent submissions cannot both pass duplicate checks.
  PERFORM pg_catalog.pg_advisory_xact_lock(2047980311);

  IF (SELECT pg_catalog.count(*) FROM public.facility_submissions AS s
      WHERE s.submitted_by = NEW.submitted_by
        AND s.created_at >= pg_catalog.now() - interval '1 hour') > 5 THEN
    reason := 'submission_rate';
  ELSIF NEW.address IS NULL OR pg_catalog.btrim(NEW.address) = ''
     OR NEW.city IS NULL OR pg_catalog.btrim(NEW.city) = '' THEN
    reason := 'missing_address';
  ELSIF EXISTS (
    SELECT 1 FROM public.facilities AS f
    WHERE f.status IN ('approved', 'pending')
      AND extensions.st_dwithin(f.location, NEW.location, 200)
  ) THEN
    reason := 'nearby_facility';
  ELSE
    SELECT pg_catalog.count(*) INTO match_count
    FROM public.trusted_facility_sources AS t
    WHERE t.verified_at <= pg_catalog.now() AND t.expires_at > pg_catalog.now()
      AND t.country_code = NEW.country_code
      AND t.facility_type = NEW.facility_type
      AND pg_catalog.lower(pg_catalog.btrim(t.name)) = pg_catalog.lower(pg_catalog.btrim(NEW.name))
      AND pg_catalog.lower(pg_catalog.btrim(t.address)) = pg_catalog.lower(pg_catalog.btrim(NEW.address))
      AND pg_catalog.lower(pg_catalog.btrim(t.city)) = pg_catalog.lower(pg_catalog.btrim(NEW.city))
      AND extensions.st_dwithin(t.location, NEW.location, 75);

    IF match_count <> 1 THEN
      reason := 'no_unique_trusted_match';
    ELSE
      SELECT t.* INTO matched_source
      FROM public.trusted_facility_sources AS t
      WHERE t.verified_at <= pg_catalog.now() AND t.expires_at > pg_catalog.now()
        AND t.country_code = NEW.country_code
        AND t.facility_type = NEW.facility_type
        AND pg_catalog.lower(pg_catalog.btrim(t.name)) = pg_catalog.lower(pg_catalog.btrim(NEW.name))
        AND pg_catalog.lower(pg_catalog.btrim(t.address)) = pg_catalog.lower(pg_catalog.btrim(NEW.address))
        AND pg_catalog.lower(pg_catalog.btrim(t.city)) = pg_catalog.lower(pg_catalog.btrim(NEW.city))
        AND extensions.st_dwithin(t.location, NEW.location, 75);

      INSERT INTO public.facilities (
        name, facility_type, location, address, city, region, country_code, postal_code,
        status, submitted_by
      ) VALUES (
        matched_source.name, matched_source.facility_type, matched_source.location,
        matched_source.address, matched_source.city, matched_source.region,
        matched_source.country_code, matched_source.postal_code, 'approved', NEW.submitted_by
      ) RETURNING id INTO facility_id;

      UPDATE public.facility_submissions
      SET status = 'approved', reviewed_at = pg_catalog.now(), reviewed_by = NULL,
          approved_facility_id = facility_id
      WHERE id = NEW.id;

      INSERT INTO public.facility_auto_review_events (submission_id, result, reason, source_id)
      VALUES (NEW.id, 'approved', 'trusted_match', matched_source.id);
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.facility_auto_review_events (submission_id, result, reason)
  VALUES (NEW.id, 'pending', reason);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.auto_review_facility_submission() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER facility_submission_auto_review_insert
  AFTER INSERT ON public.facility_submissions
  FOR EACH ROW EXECUTE FUNCTION public.auto_review_facility_submission();

CREATE TRIGGER facility_submission_auto_review_edit
  AFTER UPDATE OF name, facility_type, location, address, city, region, country_code, postal_code
  ON public.facility_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.auto_review_facility_submission();
