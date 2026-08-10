import { Keyboard, InlineKeyboard } from 'grammy';

// ── Teclado para pedir número de teléfono ──────────────────────────────────
export const tecladoCompartirTelefono = new Keyboard()
  .requestContact('📱 Compartir mi número')
  .resized()
  .oneTime();

// ── Menú principal dinámico según rol ─────────────────────────────────────
// rol: 'CAPTURISTA' → solo ve Reporte RG, Reporte RC y Mis reportes
// otros roles (admin, coordinador, etc.) → menú completo con registros
export function getMenuPrincipal(rol) {
  const rolUpper = (rol || '').toUpperCase();
  const isCapturista = rolUpper === 'CAPTURISTA';

  const kb = new InlineKeyboard();

  if (!isCapturista) {
    // Administradores / coordinadores: pueden registrar nuevos RG/RC
    kb.text('📝 Nuevo Registro RG', 'menu_registro_rg')
      .text('📝 Nuevo Registro RC', 'menu_registro_rc')
      .row();
  }

  // Todos los roles ven las opciones de reporte y capturas
  kb.text('👤 Reporte RG', 'menu_rg')
    .text('🗳️ Reporte RC', 'menu_rc')
    .row()
    .text('📋 Mis reportes', 'menu_capturas');

  return kb;
}

// Alias para compatibilidad: menú completo (sin filtro de rol)
export const menuPrincipal = getMenuPrincipal('ADMIN');

// ── Confirmación genérica ──────────────────────────────────────────────────
export function tecladoConfirmar(prefijo) {
  return new InlineKeyboard()
    .text('✅ Confirmar', `${prefijo}_si`)
    .text('❌ Cancelar', `${prefijo}_no`);
}

// ── Tipo de acción RG ──────────────────────────────────────────────────────
export const tecladoTipoRG = new InlineKeyboard()
  .text('📍 Llegó', 'rg_llego')
  .text('🚪 Salió', 'rg_salio')
  .row()
  .text('⚠️ Incidencia', 'rg_incidencia')
  .text('✅ Cierre', 'rg_cierre');

// ── Tipo de acción RC ──────────────────────────────────────────────────────
export const tecladoTipoRC = new InlineKeyboard()
  .text('📍 Llegó', 'rc_llego')
  .text('🚪 Salió', 'rc_salio')
  .row()
  .text('⚠️ Incidencia', 'rc_incidencia')
  .text('✅ Cierre', 'rc_cierre');

// ── Cancelar conversación ──────────────────────────────────────────────────
export const tecladoCancelar = new InlineKeyboard()
  .text('❌ Cancelar', 'cancelar');
