-- =====================================================================
-- SECURITY PATCH v5: Fixes CRIT-01, CRIT-02, BUG-03, BUG-04
-- Ejecutar en el Editor SQL de Supabase DESPUÉS de migration_roles_territoriales.sql
-- =====================================================================

-- -----------------------------------------------------------------------
-- BUG-04: Eliminar acceso 'anon' a tablas sensibles (RLS)
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all on usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow all on rg" ON public.rg;
DROP POLICY IF EXISTS "Allow all on rc" ON public.rc;
DROP POLICY IF EXISTS "Allow all on rutas" ON public.rutas;
DROP POLICY IF EXISTS "Allow all on casillas" ON public.casillas;

CREATE POLICY "Authenticated only on usuarios" ON public.usuarios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated only on rg" ON public.rg
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated only on rc" ON public.rc
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated only on rutas" ON public.rutas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated only on casillas" ON public.casillas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------
-- BUG-03: Unificar is_admin + nueva is_privileged
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id integer) RETURNS boolean AS $$
DECLARE
  v_rol text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  SELECT rol::text INTO v_rol FROM public.usuarios WHERE id = p_user_id;
  RETURN COALESCE(UPPER(TRIM(v_rol)) = 'ADMIN', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_privileged(p_user_id integer) RETURNS boolean AS $$
DECLARE
  v_rol text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  SELECT rol::text INTO v_rol FROM public.usuarios WHERE id = p_user_id;
  RETURN COALESCE(UPPER(TRIM(v_rol)) IN ('ADMIN', 'ESTATAL'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_privileged(integer) TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- CRIT-01: delete_user_secure con verificacion de rol ADMIN
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_secure(p_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id integer;
  v_caller_rol text;
BEGIN
  BEGIN
    v_caller_id := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::integer;
  EXCEPTION WHEN OTHERS THEN
    v_caller_id := NULL;
  END;

  IF v_caller_id IS NOT NULL THEN
    SELECT rol::text INTO v_caller_rol
    FROM public.usuarios WHERE id = v_caller_id;
  END IF;

  IF v_caller_rol IS NULL THEN
    RAISE EXCEPTION 'No se pudo verificar identidad del invocante';
  END IF;

  IF UPPER(TRIM(v_caller_rol)) != 'ADMIN' THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar usuarios. Rol detectado: %', v_caller_rol;
  END IF;

  IF p_id = v_caller_id THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta de administrador';
  END IF;

  DELETE FROM public.usuarios WHERE id = p_id;
  RETURN jsonb_build_object('success', true, 'deleted_id', p_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_secure(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_secure(integer) TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- CRIT-02: manage_user_secure con verificacion de rol (nuevo parametro in_caller_id)
-- -----------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.manage_user_secure(integer, text, text, text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.manage_user_secure(
  in_id              integer,
  in_usuario         text,
  in_password        text,
  in_rol             text,
  in_nombre_completo text,
  in_telefono        text    DEFAULT NULL,
  in_municipio_id    integer DEFAULT NULL,
  in_dl_id           integer DEFAULT NULL,
  in_caller_id       integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id             bigint;
    v_hashed_password text;
    v_col_name       text;
    v_final_rol      text;
    v_caller_rol     text;
BEGIN
    IF in_caller_id IS NULL THEN
        RAISE EXCEPTION 'Se requiere ID del invocante para esta operacion';
    END IF;

    SELECT rol::text INTO v_caller_rol
    FROM public.usuarios WHERE id = in_caller_id;

    IF UPPER(TRIM(COALESCE(v_caller_rol, ''))) != 'ADMIN' THEN
        RAISE EXCEPTION 'Solo los administradores pueden gestionar usuarios. Rol detectado: %', v_caller_rol;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'usuarios' AND column_name = 'contrasena') THEN
        v_col_name := 'contrasena';
    ELSE
        v_col_name := 'password';
    END IF;

    v_final_rol := UPPER(TRIM(COALESCE(in_rol, 'ESTATAL')));
    IF v_final_rol = '1' THEN v_final_rol := 'ADMIN';
    ELSIF v_final_rol = '2' THEN v_final_rol := 'ESTATAL';
    END IF;

    IF v_final_rol NOT IN ('ADMIN', 'ESTATAL', 'MUNICIPAL', 'DISTRITAL') THEN
        RAISE EXCEPTION 'Rol no valido: %. Valores permitidos: ADMIN, ESTATAL, MUNICIPAL, DISTRITAL', v_final_rol;
    END IF;

    IF v_final_rol = 'MUNICIPAL' AND in_municipio_id IS NULL THEN
        RAISE EXCEPTION 'El rol MUNICIPAL requiere un municipio_id asignado';
    END IF;
    IF v_final_rol = 'DISTRITAL' AND in_dl_id IS NULL THEN
        RAISE EXCEPTION 'El rol DISTRITAL requiere un dl_id asignado';
    END IF;

    in_usuario := LOWER(TRIM(in_usuario));

    IF in_password IS NOT NULL AND in_password <> '' THEN
        v_hashed_password := crypt(in_password, gen_salt('bf'));
    ELSE
        IF in_id > 0 THEN
            EXECUTE format('SELECT %I FROM public.usuarios WHERE id = $1', v_col_name)
            INTO v_hashed_password USING in_id;
        END IF;
    END IF;

    IF in_id = 0 OR in_id IS NULL THEN
        EXECUTE format(
            'INSERT INTO public.usuarios (usuario, %I, rol, nombre_completo, telefono, municipio_id, dl_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            v_col_name
        )
        INTO v_id USING in_usuario, v_hashed_password, v_final_rol,
                        in_nombre_completo, in_telefono, in_municipio_id, in_dl_id;
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
        INTO v_id USING in_usuario, v_hashed_password, v_final_rol,
                        in_nombre_completo, in_telefono, in_municipio_id, in_dl_id, in_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 'id', v_id, 'rol', v_final_rol,
        'municipio_id', in_municipio_id, 'dl_id', in_dl_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.manage_user_secure(integer, text, text, text, text, text, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.manage_user_secure(integer, text, text, text, text, text, integer, integer, integer) TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- Actualizar save_rg_secure y save_rc_secure para usar is_privileged
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_rg_secure(p_id integer, p_payload jsonb)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_owner_id integer;
  v_caller_id integer;
  v_is_privileged boolean;
BEGIN
  v_caller_id := (p_payload->>'capturista_id')::integer;
  v_is_privileged := public.is_privileged(v_caller_id);

  IF p_id IS NOT NULL AND p_id > 0 THEN
    SELECT capturista_id INTO v_owner_id FROM public.rg WHERE id = p_id;
    IF v_caller_id IS NULL OR (v_owner_id IS NOT NULL AND v_owner_id != v_caller_id AND NOT v_is_privileged) THEN
      RAISE EXCEPTION 'No tienes permiso para editar este registro.';
    END IF;
    UPDATE public.rg SET
      nombre = (p_payload->>'nombre')::text,
      apellido_paterno = (p_payload->>'apellido_paterno')::text,
      apellido_materno = (p_payload->>'apellido_materno')::text,
      clave_elector = (p_payload->>'clave_elector')::text,
      numero_credencial = (p_payload->>'numero_credencial')::text,
      cic = (p_payload->>'cic')::text,
      df_id = (p_payload->>'df_id')::integer,
      dl_id = (p_payload->>'dl_id')::integer,
      seccion_id = (p_payload->>'seccion_id')::integer,
      credencial_vigente = (p_payload->>'credencial_vigente')::boolean,
      es_militante = (p_payload->>'es_militante')::boolean,
      calle = (p_payload->>'calle')::text,
      num_ext = (p_payload->>'num_ext')::text,
      num_int = (p_payload->>'num_int')::text,
      colonia = (p_payload->>'colonia')::text,
      codigo_postal = (p_payload->>'codigo_postal')::text,
      telefono = (p_payload->>'telefono')::text,
      correo_electronico = (p_payload->>'correo_electronico')::text,
      autoriza_propaganda = (p_payload->>'autoriza_propaganda')::boolean,
      tipo_propaganda = (p_payload->>'tipo_propaganda')::public.tipo_propaganda,
      firma_capturada = (p_payload->>'firma_capturada')::boolean
    WHERE id = p_id
    RETURNING to_jsonb(rg.*) INTO v_result;
  ELSE
    INSERT INTO public.rg (
      nombre, apellido_paterno, apellido_materno, clave_elector, numero_credencial, cic,
      df_id, dl_id, seccion_id, credencial_vigente, es_militante,
      calle, num_ext, num_int, colonia, codigo_postal, telefono, correo_electronico,
      autoriza_propaganda, tipo_propaganda, firma_capturada, capturista_id
    ) VALUES (
      (p_payload->>'nombre')::text, (p_payload->>'apellido_paterno')::text,
      (p_payload->>'apellido_materno')::text, (p_payload->>'clave_elector')::text,
      (p_payload->>'numero_credencial')::text, (p_payload->>'cic')::text,
      (p_payload->>'df_id')::integer, (p_payload->>'dl_id')::integer,
      (p_payload->>'seccion_id')::integer,
      (p_payload->>'credencial_vigente')::boolean, (p_payload->>'es_militante')::boolean,
      (p_payload->>'calle')::text, (p_payload->>'num_ext')::text,
      (p_payload->>'num_int')::text, (p_payload->>'colonia')::text,
      (p_payload->>'codigo_postal')::text, (p_payload->>'telefono')::text,
      (p_payload->>'correo_electronico')::text,
      (p_payload->>'autoriza_propaganda')::boolean,
      (p_payload->>'tipo_propaganda')::public.tipo_propaganda,
      (p_payload->>'firma_capturada')::boolean, v_caller_id
    ) RETURNING to_jsonb(rg.*) INTO v_result;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.save_rc_secure(p_id integer, p_payload jsonb)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_owner_id integer;
  v_caller_id integer;
  v_is_privileged boolean;
BEGIN
  v_caller_id := (p_payload->>'capturista_id')::integer;
  v_is_privileged := public.is_privileged(v_caller_id);

  IF p_id IS NOT NULL AND p_id > 0 THEN
    SELECT capturista_id INTO v_owner_id FROM public.rc WHERE id = p_id;
    IF v_caller_id IS NULL OR (v_owner_id IS NOT NULL AND v_owner_id != v_caller_id AND NOT v_is_privileged) THEN
      RAISE EXCEPTION 'No tienes permiso para editar este registro.';
    END IF;
    UPDATE public.rc SET
      nombre = (p_payload->>'nombre')::text,
      apellido_paterno = (p_payload->>'apellido_paterno')::text,
      apellido_materno = (p_payload->>'apellido_materno')::text,
      clave_elector = (p_payload->>'clave_elector')::text,
      numero_credencial = (p_payload->>'numero_credencial')::text,
      cic = (p_payload->>'cic')::text,
      df_id = (p_payload->>'df_id')::integer,
      dl_id = (p_payload->>'dl_id')::integer,
      seccion_id = (p_payload->>'seccion_id')::integer,
      casilla_id = (p_payload->>'casilla_id')::integer,
      tipo_nombramiento = (p_payload->>'tipo_nombramiento')::public.tipo_nombramiento,
      credencial_vigente = (p_payload->>'credencial_vigente')::boolean,
      es_militante = (p_payload->>'es_militante')::boolean,
      calle = (p_payload->>'calle')::text,
      num_ext = (p_payload->>'num_ext')::text,
      num_int = (p_payload->>'num_int')::text,
      colonia = (p_payload->>'colonia')::text,
      codigo_postal = (p_payload->>'codigo_postal')::text,
      telefono = (p_payload->>'telefono')::text,
      correo_electronico = (p_payload->>'correo_electronico')::text,
      autoriza_propaganda = (p_payload->>'autoriza_propaganda')::boolean,
      tipo_propaganda = (p_payload->>'tipo_propaganda')::public.tipo_propaganda,
      firma_capturada = (p_payload->>'firma_capturada')::boolean
    WHERE id = p_id
    RETURNING to_jsonb(rc.*) INTO v_result;
  ELSE
    INSERT INTO public.rc (
      nombre, apellido_paterno, apellido_materno, clave_elector, numero_credencial, cic,
      df_id, dl_id, seccion_id, casilla_id, tipo_nombramiento,
      credencial_vigente, es_militante,
      calle, num_ext, num_int, colonia, codigo_postal, telefono, correo_electronico,
      autoriza_propaganda, tipo_propaganda, firma_capturada, capturista_id
    ) VALUES (
      (p_payload->>'nombre')::text, (p_payload->>'apellido_paterno')::text,
      (p_payload->>'apellido_materno')::text, (p_payload->>'clave_elector')::text,
      (p_payload->>'numero_credencial')::text, (p_payload->>'cic')::text,
      (p_payload->>'df_id')::integer, (p_payload->>'dl_id')::integer,
      (p_payload->>'seccion_id')::integer, (p_payload->>'casilla_id')::integer,
      (p_payload->>'tipo_nombramiento')::public.tipo_nombramiento,
      (p_payload->>'credencial_vigente')::boolean, (p_payload->>'es_militante')::boolean,
      (p_payload->>'calle')::text, (p_payload->>'num_ext')::text,
      (p_payload->>'num_int')::text, (p_payload->>'colonia')::text,
      (p_payload->>'codigo_postal')::text, (p_payload->>'telefono')::text,
      (p_payload->>'correo_electronico')::text,
      (p_payload->>'autoriza_propaganda')::boolean,
      (p_payload->>'tipo_propaganda')::public.tipo_propaganda,
      (p_payload->>'firma_capturada')::boolean, v_caller_id
    ) RETURNING to_jsonb(rc.*) INTO v_result;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.save_rg_secure(integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_rc_secure(integer, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_rg_secure(integer, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_rc_secure(integer, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
