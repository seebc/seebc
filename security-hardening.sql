-- =====================================================================
-- MIGRACIÓN: Hardening de Seguridad y Cierre de Puertas Traseras
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- 1. Habilitar RLS en todas las tablas principales
ALTER TABLE public.rg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Asegurar la tabla de Usuarios
-- Eliminar cualquier política previa que permita lectura anónima completa
DROP POLICY IF EXISTS "Anon Read Access" ON public.usuarios;

-- Crear política de lectura restringida: Solo administradores o el propio usuario
CREATE POLICY "Users can view their own profile or admins can view all"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.usuarios WHERE user_id = auth.uid() AND rol::text = 'ADMIN')
);

-- 3. Políticas para RG (Representantes Generales)
DROP POLICY IF EXISTS "Enable all access for authenticated" ON public.rg;
CREATE POLICY "Admins full access, Capturistas own records"
ON public.rg
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE user_id = auth.uid() AND rol::text = 'ADMIN') OR
    capturista_id IN (SELECT id FROM public.usuarios WHERE user_id = auth.uid())
);

-- 4. Políticas para RC (Representantes de Casilla)
DROP POLICY IF EXISTS "Enable all access for authenticated" ON public.rc;
CREATE POLICY "Admins full access, Capturistas own records"
ON public.rc
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE user_id = auth.uid() AND rol::text = 'ADMIN') OR
    capturista_id IN (SELECT id FROM public.usuarios WHERE user_id = auth.uid())
);

-- 5. Políticas para Rutas
DROP POLICY IF EXISTS "Enable all access for authenticated" ON public.rutas;
CREATE POLICY "Admins full access, Capturistas own records"
ON public.rutas
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE user_id = auth.uid() AND rol::text = 'ADMIN') OR
    capturista_id IN (SELECT id FROM public.usuarios WHERE user_id = auth.uid())
);

-- 6. Políticas para Casillas (Lectura para todos, Edición para Admins)
DROP POLICY IF EXISTS "Enable read access for all" ON public.casillas;
CREATE POLICY "Anyone authenticated can view casillas"
ON public.casillas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can edit casillas"
ON public.casillas
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.usuarios WHERE user_id = auth.uid() AND rol::text = 'ADMIN'));

-- 7. Función de utilidad para verificar permisos en los RPCs
-- Esta función se usará dentro de los RPCs para una validación más robusta
CREATE OR REPLACE FUNCTION public.check_user_permission(p_target_capturista_id integer)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE user_id = auth.uid() AND (rol::text = 'ADMIN' OR id = p_target_capturista_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Nota sobre el "Fallback Seguro":
-- Si el usuario usa el login personalizado que no genera auth.uid(), 
-- estas políticas BLOQUEARÁN el acceso. Esto es por diseño para evitar 
-- el acceso anónimo no controlado.
