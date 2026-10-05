-- Agenda Ya Identity/Profile v0.2
-- Extiende el perfil autenticado y agrega onboarding básico de cliente/negocio.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS comuna text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_profile_type_valid'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_profile_type_valid
      CHECK (profile_type IS NULL OR profile_type IN ('customer','business'));
  END IF;
END $$;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS comuna text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  open_time time,
  close_time time,
  active boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, day_of_week),
  CONSTRAINT business_hours_time_valid CHECK (
    (active = false) OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_business_hours_business_day
  ON public.business_hours (business_id, day_of_week);

DROP TRIGGER IF EXISTS trg_business_hours_updated_at ON public.business_hours;
CREATE TRIGGER trg_business_hours_updated_at
BEFORE UPDATE ON public.business_hours
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_hours_member_select ON public.business_hours;
CREATE POLICY business_hours_member_select
ON public.business_hours FOR SELECT TO authenticated
USING (public.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS business_hours_admin_insert ON public.business_hours;
CREATE POLICY business_hours_admin_insert
ON public.business_hours FOR INSERT TO authenticated
WITH CHECK (public.is_business_admin(business_id, auth.uid()));

DROP POLICY IF EXISTS business_hours_admin_update ON public.business_hours;
CREATE POLICY business_hours_admin_update
ON public.business_hours FOR UPDATE TO authenticated
USING (public.is_business_admin(business_id, auth.uid()))
WITH CHECK (public.is_business_admin(business_id, auth.uid()));

DROP POLICY IF EXISTS business_hours_admin_delete ON public.business_hours;
CREATE POLICY business_hours_admin_delete
ON public.business_hours FOR DELETE TO authenticated
USING (public.is_business_admin(business_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;

-- Perfil propio: el usuario autenticado puede leer/editar solamente su fila.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
CREATE POLICY profiles_self_insert
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Bucket público para avatar/logo. La escritura queda restringida al usuario autenticado.
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS profile_media_insert ON storage.objects;
CREATE POLICY profile_media_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS profile_media_update ON storage.objects;
CREATE POLICY profile_media_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS profile_media_delete ON storage.objects;
CREATE POLICY profile_media_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS profile_media_public_read ON storage.objects;
CREATE POLICY profile_media_public_read
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-media');
