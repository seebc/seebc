import { Keyboard, InlineKeyboard } from 'grammy';

// ── Teclado para pedir número de teléfono ──────────────────────────────────
export const tecladoCompartirTelefono = new Keyboard()
  .requestContact('📱 Compartir mi número')
  .resized()
  .oneTime();

// ── Menú principal (inline) ────────────────────────────────────────────────
export const menuPrincipal = new InlineKeyboard()
  .text('📝 Nuevo Registro RG', 'menu_registro_rg')
  .text('📝 Nuevo Registro RC', 'menu_registro_rc')
  .row()
  .text('👤 Reporte RG', 'menu_rg')
  .text('🗳️ Reporte RC', 'menu_rc')
  .row()
  .text('📋 Mis reportes', 'menu_capturas');

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
