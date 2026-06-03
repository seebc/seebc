// Script de migración — ejecutar UNA sola vez
// node migrate.js

import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

// Supabase expone postgres en el puerto 5432 usando el project ref
const PROJECT_REF = 'oiqptmuohdnvdtvklbnr';

const client = new Client({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_SERVICE_KEY,  // en Supabase, el service key es la contraseña de postgres via pooler
  ssl: { rejectUnauthorized: false },
});

const SQL = `
-- 1. Columnas en usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE,
  ADD COLUMN IF NOT EXISTS bot_activo BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_usuarios_telegram_id ON usuarios(telegram_id);

-- 2. Capturas RG
CREATE TABLE IF NOT EXISTS capturas_rg (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ruta          TEXT NOT NULL,
  nombre_rg     TEXT NOT NULL,
  tipo_accion   TEXT NOT NULL CHECK (tipo_accion IN ('llego', 'salio', 'incidencia', 'cierre')),
  notas         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capturas_rg_usuario ON capturas_rg(usuario_id);
CREATE INDEX IF NOT EXISTS idx_capturas_rg_fecha   ON capturas_rg(created_at DESC);

-- 3. Capturas RC
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

-- 4. RLS
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

-- 5. Vista del día
CREATE OR REPLACE VIEW v_capturas_hoy AS
SELECT
  'RG' AS tipo,
  r.created_at,
  u.nombre_completo || ' (' || u.usuario || ')' AS capturado_por,
  r.ruta AS referencia,
  r.nombre_rg AS nombre_representante,
  r.tipo_accion,
  r.notas
FROM capturas_rg r
JOIN usuarios u ON u.id = r.usuario_id
WHERE r.created_at >= CURRENT_DATE
UNION ALL
SELECT
  'RC' AS tipo,
  r.created_at,
  u.nombre_completo || ' (' || u.usuario || ')' AS capturado_por,
  r.seccion || '-' || r.casilla AS referencia,
  r.nombre_rc AS nombre_representante,
  r.tipo_accion,
  NULL AS notas
FROM capturas_rc r
JOIN usuarios u ON u.id = r.usuario_id
WHERE r.created_at >= CURRENT_DATE
ORDER BY created_at DESC;
`;

try {
  await client.connect();
  console.log('✅ Conectado a Supabase Postgres');
  await client.query(SQL);
  console.log('✅ Migración completada exitosamente');
} catch (err) {
  console.error('❌ Error en migración:', err.message);
} finally {
  await client.end();
}
