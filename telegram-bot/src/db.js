import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Busca un usuario registrado por número de teléfono en la tabla `usuarios`.
 */
export async function buscarUsuarioPorTelefono(telefono) {
  // Normalizar: quitar el +52 o + que viene de Telegram
  const tel = telefono.replace(/^\+52/, '').replace(/^\+/, '');

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, usuario, nombre_completo, rol, telefono, bot_activo, telegram_id')
    .or(`telefono.eq.${tel},telefono.eq.52${tel}`)
    .eq('bot_activo', false) // Solo usuarios que aún no se han vinculado, o...
    .maybeSingle();

  // Intentar también si ya está vinculado (por si se desvinculó el cuenta)
  if (!data) {
    const { data: data2, error: error2 } = await supabase
      .from('usuarios')
      .select('id, usuario, nombre_completo, rol, telefono, bot_activo, telegram_id')
      .or(`telefono.eq.${tel},telefono.eq.52${tel}`)
      .maybeSingle();
    if (error2) throw error2;
    return data2;
  }

  if (error) throw error;
  return data;
}

/**
 * Vincula el telegram_id al usuario y activa el bot.
 */
export async function vincularTelegramId(usuarioId, telegramId) {
  const { error } = await supabase
    .from('usuarios')
    .update({ telegram_id: telegramId, bot_activo: true })
    .eq('id', usuarioId);

  if (error) throw error;
}

/**
 * Verifica si un telegram_id ya está vinculado y activo.
 */
export async function verificarUsuarioActivo(telegramId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, usuario, nombre_completo, rol, bot_activo')
    .eq('telegram_id', telegramId)
    .eq('bot_activo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Guarda una captura de Representante General (RG).
 */
export async function guardarCapturaRG(datos) {
  const { data, error } = await supabase
    .from('capturas_rg')
    .insert([datos])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Guarda una captura de Representante de Casilla (RC).
 */
export async function guardarCapturaRC(datos) {
  const { data, error } = await supabase
    .from('capturas_rc')
    .insert([datos])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtiene las últimas capturas de un usuario.
 */
export async function obtenerMisCapturas(usuarioId) {
  const [rg, rc] = await Promise.all([
    supabase
      .from('capturas_rg')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('capturas_rc')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    rg: rg.data || [],
    rc: rc.data || [],
  };
}

export default supabase;
