-- =====================================================================
-- RESTAURAR VISIBILIDAD Y ACCESO A DATOS POR PERMISOS (ESTATAL / MUNICIPAL / DISTRITAL)
-- Ejecutar este script en el Editor SQL de Supabase
-- =====================================================================

-- -----------------------------------------------------------------------
-- 1. Restaurar Políticas RLS para lectura y acceso de la aplicación web
-- (La app usa autenticación mediante validate_login y cliente anon de Supabase)
-- -----------------------------------------------------------------------

-- Eliminar políticas restrictivas que ocultaban los datos
DROP POLICY IF EXISTS "Authenticated only on usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Authenticated only on rg" ON public.rg;
DROP POLICY IF EXISTS "Authenticated only on rc" ON public.rc;
DROP POLICY IF EXISTS "Authenticated only on rutas" ON public.rutas;
DROP POLICY IF EXISTS "Authenticated only on casillas" ON public.casillas;

DROP POLICY IF EXISTS "Allow all on usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow all on rg" ON public.rg;
DROP POLICY IF EXISTS "Allow all on rc" ON public.rc;
DROP POLICY IF EXISTS "Allow all on rutas" ON public.rutas;
DROP POLICY IF EXISTS "Allow all on casillas" ON public.casillas;
DROP POLICY IF EXISTS "Allow all on secciones" ON public.secciones;
DROP POLICY IF EXISTS "Allow all on df" ON public.df;
DROP POLICY IF EXISTS "Allow all on dl" ON public.dl;
DROP POLICY IF EXISTS "Allow all on municipios" ON public.municipios;
DROP POLICY IF EXISTS "Allow all on login_logs" ON public.login_logs;

-- Habilitar RLS en las tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.df ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.login_logs ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para lectura y operaciones de la plataforma
CREATE POLICY "Allow all on usuarios" ON public.usuarios FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rg" ON public.rg FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rc" ON public.rc FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rutas" ON public.rutas FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on casillas" ON public.casillas FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on secciones" ON public.secciones FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on df" ON public.df FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on dl" ON public.dl FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on municipios" ON public.municipios FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on login_logs" ON public.login_logs FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Otorgar permisos GRANT a los roles de Supabase
GRANT ALL ON TABLE public.usuarios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rg TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rc TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rutas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.casillas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secciones TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.df TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.dl TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.municipios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.login_logs TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------
-- 2. Asegurar que las funciones RPC tengan permisos de ejecución
-- -----------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.validate_login(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_privileged(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_rg_secure(integer, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_rc_secure(integer, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_ruta_secure(integer, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_casilla_secure(integer, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.manage_user_secure(integer, text, text, text, text, text, integer, integer, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_secure(integer) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------
-- 3. Sincronización / Backfill de datos territoriales existentes
-- (Garantiza que registros guardados anteriormente tengan sus relaciones completas)
-- -----------------------------------------------------------------------

-- Completar dl_id y municipio_id en rutas existentes que tengan casillas asignadas
DO $$
DECLARE
    r RECORD;
    v_first_cas_id integer;
    v_mun integer;
    v_dl integer;
BEGIN
    FOR r IN SELECT id, casillas_asignada FROM public.rutas WHERE casillas_asignada IS NOT NULL LOOP
        BEGIN
            IF jsonb_array_length(r.casillas_asignada::jsonb) > 0 THEN
                v_first_cas_id := (r.casillas_asignada::jsonb->0)::text::integer;
                SELECT municipio, dl INTO v_mun, v_dl FROM public.casillas WHERE casilla_id = v_first_cas_id;
                IF v_mun IS NOT NULL OR v_dl IS NOT NULL THEN
                    UPDATE public.rutas 
                    SET municipio_id = COALESCE(rutas.municipio_id, v_mun),
                        dl_id = COALESCE(rutas.dl_id, v_dl)
                    WHERE id = r.id;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
