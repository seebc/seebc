-- Crear tabla para registrar los accesos
CREATE TABLE IF NOT EXISTS public.login_logs (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES public.usuarios(id) ON DELETE SET NULL,
    nombre_usuario TEXT,
    fuente TEXT DEFAULT 'web',   -- 'web' o 'telegram'
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Permitir insertar y ver a cualquier usuario (la lógica se maneja en frontend)
CREATE POLICY "Allow public insert" ON public.login_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.login_logs FOR SELECT USING (true);

-- Si la tabla ya existía, agregar la columna fuente (correr solo si la tabla ya existía)
-- ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT 'web';
