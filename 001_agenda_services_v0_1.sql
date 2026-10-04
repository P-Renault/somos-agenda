-- SOMOS AGENDA · SERVICES V0.1
-- Migration additive. Does not modify SOMOS CORE tables.

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_name_not_blank CHECK (NULLIF(btrim(name), '') IS NOT NULL),
  CONSTRAINT services_duration_valid CHECK (duration_minutes BETWEEN 5 AND 1440),
  CONSTRAINT services_price_valid CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_services_business_id
  ON public.services (business_id);

CREATE INDEX IF NOT EXISTS idx_services_business_active
  ON public.services (business_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_business_name_ci
  ON public.services (business_id, lower(btrim(name)));

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS services_select_member ON public.services;
CREATE POLICY services_select_member
  ON public.services
  FOR SELECT
  USING (is_business_member(business_id));

DROP POLICY IF EXISTS services_insert_admin ON public.services;
CREATE POLICY services_insert_admin
  ON public.services
  FOR INSERT
  WITH CHECK (
    is_business_admin(business_id)
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS services_update_admin ON public.services;
CREATE POLICY services_update_admin
  ON public.services
  FOR UPDATE
  USING (is_business_admin(business_id))
  WITH CHECK (is_business_admin(business_id));

DROP POLICY IF EXISTS services_delete_admin ON public.services;
CREATE POLICY services_delete_admin
  ON public.services
  FOR DELETE
  USING (is_business_admin(business_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;

COMMENT ON TABLE public.services IS 'Servicios ofrecidos por cada negocio en Somos Agenda.';
COMMENT ON COLUMN public.services.duration_minutes IS 'Duración estándar del servicio en minutos.';
COMMENT ON COLUMN public.services.price IS 'Precio del servicio en moneda local.';
