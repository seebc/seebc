import { guardarCapturaRG, verificarUsuarioActivo } from '../db.js';
import { tecladoTipoRG, tecladoCancelar } from '../teclados.js';

/**
 * Conversación guiada para captura de Representante General (RG).
 * Flujo:
 *   1. Número de ruta
 *   2. Nombre del RG
 *   3. Tipo de evento (llegó / salió / incidencia / cierre)
 *   4. Notas opcionales
 *   5. Confirmación y guardado
 */
export async function conversacionRG(conversation, ctx) {
  const telegramId = ctx.from?.id;
  const miembro = ctx.miembro || await conversation.external(() => verificarUsuarioActivo(telegramId));
  if (!miembro) {
    return ctx.reply('⚠️ Sesión no válida. Usa /start para autenticarte.');
  }

  // ── PASO 1: Número de ruta ────────────────────────────────────────
  await ctx.reply(
    `*Paso 1/4*: ¿Cuál es el número de ruta?`,
    { parse_mode: 'Markdown', reply_markup: tecladoCancelar }
  );
  const resRuta = await conversation.waitFor(['message:text', 'callback_query:data']);
  if (resRuta.callbackQuery?.data === 'cancelar' || resRuta.message?.text === '/cancelar') {
    if (resRuta.callbackQuery) await resRuta.answerCallbackQuery();
    return ctx.reply('❌ Captura cancelada.');
  }
  if (!resRuta.message?.text) return ctx.reply('❌ Captura cancelada.');
  const ruta = resRuta.message.text.trim();

  // ── PASO 2: Nombre del RG ─────────────────────────────────────────────
  await ctx.reply(
    `*Paso 2/4*: ¿Cuál es el nombre completo del RG?`,
    { parse_mode: 'Markdown', reply_markup: tecladoCancelar }
  );

  const res = await conversation.waitFor(['message:text', 'callback_query:data']);
  
  if (res.callbackQuery?.data === 'cancelar' || res.message?.text === '/cancelar') {
    if (res.callbackQuery) await res.answerCallbackQuery();
    return ctx.reply('❌ Captura cancelada.');
  }
  
  if (!res.message?.text) return ctx.reply('❌ Captura cancelada.');
  
  const nombreRG = res.message.text.trim();

  // ── PASO 3: Tipo de evento ────────────────────────────────────────
  await ctx.reply(
    `*Paso 3/4*: ¿Qué acción registras para *${nombreRG}*?`,
    { parse_mode: 'Markdown', reply_markup: tecladoTipoRG }
  );

  // Esperar callback de botón inline
  const cbTipo = await conversation.waitFor('callback_query:data');
  await cbTipo.answerCallbackQuery();
  const tipoAccion = cbTipo.callbackQuery.data; // ej. "rg_llego"
  const tipoTexto = {
    rg_llego: '📍 Llegó',
    rg_salio: '🚪 Salió',
    rg_incidencia: '⚠️ Incidencia',
    rg_cierre: '✅ Cierre',
  }[tipoAccion] || tipoAccion;

  if (tipoAccion === 'cancelar') {
    return ctx.reply('❌ Captura cancelada.');
  }

  // ── PASO 4: Notas opcionales ──────────────────────────────────────
  await ctx.reply(
    '*Paso 4/4*: ¿Alguna nota o comentario? (escribe "ninguna" para omitir)',
    { parse_mode: 'Markdown' }
  );

  const msgNotas = await conversation.waitFor('message:text');
  const notas = msgNotas.message.text.trim().toLowerCase() === 'ninguna'
    ? null
    : msgNotas.message.text.trim();

  // ── RESUMEN ───────────────────────────────────────────────────────────
  const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Tijuana' });
  const resumen =
    `📋 *Resumen de captura RG*\n\n` +
    `👤 RG: *${nombreRG}*\n` +
    `🎯 Acción: *${tipoTexto}*\n` +
    `📝 Notas: ${notas || 'Ninguna'}\n` +
    `🕐 Hora: ${ahora}\n\n` +
    `¿Confirmas el registro?`;

  const { InlineKeyboard } = await import('grammy');
  const teclado = new InlineKeyboard()
    .text('✅ Sí, guardar', 'confirmar_rg')
    .text('❌ Cancelar', 'cancelar_rg');

  await ctx.reply(resumen, { parse_mode: 'Markdown', reply_markup: teclado });

  const cbConfirma = await conversation.waitFor('callback_query:data');
  await cbConfirma.answerCallbackQuery();

  if (cbConfirma.callbackQuery.data !== 'confirmar_rg') {
    return ctx.reply('❌ Captura cancelada. No se guardó ningún dato.');
  }

  // ── GUARDAR EN SUPABASE ───────────────────────────────────────────────
  try {
    await guardarCapturaRG({
      usuario_id: miembro.id,
      ruta,
      nombre_rg: nombreRG,
      tipo_accion: tipoAccion.replace('rg_', ''),
      notas,
    });

    await ctx.reply(
      '✅ *¡Captura guardada exitosamente!*\n\n' +
      `_Registrado por: ${miembro.nombre_completo || miembro.usuario}_`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Error guardando RG:', err.message);
    await ctx.reply('❌ Error al guardar. Intenta de nuevo o contacta al administrador.');
  }
}
