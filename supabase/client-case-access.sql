-- Ejecutar una sola vez en Supabase SQL Editor.
-- Clientes autenticados solo leen casos y datos relacionados asignados a su UID/correo.
-- Administradores autorizados conservan acceso de gestión completo.

-- 8. POLÍTICAS RLS: cada cliente solo puede leer sus casos y datos relacionados
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- Quitar políticas previas para que ninguna regla amplia anule estas restricciones.
DO $$
DECLARE
  table_name TEXT;
  policy_row RECORD;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['cases', 'agenda_items', 'history_items', 'documents', 'financial_records'] LOOP
    FOR policy_row IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, table_name);
    END LOOP;
  END LOOP;
END $$;

-- Los administradores del despacho pueden gestionar todos los registros.
CREATE POLICY "Administradores gestionan casos" ON public.cases
  FOR ALL TO authenticated
  USING (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'))
  WITH CHECK (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'));

-- Los clientes solo leen los casos asignados por UID o correo.
CREATE POLICY "Clientes leen casos asignados" ON public.cases
  FOR SELECT TO authenticated
  USING (
    CAST(client_id AS text) = CAST(auth.uid() AS text)
    OR lower(trim(coalesce(client_email, ''))) = lower(trim(coalesce(auth.jwt()->>'email', '')))
  );

-- Agenda, historial y documentos quedan visibles solo para el despacho y el cliente asignado al caso.
CREATE POLICY "Administradores gestionan agenda" ON public.agenda_items
  FOR ALL TO authenticated
  USING (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'))
  WITH CHECK (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'));
CREATE POLICY "Clientes leen agenda asignada" ON public.agenda_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE CAST(c.id AS text) = CAST(agenda_items.case_id AS text) AND (CAST(c.client_id AS text) = CAST(auth.uid() AS text) OR lower(trim(coalesce(c.client_email, ''))) = lower(trim(coalesce(auth.jwt()->>'email', ''))))));

CREATE POLICY "Administradores gestionan historial" ON public.history_items
  FOR ALL TO authenticated
  USING (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'))
  WITH CHECK (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'));
CREATE POLICY "Clientes leen historial asignado" ON public.history_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE CAST(c.id AS text) = CAST(history_items.case_id AS text) AND (CAST(c.client_id AS text) = CAST(auth.uid() AS text) OR lower(trim(coalesce(c.client_email, ''))) = lower(trim(coalesce(auth.jwt()->>'email', ''))))));

CREATE POLICY "Administradores gestionan documentos" ON public.documents
  FOR ALL TO authenticated
  USING (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'))
  WITH CHECK (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'));
CREATE POLICY "Clientes leen documentos asignados" ON public.documents
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE CAST(c.id AS text) = CAST(documents.case_id AS text) AND (CAST(c.client_id AS text) = CAST(auth.uid() AS text) OR lower(trim(coalesce(c.client_email, ''))) = lower(trim(coalesce(auth.jwt()->>'email', ''))))));

CREATE POLICY "Administradores gestionan finanzas" ON public.financial_records
  FOR ALL TO authenticated
  USING (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'))
  WITH CHECK (lower(coalesce(auth.jwt()->>'email', '')) IN ('eldavidprz@gmail.com', 'marlon.jimenez@jalegal.com.co', 'marlondavidjimenez22@gmail.com', 'sebastian.ariza@jalegal.com.co', 'abogadosebastianariza@gmail.com', 'contacto@jalegal.com.co'));
CREATE POLICY "Clientes leen finanzas asignadas" ON public.financial_records
  FOR SELECT TO authenticated
  USING (
    CAST(client_id AS text) = CAST(auth.uid() AS text)
    OR EXISTS (SELECT 1 FROM public.cases c WHERE CAST(c.id AS text) = CAST(financial_records.case_id AS text) AND (CAST(c.client_id AS text) = CAST(auth.uid() AS text) OR lower(trim(coalesce(c.client_email, ''))) = lower(trim(coalesce(auth.jwt()->>'email', '')))))
  );

