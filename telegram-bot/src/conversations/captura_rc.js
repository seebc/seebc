import { guardarCapturaRC, verificarUsuarioActivo, getCasillasPorSeccion } from '../db.js';
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
  const telegramId = ctx.from?.id;
  const miembro = ctx.miembro || await conversation.external(() => verificarUsuarioActivo(telegramId));
  if (!miembro) {
    return ctx.reply('⚠️ Sesión no válida. Usa /start para autenticarte.');
  }

  // ── PASO 1: Sección ───────────────────────────────────────────────────
  await ctx.reply(
    '🗳️ *Captura de Representante de Casilla*\n\n' +
    '*Paso 1/5*: ¿Cuál es la *sección electoral*?\n\n' +
    '_Escribe el número de sección o /cancelar para salir_',
    { parse_mode: 'Markdown', reply_markup: tecladoCancelar }
  );

  const resSeccion = await conversation.waitFor(['message:text', 'callback_query:data']);
  if (resSeccion.callbackQuery?.data === 'cancelar' || resSeccion.message?.text === '/cancelar') {
    if (resSeccion.callbackQuery) await resSeccion.answerCallbackQuery();
    return ctx.reply('❌ Captura cancelada.');
  }
  if (!resSeccion.message?.text) return ctx.reply('❌ Captura cancelada.');
  const seccion = resSeccion.message.text.trim();

  // ── PASO 2: Selección de casilla disponible ───────────────────────────────
    // Obtener casillas libres para la sección seleccionada
    const casillasLibres = await getCasillasPorSeccion(seccion);
    if (!casillasLibres || casillasLibres.length === 0) {
      return ctx.reply('⚠️ No hay casillas disponibles en esa sección.', { reply_markup: tecladoCancelar });
    }
    // Construir teclado inline con las casillas libres
    const { InlineKeyboard } = await import('grammy'); // única declaración
    const tecladoCasillas = new InlineKeyboard();
    casillasLibres.forEach((c) => {
      // Usamos el id como callback data para identificar la casilla
      tecladoCasillas.text(c.casilla, String(c.casilla_id)).row();
    });
    await ctx.reply(
      `*Paso 2/5*: Selecciona la casilla disponible en la sección *${seccion}*:`,
      { parse_mode: 'Markdown', reply_markup: tecladoCasillas }
    );

  const cbCasilla = await conversation.waitFor('callback_query:data');
    await cbCasilla.answerCallbackQuery();
    const casillaId = Number(cbCasilla.callbackQuery.data);
    // Buscar la casilla seleccionada en el listado previo
    const casillaObj = casillasLibres.find((c) => c.casilla_id === casillaId);
    if (!casillaObj) {
      return ctx.reply('⚠️ Casilla no válida o ya ocupada.');
    }
    const casilla = casillaObj.casilla; // el número o nombre de la casilla

  // ── PASO 3: Nombre del RC ─────────────────────────────────────────────
  await ctx.reply(
    `*Paso 3/5*: ¿Cuál es el nombre completo del RC en casilla *${seccion}-${casilla}*?`,
    { parse_mode: 'Markdown', reply_markup: tecladoCancelar }
  );

  const resNombre = await conversation.waitFor(['message:text', 'callback_query:data']);
  if (resNombre.callbackQuery?.data === 'cancelar' || resNombre.message?.text === '/cancelar') {
    if (resNombre.callbackQuery) await resNombre.answerCallbackQuery();
    return ctx.reply('❌ Captura cancelada.');
  }
  if (!resNombre.message?.text) return ctx.reply('❌ Captura cancelada.');
  const nombreRC = resNombre.message.text.trim();

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
