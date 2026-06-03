-- =====================================================================
-- CORRECCIÓN: Sobrecarga y Compatibilidad para manage_user_secure
-- Ejecutar este archivo completo en el SQL Editor de Supabase
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Eliminar versiones previas de la función para evitar conflictos de firmas
DROP FUNCTION IF EXISTS public.manage_user_secure(integer, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.manage_user_secure(integer, text, text, text, text);

-- 2. Crear la función principal con 6 parámetros (incluye teléfono)
CREATE OR REPLACE FUNCTION public.manage_user_secure(
  in_id              integer,
  in_usuario         text,
  in_password        text,
  in_rol             text,
  in_nombre_completo text,
  in_telefono        text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id bigint;
    v_hashed_password text;
    v_col_name text;
    v_rol_id bigint;
BEGIN
    -- Detectar si la columna se llama 'contrasena' o 'password'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'contrasena') THEN
        v_col_name := 'contrasena';
    ELSE
        v_col_name := 'password';
    END IF;

    -- Mapear rol de texto a ID numérico
    IF in_rol = 'ADMIN' THEN v_rol_id := 1;
    ELSIF in_rol = 'CAPTURISTA' THEN v_rol_id := 2;
    ELSE
        BEGIN
            v_rol_id := in_rol::bigint;
        EXCEPTION WHEN OTHERS THEN
            v_rol_id := 2; -- Default capturista si falla la conversión
        END;
    END IF;

    in_usuario := LOWER(TRIM(in_usuario));

    -- Hacer hash a la contraseña si se proporciona una nueva
    IF in_password IS NOT NULL AND in_password <> '' THEN
        v_hashed_password := crypt(in_password, gen_salt('bf'));
    ELSE
        IF in_id > 0 THEN
            EXECUTE format('SELECT %I FROM public.usuarios WHERE id = $1', v_col_name)
            INTO v_hashed_password USING in_id;
        END IF;
    END IF;

    -- Insertar o Actualizar soportando dinámicamente contrasena/password y la columna telefono
    IF in_id = 0 THEN
        EXECUTE format(
            'INSERT INTO public.usuarios (usuario, %I, rol, nombre_completo, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            v_col_name)
        INTO v_id USING in_usuario, v_hashed_password, v_rol_id, in_nombre_completo, in_telefono;
    ELSE
        EXECUTE format(
            'UPDATE public.usuarios SET usuario = $1, %I = $2, rol = $3, nombre_completo = $4, telefono = $5 WHERE id = $6 RETURNING id',
            v_col_name)
        INTO v_id USING in_usuario, v_hashed_password, v_rol_id, in_nombre_completo, in_telefono, in_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'id', v_id, 'used_column', v_col_name, 'used_rol_id', v_rol_id);
END;
$$;

-- 3. Crear la sobrecarga de 5 parámetros para mantener compatibilidad con frontends viejos cacheables
CREATE OR REPLACE FUNCTION public.manage_user_secure(
  in_id              integer,
  in_usuario         text,
  in_password        text,
  in_rol             text,
  in_nombre_completo text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.manage_user_secure(
        in_id,
        in_usuario,
        in_password,
        in_rol,
        in_nombre_completo,
        NULL::text -- Por defecto teléfono en nulo
    );
END;
$$;

-- 4. Asignar permisos de ejecución para roles anon y authenticated (requeridos para login fallback)
GRANT EXECUTE ON FUNCTION public.manage_user_secure(integer, text, text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.manage_user_secure(integer, text, text, text, text) TO anon, authenticated, service_role;

-- 5. Forzar recarga de esquema en PostgREST
NOTIFY pgrst, 'reload schema';
