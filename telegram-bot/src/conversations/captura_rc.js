import { guardarCapturaRC } from '../db.js';
import { tecladoTipoRC, tecladoCancelar } from '../teclados.js';

/**
 * Conversación guiada para captura de Representante de Casilla (RC).
 * Flujo:
 *   1. Sección electoral
 *   2. Número de casilla
 *   3. Nombre del RC
 *   4. Tipo de evento
 *   5. Foto de evidencia (opcional)
 *   6. Confirmación y guardado
 */
export async function conversacionRC(conversation, ctx) {
  const miembro = ctx.miembro;

  // ── PASO 1: Sección ───────────────────────────────────────────────────
  await ctx.reply(
    '🗳️ *Captura de Representante de Casilla*\n\n' +
    '*Paso 1/5*: ¿Cuál es la *sección electoral*?\n\n' +
    '_Escribe el número de sección o /cancelar para salir_',
    { parse_mode: 'Markdown', reply_markup: tecladoCancelar }
  );

  const msgSeccion = await conversation.waitFor('message:text');
  if (msgSeccion.message.text === '/cancelar') {
    return ctx.reply('❌ Captura cancelada.');
  }
  const seccion = msgSeccion.message.text.trim();

  // ── PASO 2: Número de casilla ─────────────────────────────────────────
  await ctx.reply(
    `*Paso 2/5*: ¿Cuál es el número de casilla en la sección *${seccion}*?\n\n` +
    `_Ejemplo: 01, 02, 1C (contigua), 1E (especial)_`,
    { parse_mode: 'Markdown', reply_markup: tecladoCancelar }
  );

  const msgCasilla = await conversation.waitFor('message:text');
  if (msgCasilla.message.text === '/cancelar') {
    return ctx.reply('❌ Captura cancelada.');
  }
  const casilla = msgCasilla.message.text.trim();

  // ── PASO 3: Nombre del RC ─────────────────────────────────────────────
  await ctx.reply(
    `*Paso 3/5*: ¿Cuál es el nombre completo del RC en casilla *${seccion}-${casilla}*?`,
    { parse_mode: 'Markdown', reply_markup: tecladoCancelar }
  );

  const msgNombre = await conversation.waitFor('message:text');
  if (msgNombre.message.text === '/cancelar') {
    return ctx.reply('❌ Captura cancelada.');
  }
  const nombreRC = msgNombre.message.text.trim();

  // ── PASO 4: Tipo de evento ────────────────────────────────────────────
  await ctx.reply(
    `*Paso 4/5*: ¿Qué acción registras para *${nombreRC}*?`,
    { parse_mode: 'Markdown', reply_markup: tecladoTipoRC }
  );

  const cbTipo = await conversation.waitFor('callback_query:data');
  await cbTipo.answerCallbackQuery();
  const tipoAccion = cbTipo.callbackQuery.data;
  const tipoTexto = {
    rc_llego: '📍 Llegó',
    rc_salio: '🚪 Salió',
    rc_incidencia: '⚠️ Incidencia',
    rc_cierre: '✅ Cierre',
  }[tipoAccion] || tipoAccion;

  if (tipoAccion === 'cancelar') {
    return ctx.reply('❌ Captura cancelada.');
  }

  // ── PASO 5: Foto de evidencia (opcional) ──────────────────────────────
  const { InlineKeyboard } = await import('grammy');
  const tecladoFoto = new InlineKeyboard()
    .text('📷 Enviar foto', 'foto_si')
    .text('⏭️ Omitir', 'foto_no');

  await ctx.reply(
    '*Paso 5/5*: ¿Deseas adjuntar una foto de evidencia?',
    { parse_mode: 'Markdown', reply_markup: tecladoFoto }
  );

  const cbFoto = await conversation.waitFor('callback_query:data');
  await cbFoto.answerCallbackQuery();

  let fotoFileId = null;

  if (cbFoto.callbackQuery.data === 'foto_si') {
    await ctx.reply('📸 Envía la foto ahora:');
    const msgFoto = await conversation.waitFor('message:photo');
    // Guardar el file_id de la foto de mayor resolución
    const fotos = msgFoto.message.photo;
    fotoFileId = fotos[fotos.length - 1].file_id;
    await ctx.reply('✅ Foto recibida.');
  }

  // ── RESUMEN ───────────────────────────────────────────────────────────
  const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Tijuana' });
  const resumen =
    `🗳️ *Resumen de captura RC*\n\n` +
    `📍 Sección: *${seccion}* | Casilla: *${casilla}*\n` +
    `👤 RC: *${nombreRC}*\n` +
    `🎯 Acción: *${tipoTexto}*\n` +
    `📷 Foto: ${fotoFileId ? '✅ Adjunta' : 'No'}\n` +
    `🕐 Hora: ${ahora}\n\n` +
    `¿Confirmas el registro?`;

  const tecladoConfirmar = new InlineKeyboard()
    .text('✅ Sí, guardar', 'confirmar_rc')
    .text('❌ Cancelar', 'cancelar_rc');

  await ctx.reply(resumen, { parse_mode: 'Markdown', reply_markup: tecladoConfirmar });

  const cbConfirma = await conversation.waitFor('callback_query:data');
  await cbConfirma.answerCallbackQuery();

  if (cbConfirma.callbackQuery.data !== 'confirmar_rc') {
    return ctx.reply('❌ Captura cancelada. No se guardó ningún dato.');
  }

  // ── GUARDAR EN SUPABASE ───────────────────────────────────────────────
  try {
    await guardarCapturaRC({
      usuario_id: miembro.id,
      seccion,
      casilla,
      nombre_rc: nombreRC,
      tipo_accion: tipoAccion.replace('rc_', ''),
      foto_file_id: fotoFileId,
    });

    await ctx.reply(
      '✅ *¡Captura guardada exitosamente!*\n\n' +
      `_Registrado por: ${miembro.nombre_completo || miembro.usuario}_`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Error guardando RC:', err.message);
    await ctx.reply('❌ Error al guardar. Intenta de nuevo o contacta al administrador.');
  }
}
