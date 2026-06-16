-- =====================================================================
-- MIGRACIÓN: Parche de Seguridad v4 (Corrección de RLS y Passwords)
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- 1. Habilitar la extensión pgcrypto para encriptar contraseñas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Encriptar contraseñas existentes (que no estén encriptadas)
-- NOTA: Esto asume que el usuario tiene 'password' en texto plano y no con un hash de bcrypt ($2a$...).
UPDATE public.usuarios 
SET password = crypt(password, gen_salt('bf'))
WHERE password NOT LIKE '$2a$%';

-- 3. Actualizar la función de validación de Login para usar hashes (pgcrypto)
CREATE OR REPLACE FUNCTION public.validate_login(p_usuario text, p_contrasena text)
RETURNS jsonb AS $$
DECLARE
    v_user jsonb;
BEGIN
    -- Validamos el usuario contra la base de datos usando crypt
    SELECT to_jsonb(u.*) INTO v_user
    FROM public.usuarios u
    WHERE LOWER(u.usuario) = LOWER(p_usuario)
      AND u.password = crypt(p_contrasena, u.password);

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Credenciales no validas';
    END IF;

    RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Arreglar Políticas RLS Peligrosas (Quitar el permiso global para Anon)
-- Borramos las políticas "Allow all for authenticated and anon"
DROP POLICY IF EXISTS "Allow all for authenticated and anon" ON public.rg;
DROP POLICY IF EXISTS "Allow all for authenticated and anon" ON public.rc;
DROP POLICY IF EXISTS "Allow all for authenticated and anon" ON public.rutas;
DROP POLICY IF EXISTS "Allow all for authenticated and anon" ON public.casillas;

-- Creamos políticas restrictivas que SÓLO permiten leer a usuarios anónimos (si es requerido por la UI pública)
-- Pero NO podrán modificar nada.
CREATE POLICY "Allow read for anon" ON public.rg FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read for anon" ON public.rc FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read for anon" ON public.rutas FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read for anon" ON public.casillas FOR SELECT TO anon USING (true);

-- 5. Parchear Insecure Direct Object Reference (IDOR) en Funciones RPC
-- Función helper para saber si un usuario es administrador
CREATE OR REPLACE FUNCTION is_admin(user_id int) RETURNS boolean AS $$
DECLARE
  v_rol text;
BEGIN
  SELECT rol INTO v_rol FROM public.usuarios WHERE id = user_id;
  RETURN v_rol = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Securizamos save_rg_secure
CREATE OR REPLACE FUNCTION public.save_rg_secure(p_id integer, p_payload jsonb)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_owner_id integer;
  v_caller_id integer;
BEGIN
  v_caller_id := (p_payload->>'capturista_id')::integer;
  
  IF p_id IS NOT NULL AND p_id > 0 THEN
    SELECT capturista_id INTO v_owner_id FROM public.rg WHERE id = p_id;
    
    -- VALIDACIÓN IDOR: Si no eres el dueño del registro y tampoco eres admin, rechazamos
    IF v_owner_id != v_caller_id AND NOT is_admin(v_caller_id) THEN
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
      firma_capturada = (p_payload->>'firma_capturada')::boolean,
      municipio_id = (p_payload->>'municipio_id')::integer
    WHERE id = p_id
    RETURNING to_jsonb(rg.*) INTO v_result;
  ELSE
    INSERT INTO public.rg (
      nombre, apellido_paterno, apellido_materno, clave_elector, numero_credencial, cic,
      df_id, dl_id, seccion_id, credencial_vigente, es_militante,
      calle, num_ext, num_int, colonia, codigo_postal, telefono, correo_electronico,
      autoriza_propaganda, tipo_propaganda, firma_capturada, capturista_id, municipio_id
    ) VALUES (
      (p_payload->>'nombre')::text, (p_payload->>'apellido_paterno')::text, (p_payload->>'apellido_materno')::text,
      (p_payload->>'clave_elector')::text, (p_payload->>'numero_credencial')::text, (p_payload->>'cic')::text,
      (p_payload->>'df_id')::integer, (p_payload->>'dl_id')::integer, (p_payload->>'seccion_id')::integer,
      (p_payload->>'credencial_vigente')::boolean, (p_payload->>'es_militante')::boolean,
      (p_payload->>'calle')::text, (p_payload->>'num_ext')::text, (p_payload->>'num_int')::text,
      (p_payload->>'colonia')::text, (p_payload->>'codigo_postal')::text, (p_payload->>'telefono')::text,
      (p_payload->>'correo_electronico')::text, (p_payload->>'autoriza_propaganda')::boolean,
      (p_payload->>'tipo_propaganda')::public.tipo_propaganda, (p_payload->>'firma_capturada')::boolean,
      v_caller_id, (p_payload->>'municipio_id')::integer
    ) RETURNING to_jsonb(rg.*) INTO v_result;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Securizamos save_rc_secure
CREATE OR REPLACE FUNCTION public.save_rc_secure(p_id integer, p_payload jsonb)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_owner_id integer;
  v_caller_id integer;
BEGIN
  v_caller_id := (p_payload->>'capturista_id')::integer;
  
  IF p_id IS NOT NULL AND p_id > 0 THEN
    SELECT capturista_id INTO v_owner_id FROM public.rc WHERE id = p_id;
    
    -- VALIDACIÓN IDOR: Si no eres el dueño del registro y tampoco eres admin, rechazamos
    IF v_owner_id != v_caller_id AND NOT is_admin(v_caller_id) THEN
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
      firma_capturada = (p_payload->>'firma_capturada')::boolean,
      municipio_id = (p_payload->>'municipio_id')::integer
    WHERE id = p_id
    RETURNING to_jsonb(rc.*) INTO v_result;
  ELSE
    INSERT INTO public.rc (
      nombre, apellido_paterno, apellido_materno, clave_elector, numero_credencial, cic,
      df_id, dl_id, seccion_id, casilla_id, tipo_nombramiento, credencial_vigente, es_militante,
      calle, num_ext, num_int, colonia, codigo_postal, telefono, correo_electronico,
      autoriza_propaganda, tipo_propaganda, firma_capturada, capturista_id, municipio_id
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
      v_caller_id, (p_payload->>'municipio_id')::integer
    ) RETURNING to_jsonb(rc.*) INTO v_result;
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
