-- =====================================================================
-- FIX: Permisos de Administrador para Edición de RG y RC
-- Ejecutar este script en el Editor SQL de Supabase
-- =====================================================================

-- 1. Actualizar la función is_admin con el nombre de parámetro original (p_user_id)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id integer) RETURNS boolean AS $$
DECLARE
  v_rol text;
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  SELECT rol::text INTO v_rol FROM public.usuarios WHERE id = p_user_id;
  RETURN COALESCE(TRIM(v_rol) = '1' OR UPPER(TRIM(v_rol)) = 'ADMIN', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar save_rg_secure (sin columna inexistente municipio_id)
CREATE OR REPLACE FUNCTION public.save_rg_secure(p_id integer, p_payload jsonb)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_owner_id integer;
  v_caller_id integer;
  v_is_admin boolean;
BEGIN
  v_caller_id := (p_payload->>'capturista_id')::integer;
  v_is_admin := public.is_admin(v_caller_id);
  
  IF p_id IS NOT NULL AND p_id > 0 THEN
    SELECT capturista_id INTO v_owner_id FROM public.rg WHERE id = p_id;
    
    -- VALIDACIÓN: Si no eres el capturista original y tampoco eres admin, se rechaza
    IF v_caller_id IS NULL OR (v_owner_id IS NOT NULL AND v_owner_id != v_caller_id AND NOT v_is_admin) THEN
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
      (p_payload->>'nombre')::text, (p_payload->>'apellido_paterno')::text, (p_payload->>'apellido_materno')::text,
      (p_payload->>'clave_elector')::text, (p_payload->>'numero_credencial')::text, (p_payload->>'cic')::text,
      (p_payload->>'df_id')::integer, (p_payload->>'dl_id')::integer, (p_payload->>'seccion_id')::integer,
      (p_payload->>'credencial_vigente')::boolean, (p_payload->>'es_militante')::boolean,
      (p_payload->>'calle')::text, (p_payload->>'num_ext')::text, (p_payload->>'num_int')::text,
      (p_payload->>'colonia')::text, (p_payload->>'codigo_postal')::text, (p_payload->>'telefono')::text,
      (p_payload->>'correo_electronico')::text, (p_payload->>'autoriza_propaganda')::boolean,
      (p_payload->>'tipo_propaganda')::public.tipo_propaganda, (p_payload->>'firma_capturada')::boolean,
      v_caller_id
    ) RETURNING to_jsonb(rg.*) INTO v_result;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar save_rc_secure (sin columna inexistente municipio_id)
CREATE OR REPLACE FUNCTION public.save_rc_secure(p_id integer, p_payload jsonb)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_owner_id integer;
  v_caller_id integer;
  v_is_admin boolean;
BEGIN
  v_caller_id := (p_payload->>'capturista_id')::integer;
  v_is_admin := public.is_admin(v_caller_id);
  
  IF p_id IS NOT NULL AND p_id > 0 THEN
    SELECT capturista_id INTO v_owner_id FROM public.rc WHERE id = p_id;
    
    -- VALIDACIÓN: Si no eres el capturista original y tampoco eres admin, se rechaza
    IF v_caller_id IS NULL OR (v_owner_id IS NOT NULL AND v_owner_id != v_caller_id AND NOT v_is_admin) THEN
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
      df_id, dl_id, seccion_id, casilla_id, tipo_nombramiento, credencial_vigente, es_militante,
      calle, num_ext, num_int, colonia, codigo_postal, telefono, correo_electronico,
      autoriza_propaganda, tipo_propaganda, firma_capturada, capturista_id
    ) VALUES (
      (p_payload->>'nombre')::text, (p_payload->>'apellido_paterno')::text, (p_payload->>'apellido_materno')::text,
      (p_payload->>'clave_elector')::text, (p_payload->>'numero_credencial')::text, (p_payload->>'cic')::text,
      (p_payload->>'df_id')::integer, (p_payload->>'dl_id')::integer, (p_payload->>'seccion_id')::integer,
      (p_payload->>'casilla_id')::integer, (p_payload->>'tipo_nombramiento')::public.tipo_nombramiento,
      (p_payload->>'credencial_vigente')::boolean, (p_payload->>'es_militante')::boolean,
      (p_payload->>'calle')::text, (p_payload->>'num_ext')::text, (p_payload->>'num_int')::text,
      (p_payload->>'colonia')::text, (p_payload->>'codigo_postal')::text, (p_payload->>'telefono')::text,
      (p_payload->>'correo_electronico')::text, (p_payload->>'autoriza_propaganda')::boolean,
      (p_payload->>'tipo_propaganda')::public.tipo_propaganda, (p_payload->>'firma_capturada')::boolean,
      v_caller_id
    ) RETURNING to_jsonb(rc.*) INTO v_result;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
