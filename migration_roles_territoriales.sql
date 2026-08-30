-- =====================================================================
-- MIGRACIÓN: Roles Territoriales (Estatal, Municipal, Distrital)
-- Ejecutar este script en el Editor SQL de Supabase
-- =====================================================================

-- 1. Eliminar dinámicamente cualquier política RLS previa que dependa de la columna 'rol'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('casillas', 'rg', 'rc', 'rutas', 'usuarios', 'login_logs')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. Eliminar Foreign Key constraint de 'rol' si existe
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_fkey;

-- 3. Asegurar que la columna 'rol' en usuarios sea de tipo VARCHAR para soportar nombres de roles
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'rol' AND data_type NOT IN ('character varying', 'text')
    ) THEN
        ALTER TABLE public.usuarios ALTER COLUMN rol TYPE VARCHAR(50) USING (
            CASE 
                WHEN rol::text = '1' THEN 'ADMIN'
                WHEN rol::text = '2' THEN 'ESTATAL'
                ELSE rol::text 
            END
        );
    END IF;
END $$;

-- 4. Otorgar permisos completos (GRANT) sobre las tablas a los roles de Supabase
GRANT ALL ON TABLE public.usuarios TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rg TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rc TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rutas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.casillas TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Recrear políticas RLS para permitir todas las operaciones (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Allow all on usuarios" ON public.usuarios FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rg" ON public.rg FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rc" ON public.rc FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on rutas" ON public.rutas FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on casillas" ON public.casillas FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 6. Agregar columnas de asignación territorial si no existen
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES public.municipios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dl_id INTEGER REFERENCES public.dl(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

-- 7. Crear o actualizar función is_admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id integer) RETURNS boolean AS $$
DECLARE
  v_rol text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  SELECT rol::text INTO v_rol FROM public.usuarios WHERE id = p_user_id;
  RETURN COALESCE(TRIM(v_rol) = '1' OR UPPER(TRIM(v_rol)) IN ('ADMIN', 'ESTATAL'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Limpiar sobrecargas anteriores de manage_user_secure
DROP FUNCTION IF EXISTS public.manage_user_secure(integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.manage_user_secure(integer, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.manage_user_secure(integer, text, text, text, text, text, integer, integer);

-- 9. Crear la nueva versión de manage_user_secure con soporte territorial
CREATE OR REPLACE FUNCTION public.manage_user_secure(
  in_id              integer,
  in_usuario         text,
  in_password        text,
  in_rol             text,
  in_nombre_completo text,
  in_telefono        text DEFAULT NULL,
  in_municipio_id    integer DEFAULT NULL,
  in_dl_id           integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id bigint;
    v_hashed_password text;
    v_col_name text;
    v_final_rol text;
BEGIN
    -- Detectar nombre de columna de password
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'contrasena') THEN
        v_col_name := 'contrasena';
    ELSE
        v_col_name := 'password';
    END IF;

    -- Normalizar rol
    v_final_rol := UPPER(TRIM(COALESCE(in_rol, 'ESTATAL')));
    IF v_final_rol = '1' THEN v_final_rol := 'ADMIN';
    ELSIF v_final_rol = '2' THEN v_final_rol := 'ESTATAL';
    END IF;

    in_usuario := LOWER(TRIM(in_usuario));

    -- Hashear contraseña si fue provista
    IF in_password IS NOT NULL AND in_password <> '' THEN
        v_hashed_password := crypt(in_password, gen_salt('bf'));
    ELSE
        IF in_id > 0 THEN
            EXECUTE format('SELECT %I FROM public.usuarios WHERE id = $1', v_col_name)
            INTO v_hashed_password USING in_id;
        END IF;
    END IF;

    -- Insertar o actualizar usuario con municipio_id y dl_id
    IF in_id = 0 OR in_id IS NULL THEN
        EXECUTE format(
            'INSERT INTO public.usuarios (usuario, %I, rol, nombre_completo, telefono, municipio_id, dl_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            v_col_name
        )
        INTO v_id USING in_usuario, v_hashed_password, v_final_rol, in_nombre_completo, in_telefono, in_municipio_id, in_dl_id;
    ELSE
        EXECUTE format(
            'UPDATE public.usuarios SET 
                usuario = $1, 
                %I = $2, 
                rol = $3, 
                nombre_completo = $4, 
                telefono = $5,
                municipio_id = $6,
                dl_id = $7
             WHERE id = $8 RETURNING id',
            v_col_name
        )
        INTO v_id USING in_usuario, v_hashed_password, v_final_rol, in_nombre_completo, in_telefono, in_municipio_id, in_dl_id, in_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'id', v_id, 
        'used_column', v_col_name, 
        'rol', v_final_rol,
        'municipio_id', in_municipio_id,
        'dl_id', in_dl_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manage_user_secure(integer, text, text, text, text, text, integer, integer) TO anon, authenticated, service_role;

-- 10. Función RPC para eliminar usuarios de forma segura
CREATE OR REPLACE FUNCTION public.delete_user_secure(p_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.usuarios WHERE id = p_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_secure(integer) TO anon, authenticated, service_role;

-- 11. Actualizar validate_login para retornar datos territoriales completos usando SQL dinámico
CREATE OR REPLACE FUNCTION public.validate_login(p_usuario text, p_contrasena text)
RETURNS jsonb AS $$
DECLARE
    v_user jsonb;
    v_col_name text;
    v_sql text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'contrasena') THEN
        v_col_name := 'contrasena';
    ELSE
        v_col_name := 'password';
    END IF;

    v_sql := format('
        SELECT 
            jsonb_build_object(
                ''id'', u.id,
                ''usuario'', u.usuario,
                ''rol'', u.rol,
                ''nombre_completo'', u.nombre_completo,
                ''telefono'', u.telefono,
                ''municipio_id'', u.municipio_id,
                ''dl_id'', u.dl_id,
                ''nombre_municipio'', m.municipio,
                ''numero_dl'', dl.dl
            )
        FROM public.usuarios u
        LEFT JOIN public.municipios m ON m.id = u.municipio_id
        LEFT JOIN public.dl dl ON dl.id = u.dl_id
        WHERE LOWER(u.usuario) = LOWER(TRIM($1))
          AND u.%I = crypt($2, u.%I)
    ', v_col_name, v_col_name);

    EXECUTE v_sql INTO v_user USING p_usuario, p_contrasena;

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Credenciales no válidas';
    END IF;

    RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.validate_login(text, text) TO anon, authenticated, service_role;

-- 12. Notificar a PostgREST para recargar esquema
NOTIFY pgrst, 'reload schema';
