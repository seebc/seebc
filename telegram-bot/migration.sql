-- ============================================================
-- SEEBC Telegram Bot — Migración de base de datos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 0a. Agregar campo teléfono a la tabla usuarios (si aún no existe)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono TEXT;

-- 0b. Agregar campos de Telegram a la tabla usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE,
  ADD COLUMN IF NOT EXISTS bot_activo BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_usuarios_telegram_id ON usuarios(telegram_id);

-- 0c. Actualizar la función manage_user_secure para aceptar y guardar el teléfono
CREATE OR REPLACE FUNCTION manage_user_secure(
  in_id INTEGER,
  in_usuario TEXT,
  in_password TEXT,
  in_rol TEXT,
  in_nombre_completo TEXT,
  in_telefono TEXT DEFAULT ''
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hashed TEXT;
  v_result JSON;
BEGIN
  IF in_password IS NOT NULL AND in_password <> '' THEN
    v_hashed := crypt(in_password, gen_salt('bf'));
  END IF;

  IF in_id = 0 THEN
    INSERT INTO usuarios (usuario, password, rol, nombre_completo, telefono)
    VALUES (in_usuario, v_hashed, in_rol, in_nombre_completo, NULLIF(in_telefono, ''))
    RETURNING json_build_object('id', id, 'usuario', usuario) INTO v_result;
  ELSE
    UPDATE usuarios SET
      usuario         = in_usuario,
      rol             = in_rol,
      nombre_completo = in_nombre_completo,
      telefono        = NULLIF(in_telefono, ''),
      password        = CASE WHEN in_password <> '' THEN v_hashed ELSE password END
    WHERE id = in_id
    RETURNING json_build_object('id', id, 'usuario', usuario) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 1. Tabla de capturas de Representantes Generales (RG)
-- ============================================================
CREATE TABLE IF NOT EXISTS capturas_rg (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ruta         TEXT NOT NULL,
  nombre_rg    TEXT NOT NULL,
  tipo_accion  TEXT NOT NULL CHECK (tipo_accion IN ('llego', 'salio', 'incidencia', 'cierre')),
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capturas_rg_usuario ON capturas_rg(usuario_id);
CREATE INDEX IF NOT EXISTS idx_capturas_rg_fecha   ON capturas_rg(created_at DESC);

-- ============================================================
-- 2. Tabla de capturas de Representantes de Casilla (RC)
-- ============================================================
CREATE TABLE IF NOT EXISTS capturas_rc (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  seccion       TEXT NOT NULL,
  casilla       TEXT NOT NULL,
  nombre_rc     TEXT NOT NULL,
  tipo_accion   TEXT NOT NULL CHECK (tipo_accion IN ('llego', 'salio', 'incidencia', 'cierre')),
  foto_file_id  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capturas_rc_usuario ON capturas_rc(usuario_id);
CREATE INDEX IF NOT EXISTS idx_capturas_rc_fecha   ON capturas_rc(created_at DESC);

-- ============================================================
-- 3. RLS — solo el service role del bot puede escribir
-- ============================================================
ALTER TABLE capturas_rg ENABLE ROW LEVEL SECURITY;
ALTER TABLE capturas_rc ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='capturas_rg' AND policyname='service_role_all_rg'
  ) THEN
    CREATE POLICY "service_role_all_rg" ON capturas_rg
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='capturas_rc' AND policyname='service_role_all_rc'
  ) THEN
    CREATE POLICY "service_role_all_rc" ON capturas_rc
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 4. Vista resumen de capturas del día
-- ============================================================
CREATE OR REPLACE VIEW v_capturas_hoy AS
SELECT
  'RG'                                        AS tipo,
  r.created_at,
  u.nombre_completo || ' (' || u.usuario || ')' AS capturado_por,
  r.ruta                                      AS referencia,
  r.nombre_rg                                 AS nombre_representante,
  r.tipo_accion,
  r.notas
FROM capturas_rg r
JOIN usuarios u ON u.id = r.usuario_id
WHERE r.created_at >= CURRENT_DATE

UNION ALL

SELECT
  'RC'                                        AS tipo,
  r.created_at,
  u.nombre_completo || ' (' || u.usuario || ')' AS capturado_por,
  r.seccion || '-' || r.casilla              AS referencia,
  r.nombre_rc                                AS nombre_representante,
  r.tipo_accion,
  NULL                                       AS notas
FROM capturas_rc r
JOIN usuarios u ON u.id = r.usuario_id
WHERE r.created_at >= CURRENT_DATE

ORDER BY created_at DESC;

-- ============================================================
-- Listo!
-- ============================================================
