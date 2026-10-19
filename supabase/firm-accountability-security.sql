-- Ejecutar una vez en Supabase → SQL Editor → New query.
-- Restringe perfiles y añade bitácora de auditoría inmutable para el despacho.

BEGIN;

-- Elimina políticas anteriores de perfiles para que una regla amplia no anule la protección.
DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_row.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios leen su propio perfil" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Administradores gestionan perfiles" ON public.profiles
  FOR ALL TO authenticated
  USING (lower(coalesce(auth.jwt()->>'email', '')) IN (
    'eldavidprz@gmail.com',
    'marlon.jimenez@jalegal.com.co',
    'marlondavidjimenez22@gmail.com',
    'sebastian.ariza@jalegal.com.co',
    'abogadosebastianariza@gmail.com',
    'contacto@jalegal.com.co'
  ))
  WITH CHECK (lower(coalesce(auth.jwt()->>'email', '')) IN (
    'eldavidprz@gmail.com',
    'marlon.jimenez@jalegal.com.co',
    'marlondavidjimenez22@gmail.com',
    'sebastian.ariza@jalegal.com.co',
    'abogadosebastianariza@gmail.com',
    'contacto@jalegal.com.co'
  ));

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_email TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PASSWORD_RESET')),
  entity TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Administradores leen bitácora" ON public.audit_logs;
DROP POLICY IF EXISTS "Administradores registran bitácora" ON public.audit_logs;

CREATE POLICY "Administradores leen bitácora" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (lower(coalesce(auth.jwt()->>'email', '')) IN (
    'eldavidprz@gmail.com',
    'marlon.jimenez@jalegal.com.co',
    'marlondavidjimenez22@gmail.com',
    'sebastian.ariza@jalegal.com.co',
    'abogadosebastianariza@gmail.com',
    'contacto@jalegal.com.co'
  ));

CREATE POLICY "Administradores registran bitácora" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (lower(coalesce(auth.jwt()->>'email', '')) IN (
    'eldavidprz@gmail.com',
    'marlon.jimenez@jalegal.com.co',
    'marlondavidjimenez22@gmail.com',
    'sebastian.ariza@jalegal.com.co',
    'abogadosebastianariza@gmail.com',
    'contacto@jalegal.com.co'
  ));

-- No se crean políticas de UPDATE ni DELETE: los eventos de auditoría quedan append-only.
COMMIT;
