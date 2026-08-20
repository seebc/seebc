import { createClient } from '@supabase/supabase-js';

// Lazy client initialization
let _supabase = null;

function getClient() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(`Supabase env vars not loaded. URL="${url}" KEY="${key ? '...' : 'undefined'}"`);
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export async function buscarUsuarioPorTelefono(telefono) {
  const supabase = getClient();

  // Telegram envía números en diferentes formatos:
  //   +521234567890  (más común — con + y código de país)
  //   521234567890   (sin +)
  //   1234567890     (solo 10 dígitos, raro)
  // Normalizamos a los 10 dígitos locales eliminando el prefijo 52 con o sin +
  const tel = String(telefono)
    .replace(/^\+52/, '')   // quita +52
    .replace(/^52/, '')     // quita 52 sin +
    .replace(/^\+/, '');    // quita cualquier + restante

  console.log(`[buscarUsuarioPorTelefono] raw="${telefono}" → normalizado="${tel}"`);

  // Buscamos en todos los formatos posibles que pueda estar guardado en la BD:
  //   1234567890        (solo 10 dígitos)
  //   521234567890      (con 52 sin +)
  //   +521234567890     (con +52)
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, usuario, nombre_completo, rol, telefono, bot_activo, telegram_id')
    .or(`telefono.eq.${tel},telefono.eq.52${tel},telefono.eq.+52${tel}`)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    console.warn(`[buscarUsuarioPorTelefono] No encontrado para tel="${tel}"`);
  }

  return data;
}

export async function vincularTelegramId(usuarioId, telegramId) {
  const supabase = getClient();
  const { error } = await supabase
    .from('usuarios')
    .update({ telegram_id: telegramId, bot_activo: true })
    .eq('id', usuarioId);
  if (error) throw error;
}

export async function verificarUsuarioActivo(telegramId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, usuario, nombre_completo, rol, bot_activo')
    .eq('telegram_id', telegramId)
    .eq('bot_activo', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function verificarClaveElectorExistente(clave) {
  const supabase = getClient();
  const claveNormalizada = clave.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  
  const [rg, rc] = await Promise.all([
    supabase.from('rg').select('id, nombre, apellido_paterno').ilike('clave_elector', claveNormalizada).maybeSingle(),
    supabase.from('rc').select('id, nombre, apellido_paterno').ilike('clave_elector', claveNormalizada).maybeSingle()
  ]);

  if (rg.data) return { existe: true, tipo: 'RG', nombre: `${rg.data.nombre} ${rg.data.apellido_paterno}` };
  if (rc.data) return { existe: true, tipo: 'RC', nombre: `${rc.data.nombre} ${rc.data.apellido_paterno}` };
  
  return { existe: false };
}

export async function getMunicipios() {
  const supabase = getClient();
  const { data, error } = await supabase.from('municipios').select('id, municipio').order('id');
  if (error) throw error;
  return data;
}

export async function getDistritosFederales() {
  const supabase = getClient();
  const { data, error } = await supabase.from('df').select('id, df').order('df');
  if (error) throw error;
  return data;
}

export async function getDistritosLocales() {
  const supabase = getClient();
  const { data, error } = await supabase.from('dl').select('id, dl').order('dl');
  if (error) throw error;
  return data;
}

export async function getCasillasPorSeccion(seccionId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('casillas')
    .select('casilla_id, casilla')
    .like('casilla', `${seccionId}%`)
    .order('casilla');
  if (error) throw error;
  return data;
}

export async function guardarNuevoRG(payload) {
  const supabase = getClient();
  const { data, error } = await supabase.from('rg').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function guardarNuevoRC(payload) {
  const supabase = getClient();
  const { data, error } = await supabase.from('rc').insert([payload]).select().single();
  if (error) throw error;
  return data;
}


export async function guardarCapturaRG(datos) {
  const supabase = getClient();
  const { data, error } = await supabase.from('capturas_rg').insert([datos]).select().single();
  if (error) throw error;
  return data;
}

export async function guardarCapturaRC(datos) {
  const supabase = getClient();
  const { data, error } = await supabase.from('capturas_rc').insert([datos]).select().single();
  if (error) throw error;
  return data;
}

export async function obtenerMisCapturas(usuarioId) {
  const supabase = getClient();
  const [rg, rc] = await Promise.all([
    supabase.from('capturas_rg').select('*').eq('usuario_id', usuarioId).order('created_at', { ascending: false }).limit(5),
    supabase.from('capturas_rc').select('*').eq('usuario_id', usuarioId).order('created_at', { ascending: false }).limit(5),
  ]);
  return { rg: rg.data || [], rc: rc.data || [] };
}

export async function registrarAccesoBot(usuarioId, nombreUsuario) {
  const supabase = getClient();
  try {
    await supabase.from('login_logs').insert([{
      usuario_id: usuarioId,
      nombre_usuario: nombreUsuario,
      fuente: 'telegram'
    }]);
    console.log('[registrarAccesoBot] Registro insertado para usuarioId=' + usuarioId);
  } catch (err) {
    console.error('[registrarAccesoBot] Error registrando acceso:', err.message);
  }
}

export default getClient;
