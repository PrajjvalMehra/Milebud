CREATE TABLE public.facility_reports (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities (id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users (id) ON DELETE CASCADE,
  report_type text NOT NULL,
  parking_status text,
  congestion_level text,
  amenity text,
  amenity_status text,
  fuel_status text,
  wait_time_minutes integer,
  condition_category text,
  condition_status text,
  details text,
  confirmation_count integer NOT NULL DEFAULT 0,
  dispute_count integer NOT NULL DEFAULT 0,
  moderation_status text NOT NULL DEFAULT 'visible',
  moderated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz NOT NULL DEFAULT (pg_catalog.now() + interval '6 hours'),
  CONSTRAINT facility_reports_type_valid CHECK (
    report_type IN (
      'parking_availability',
      'congestion',
      'amenity_availability',
      'fuel_availability',
      'wait_time',
      'facility_condition',
      'access_condition'
    )
  ),
  CONSTRAINT facility_reports_parking_status_valid CHECK (
    parking_status IS NULL OR parking_status IN ('available', 'limited', 'full')
  ),
  CONSTRAINT facility_reports_congestion_level_valid CHECK (
    congestion_level IS NULL
    OR congestion_level IN ('light', 'moderate', 'heavy', 'standstill')
  ),
  CONSTRAINT facility_reports_amenity_valid CHECK (
    amenity IS NULL OR amenity IN (
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
  CONSTRAINT facility_reports_amenity_status_valid CHECK (
    amenity_status IS NULL OR amenity_status IN ('available', 'limited', 'unavailable')
  ),
  CONSTRAINT facility_reports_fuel_status_valid CHECK (
    fuel_status IS NULL OR fuel_status IN ('available', 'limited', 'unavailable')
  ),
  CONSTRAINT facility_reports_wait_time_valid CHECK (
    wait_time_minutes IS NULL OR wait_time_minutes BETWEEN 0 AND 1440
  ),
  CONSTRAINT facility_reports_condition_category_valid CHECK (
    condition_category IS NULL OR condition_category IN (
      'parking_area',
      'restrooms',
      'showers',
      'access_road',
      'security',
      'cleanliness',
      'lighting',
      'other'
    )
  ),
  CONSTRAINT facility_reports_condition_status_valid CHECK (
    condition_status IS NULL OR condition_status IN ('good', 'fair', 'poor', 'closed')
  ),
  CONSTRAINT facility_reports_type_data_valid CHECK (
    CASE report_type
      WHEN 'parking_availability' THEN
        parking_status IS NOT NULL
        AND congestion_level IS NULL AND amenity IS NULL AND amenity_status IS NULL
        AND fuel_status IS NULL AND wait_time_minutes IS NULL
        AND condition_category IS NULL AND condition_status IS NULL
      WHEN 'congestion' THEN
        congestion_level IS NOT NULL
        AND parking_status IS NULL AND amenity IS NULL AND amenity_status IS NULL
        AND fuel_status IS NULL AND wait_time_minutes IS NULL
        AND condition_category IS NULL AND condition_status IS NULL
      WHEN 'amenity_availability' THEN
        amenity IS NOT NULL AND amenity_status IS NOT NULL
        AND parking_status IS NULL AND congestion_level IS NULL
        AND fuel_status IS NULL AND wait_time_minutes IS NULL
        AND condition_category IS NULL AND condition_status IS NULL
      WHEN 'fuel_availability' THEN
        fuel_status IS NOT NULL
        AND parking_status IS NULL AND congestion_level IS NULL
        AND amenity IS NULL AND amenity_status IS NULL
        AND wait_time_minutes IS NULL
        AND condition_category IS NULL AND condition_status IS NULL
      WHEN 'wait_time' THEN
        wait_time_minutes IS NOT NULL
        AND parking_status IS NULL AND congestion_level IS NULL
        AND amenity IS NULL AND amenity_status IS NULL AND fuel_status IS NULL
        AND condition_category IS NULL AND condition_status IS NULL
      ELSE
        parking_status IS NULL AND congestion_level IS NULL
        AND amenity IS NULL AND amenity_status IS NULL
        AND fuel_status IS NULL AND wait_time_minutes IS NULL
        AND (
          (condition_category IS NULL AND condition_status IS NULL)
          OR (condition_category IS NOT NULL AND condition_status IS NOT NULL)
        )
    END
  ),
  CONSTRAINT facility_reports_details_length CHECK (
    details IS NULL OR pg_catalog.char_length(details) <= 500
  ),
  CONSTRAINT facility_reports_counts_nonnegative CHECK (
    confirmation_count >= 0 AND dispute_count >= 0
  ),
  CONSTRAINT facility_reports_moderation_valid CHECK (
    (moderation_status = 'under_review' AND moderated_by IS NULL AND moderated_at IS NULL)
    OR (
      moderation_status = 'visible'
      AND (
        (moderated_by IS NULL AND moderated_at IS NULL)
        OR moderated_at IS NOT NULL
      )
    )
    OR (moderation_status = 'hidden' AND moderated_at IS NOT NULL)
  ),
  CONSTRAINT facility_reports_moderation_status_valid CHECK (
    moderation_status IN ('visible', 'under_review', 'hidden')
  ),
  CONSTRAINT facility_reports_expiry_valid CHECK (
    expires_at > created_at
    AND expires_at <= created_at + interval '24 hours'
  )
);

COMMENT ON COLUMN public.facility_reports.details IS
  'Facility information only; do not include driver location or personal contact details.';

CREATE INDEX facility_reports_facility_expiry_idx
  ON public.facility_reports (facility_id, expires_at DESC);
CREATE INDEX facility_reports_expiry_idx
  ON public.facility_reports (expires_at);
CREATE INDEX facility_reports_moderation_idx
  ON public.facility_reports (moderation_status, created_at DESC)
  WHERE moderation_status <> 'visible';

CREATE TABLE public.facility_report_feedback (
  report_id uuid NOT NULL REFERENCES public.facility_reports (id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users (id) ON DELETE CASCADE,
  feedback_type text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (report_id, user_id),
  CONSTRAINT facility_report_feedback_type_valid CHECK (
    feedback_type IN ('confirm', 'dispute')
  ),
  CONSTRAINT facility_report_feedback_reason_valid CHECK (
    (feedback_type = 'confirm' AND reason IS NULL)
    OR (
      feedback_type = 'dispute'
      AND reason IS NOT NULL
      AND pg_catalog.char_length(pg_catalog.btrim(reason)) BETWEEN 1 AND 500
    )
  )
);

CREATE INDEX facility_report_feedback_user_idx
  ON public.facility_report_feedback (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_facility_report_feedback_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.feedback_type = 'confirm' THEN
    UPDATE public.facility_reports
    SET confirmation_count = confirmation_count + 1
    WHERE id = NEW.report_id;
  ELSE
    UPDATE public.facility_reports
    SET dispute_count = dispute_count + 1,
        moderation_status = CASE
          WHEN dispute_count + 1 >= 3 THEN 'under_review'
          ELSE moderation_status
        END
    WHERE id = NEW.report_id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_facility_report_feedback_counts()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER facility_report_feedback_update_counts
  AFTER INSERT ON public.facility_report_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_facility_report_feedback_counts();

ALTER TABLE public.facility_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_report_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.facility_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.facility_report_feedback FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  facility_id,
  report_type,
  parking_status,
  congestion_level,
  amenity,
  amenity_status,
  fuel_status,
  wait_time_minutes,
  condition_category,
  condition_status,
  details,
  confirmation_count,
  dispute_count,
  created_at,
  expires_at
) ON TABLE public.facility_reports TO anon, authenticated;
GRANT SELECT (moderation_status) ON TABLE public.facility_reports TO authenticated;
GRANT INSERT (
  facility_id,
  report_type,
  parking_status,
  congestion_level,
  amenity,
  amenity_status,
  fuel_status,
  wait_time_minutes,
  condition_category,
  condition_status,
  details
) ON TABLE public.facility_reports TO authenticated;
GRANT UPDATE (moderation_status, moderated_by, moderated_at)
  ON TABLE public.facility_reports TO authenticated;

GRANT SELECT (report_id, feedback_type, reason, created_at)
  ON TABLE public.facility_report_feedback TO authenticated;
GRANT INSERT (report_id, feedback_type, reason)
  ON TABLE public.facility_report_feedback TO authenticated;

CREATE POLICY facility_reports_active_read
  ON public.facility_reports
  FOR SELECT
  TO anon, authenticated
  USING (
    moderation_status = 'visible'
    AND expires_at > pg_catalog.statement_timestamp()
    AND EXISTS (
      SELECT 1
      FROM public.facilities
      WHERE facilities.id = facility_reports.facility_id
        AND facilities.status = 'approved'
    )
  );

CREATE POLICY facility_reports_moderator_read
  ON public.facility_reports
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'is_moderator') = 'true');

CREATE POLICY facility_reports_authenticated_insert
  ON public.facility_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = submitted_by
    AND EXISTS (
      SELECT 1
      FROM public.facilities
      WHERE facilities.id = facility_reports.facility_id
        AND facilities.status = 'approved'
    )
  );

CREATE POLICY facility_reports_moderator_update
  ON public.facility_reports
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'is_moderator') = 'true')
  WITH CHECK (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'is_moderator') = 'true'
    AND (
      (
        moderation_status = 'under_review'
        AND moderated_by IS NULL
        AND moderated_at IS NULL
      )
      OR (
        moderation_status IN ('visible', 'hidden')
        AND moderated_by = (SELECT auth.uid())
        AND moderated_at IS NOT NULL
      )
    )
  );

CREATE POLICY facility_report_feedback_owner_read
  ON public.facility_report_feedback
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY facility_report_feedback_moderator_read
  ON public.facility_report_feedback
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'is_moderator') = 'true');

CREATE POLICY facility_report_feedback_authenticated_insert
  ON public.facility_report_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.facility_reports
      JOIN public.facilities ON facilities.id = facility_reports.facility_id
      WHERE facility_reports.id = facility_report_feedback.report_id
        AND facility_reports.moderation_status = 'visible'
        AND facility_reports.expires_at > pg_catalog.statement_timestamp()
        AND facilities.status = 'approved'
    )
  );
