-- Agenda Ya · Business Hours RLS fix v0.4.2
-- Motivo: 001_core_foundation_v0_1 define is_business_member(p_business_id uuid)
-- y is_business_admin(p_business_id uuid). La política anterior de 005_identity_profiles_v0_2
-- intentaba invocarlas con dos argumentos (business_id, auth.uid()), provocando que el guardado
-- del horario fallara y el onboarding no pudiera avanzar al panel Agenda Ya.

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_hours_member_select ON public.business_hours;
DROP POLICY IF EXISTS business_hours_admin_insert ON public.business_hours;
DROP POLICY IF EXISTS business_hours_admin_update ON public.business_hours;
DROP POLICY IF EXISTS business_hours_admin_delete ON public.business_hours;

CREATE POLICY business_hours_member_select
ON public.business_hours FOR SELECT TO authenticated
USING (public.is_business_member(business_id));

CREATE POLICY business_hours_admin_insert
ON public.business_hours FOR INSERT TO authenticated
WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY business_hours_admin_update
ON public.business_hours FOR UPDATE TO authenticated
USING (public.is_business_admin(business_id))
WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY business_hours_admin_delete
ON public.business_hours FOR DELETE TO authenticated
USING (public.is_business_admin(business_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
