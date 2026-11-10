ALTER TABLE public.facility_submissions
  ADD COLUMN approved_facility_id uuid UNIQUE REFERENCES public.facilities (id) ON DELETE SET NULL;

CREATE POLICY facility_submissions_moderator_read
  ON public.facility_submissions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'is_moderator') = 'true');

CREATE FUNCTION public.pending_facility_reviews(page_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid, name text, facility_type text, address text, city text, region text,
  country_code text, postal_code text, phone text, website text,
  latitude double precision, longitude double precision, created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR (auth.jwt() -> 'app_metadata' ->> 'is_moderator') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Moderator access required' USING ERRCODE = '42501';
  END IF;
  IF page_offset IS NULL OR page_offset < 0 OR page_offset > 10000 THEN
    RAISE EXCEPTION 'Invalid page offset' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT s.id, s.name, s.facility_type, s.address, s.city, s.region,
         s.country_code::text, s.postal_code, s.phone, s.website,
         extensions.st_y(s.location::extensions.geometry),
         extensions.st_x(s.location::extensions.geometry), s.created_at, s.updated_at
  FROM public.facility_submissions AS s
  WHERE s.status = 'pending' AND s.submitted_by <> auth.uid()
  ORDER BY s.created_at, s.id
  LIMIT 21 OFFSET page_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.pending_facility_reviews(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_facility_reviews(integer) TO authenticated;

CREATE FUNCTION public.review_facility_submission(
  submission_id uuid,
  decision text,
  expected_updated_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  submission public.facility_submissions%ROWTYPE;
  reviewer uuid := auth.uid();
  facility_id uuid;
BEGIN
  IF reviewer IS NULL OR (auth.jwt() -> 'app_metadata' ->> 'is_moderator') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Moderator access required' USING ERRCODE = '42501';
  END IF;
  IF decision IS NULL OR decision NOT IN ('approved', 'rejected') OR expected_updated_at IS NULL THEN
    RAISE EXCEPTION 'Invalid review request' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO submission
  FROM public.facility_submissions
  WHERE id = submission_id
  FOR UPDATE;

  IF NOT FOUND OR submission.status <> 'pending' THEN
    RAISE EXCEPTION 'Suggestion is no longer pending or is unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF submission.submitted_by = reviewer THEN
    RAISE EXCEPTION 'Moderators cannot review their own suggestions' USING ERRCODE = '42501';
  END IF;
  IF submission.updated_at IS DISTINCT FROM expected_updated_at THEN
    RAISE EXCEPTION 'Suggestion changed since it was loaded; refresh before reviewing' USING ERRCODE = 'P0001';
  END IF;

  IF decision = 'approved' THEN
    INSERT INTO public.facilities (
      name, facility_type, location, address, city, region, country_code,
      postal_code, phone, website, status, submitted_by
    )
    VALUES (
      submission.name, submission.facility_type, submission.location, submission.address,
      submission.city, submission.region, submission.country_code, submission.postal_code,
      submission.phone, submission.website, 'approved', submission.submitted_by
    )
    RETURNING id INTO facility_id;
  END IF;

  UPDATE public.facility_submissions
  SET status = decision, reviewed_by = reviewer, reviewed_at = pg_catalog.now(),
      approved_facility_id = facility_id
  WHERE id = submission.id;

  RETURN facility_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.review_facility_submission(uuid, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_facility_submission(uuid, text, timestamptz)
  TO authenticated;
