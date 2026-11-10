CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL CONSTRAINT profiles_username_unique UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT profiles_username_lowercase CHECK (username = pg_catalog.lower(username)),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  CONSTRAINT profiles_username_not_reserved CHECK (
    username NOT IN ('admin', 'administrator', 'support', 'moderator', 'milebud')
  )
);

CREATE TABLE public.private_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  real_name text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER private_profiles_set_updated_at
  BEFORE UPDATE ON public.private_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.private_profiles FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (username, display_name, avatar_url, bio)
  ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.private_profiles TO authenticated;
GRANT UPDATE (real_name) ON TABLE public.private_profiles TO authenticated;

CREATE POLICY profiles_public_read
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY profiles_owner_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY private_profiles_owner_read
  ON public.private_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY private_profiles_owner_update
  ON public.private_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_username text;
  v_display_name text;
  v_profile_id uuid;
  v_profile_exists boolean;
  v_attempt bigint := 0;
BEGIN
  v_username := pg_catalog.lower(
    NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'username'), '')
  );
  v_display_name := NULLIF(
    pg_catalog.btrim(NEW.raw_user_meta_data ->> 'display_name'),
    ''
  );

  IF v_username IS NOT NULL
     AND v_username ~ '^[a-z0-9_]{3,24}$'
     AND v_username NOT IN ('admin', 'administrator', 'support', 'moderator', 'milebud') THEN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, v_username, v_display_name)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_profile_id;
  END IF;

  IF v_profile_id IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = NEW.id
    ) INTO v_profile_exists;

    WHILE NOT v_profile_exists LOOP
      v_username := 'user_' || pg_catalog.substr(
        pg_catalog.md5(NEW.id::text || ':' || v_attempt::text),
        1,
        19
      );

      INSERT INTO public.profiles (id, username, display_name)
      VALUES (NEW.id, v_username, v_display_name)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_profile_id;

      IF v_profile_id IS NOT NULL THEN
        v_profile_exists := true;
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM public.profiles WHERE id = NEW.id
        ) INTO v_profile_exists;
        v_attempt := v_attempt + 1;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.private_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();