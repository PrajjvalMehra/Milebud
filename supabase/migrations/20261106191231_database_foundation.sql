-- Application objects belong in public. Use UUID primary keys and timestamptz
-- columns with now() defaults for created_at and updated_at. timestamptz stores
-- UTC instants; use extensions.geography(POINT, 4326) for Earth coordinates.
-- Attach public.set_updated_at() as a BEFORE UPDATE trigger on mutable tables.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.statement_timestamp();
  RETURN NEW;
END;
$function$;