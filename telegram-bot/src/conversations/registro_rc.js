import {
  guardarNuevoRC,
  getCasillasPorSeccion,
  getMunicipios,
  verificarClaveElectorExistente,
  verificarUsuarioActivo
} from '../db.js';
import { tecladoCancelar } from '../teclados.js';
import { InlineKeyboard } from 'grammy';

/**
 * Pide al usuario que escriba texto
 */
async function pedirTexto(ctx, conversation, pregunta, opcional = false) {
  let valido = false;
  let respuesta = '';
  
  while (!valido) {
    await ctx.reply(pregunta + (opcional ? ' *(Opcional, escribe "-" para saltar)*' : ''), {
      parse_mode: 'Markdown',
      reply_markup: tecladoCancelar
    });
    const res = await conversation.waitFor(['message:text', 'callback_query:data']);
    
    if (res.callbackQuery?.data === 'cancelar' || res.message?.text === '/cancelar') {
      if (res.callbackQuery) await res.answerCallbackQuery();
      throw new Error('CANCELADO');
    }
    
    if (!res.message?.text) continue;
    
    respuesta = res.message.text.trim().toUpperCase();
    if (opcional && (respuesta === '-' || respuesta === 'NINGUNA' || respuesta === 'N/A' || respuesta === 'NINGUNO')) {
      return '';
    }
    
    if (!opcional && respuesta.length === 0) {
      await ctx.reply('⚠️ Este campo es obligatorio.');
    } else {
      valido = true;
    }
  }
  return respuesta;
}

/**
 * Pide un sí/no con botones inline
 */
async function pedirBooleano(ctx, conversation, pregunta) {
  const teclado = new InlineKeyboard().text('Sí', 'si').text('No', 'no');
  await ctx.reply(pregunta, { reply_markup: teclado });
  const cb = await conversation.waitFor('callback_query:data');
  await cb.answerCallbackQuery();
  return cb.callbackQuery.data === 'si';
}

export async function conversacionRegistroRC(conversation, ctx) {
  // Obtener miembro desde la BD al inicio de la conversación
  const telegramId = ctx.from?.id;
  const miembro = ctx.miembro || await conversation.external(() => verificarUsuarioActivo(telegramId));
  if (!miembro) {
    await ctx.reply('⚠️ Necesitas estar autenticado. Usa /start para verificar tu número de teléfono.');
    return;
  }

  try {
    await ctx.reply('📝 *Registro de Nuevo Representante de Casilla (RC)*\n\nVamos a pedirte los datos paso a paso.', { parse_mode: 'Markdown' });

    // 1. Datos Personales
    let clave_elector = '';
    while (true) {
      const raw_clave = await pedirTexto(ctx, conversation, '1. Ingresa la *Clave de Elector* (18 caracteres):');
      const clave_elector_temp = raw_clave.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      if (clave_elector_temp.length !== 18) {
        await ctx.reply('❌ La clave de elector debe tener exactamente 18 caracteres alfanuméricos. Intenta de nuevo o escribe /cancelar.');
        continue;
      }
      clave_elector = clave_elector_temp;
      
      const chequeo = await conversation.external(() => verificarClaveElectorExistente(clave_elector));
      if (chequeo.existe) {
        await ctx.reply(`❌ *Esta clave ya está registrada* como ${chequeo.tipo} a nombre de ${chequeo.nombre}.\n\nPor favor, verifica la clave e intenta de nuevo o escribe /cancelar.`, { parse_mode: 'Markdown' });
        continue;
      }
      break;
    }
    
    const nombre = await pedirTexto(ctx, conversation, '2. *Nombre(s)* del RC:');
    const apellido_paterno = await pedirTexto(ctx, conversation, '3. *Apellido Paterno*:');
    const apellido_materno = await pedirTexto(ctx, conversation, '4. *Apellido Materno*:', true);
    const telefono = await pedirTexto(ctx, conversation, '5. *Teléfono* (10 dígitos):');
    const correo_electronico = (await pedirTexto(ctx, conversation, '6. *Correo Electrónico*:', true)).toLowerCase();
    
    const numero_credencial = await pedirTexto(ctx, conversation, '7. *Número de Credencial (OCR)* (Reverso de la INE):', true);
    const cic = await pedirTexto(ctx, conversation, '8. *CIC* (Identificador Ciudadano de 9 dígitos):', true);
    
    // 2. Ubicación Electoral
    const municipios = await conversation.external(() => getMunicipios());
    const tecladoMuns = new InlineKeyboard();
    municipios.forEach(m => tecladoMuns.text(m.nombre || m.municipio || `Municipio ${m.id}`, String(m.id)).row());
    await ctx.reply('9. ¿A qué *Municipio* pertenece?', { parse_mode: 'Markdown', reply_markup: tecladoMuns });
    const cbMun = await conversation.waitFor('callback_query:data');
    await cbMun.answerCallbackQuery();
    const municipio_id = parseInt(cbMun.callbackQuery.data);
    
    const dfInput = await pedirTexto(ctx, conversation, '10. *Distrito Federal (DF)* (ej. 1, 2, 7):');
    const df_id = parseInt(dfInput) || 0;
    
    const dlInput = await pedirTexto(ctx, conversation, '11. *Distrito Local (DL)* (ej. 1, 2, 3...):');
    const dl_id = parseInt(dlInput) || 0;
    
    const seccionInput = await pedirTexto(ctx, conversation, '12. *Número de Sección* (para buscar la casilla):');
    const seccion_id = parseInt(seccionInput) || 0;
    
    // Buscar casillas en esa sección
    let casilla_id = null;
    let casillaStr = '';
    const casillas = await getCasillasPorSeccion(seccion_id);
    
    if (casillas && casillas.length > 0) {
      const tecladoCasillas = new InlineKeyboard();
      casillas.forEach(c => tecladoCasillas.text(c.casilla, String(c.casilla_id)).row());
      await ctx.reply(`13. Hemos encontrado estas casillas para la sección ${seccion_id}. Selecciona una:`, { reply_markup: tecladoCasillas });
      const cbCasilla = await conversation.waitFor('callback_query:data');
      await cbCasilla.answerCallbackQuery();
      casilla_id = cbCasilla.callbackQuery.data;
      casillaStr = casillas.find(c => String(c.casilla_id) === casilla_id)?.casilla || '';
    } else {
      await ctx.reply(`⚠️ No encontramos casillas para la sección ${seccion_id} en la base de datos. Pídele al admin que las revise. Cancelando...`);
      return;
    }
    
    // Tipo de nombramiento
    const tecladoRoles = new InlineKeyboard()
      .text('Propietario 1', 'PROPIETARIO 1').text('Suplente 1', 'SUPLENTE 1').row()
      .text('Propietario 2', 'PROPIETARIO 2').text('Suplente 2', 'SUPLENTE 2');
    
    await ctx.reply('14. ¿Qué *tipo de nombramiento* tiene?', { parse_mode: 'Markdown', reply_markup: tecladoRoles });
    const cbRol = await conversation.waitFor('callback_query:data');
    await cbRol.answerCallbackQuery();
    const tipo_nombramiento = cbRol.callbackQuery.data;
    
    // 3. Domicilio
    const calle = await pedirTexto(ctx, conversation, '15. *Calle*:');
    const num_ext = await pedirTexto(ctx, conversation, '16. *Número Exterior*:');
    const num_int = await pedirTexto(ctx, conversation, '17. *Número Interior*:', true);
    const colonia = await pedirTexto(ctx, conversation, '18. *Colonia*:');
    const codigo_postal = await pedirTexto(ctx, conversation, '19. *Código Postal*:');
    
    // 4. Preguntas Booleanas
    const credencial_vigente = await pedirBooleano(ctx, conversation, '20. ¿La credencial está *vigente*?');
    const es_militante = await pedirBooleano(ctx, conversation, '21. ¿Es *militante*?');
    const firma_capturada = await pedirBooleano(ctx, conversation, '22. ¿Se cuenta con la *Firma Capturada*?');
    
    // Resumen
    const resumen = `📋 *RESUMEN DEL RC*
👤 Nombre: ${nombre} ${apellido_paterno} ${apellido_materno}
💳 Clave: ${clave_elector} | OCR: ${numero_credencial || 'N/A'} | CIC: ${cic || 'N/A'}
📞 Tel: ${telefono}
📍 Mun: ${municipio_id} | DF: ${df_id} | DL: ${dl_id} | Sec: ${seccion_id}
🗳️ Casilla: ${casillaStr} (${tipo_nombramiento})
🏠 Dir: ${calle} ${num_ext}, ${colonia}, CP ${codigo_postal}
✅ Firma: ${firma_capturada ? 'Sí' : 'No'} | Militante: ${es_militante ? 'Sí' : 'No'}

¿Deseas guardar este registro?`;

    const tecladoConfirmacion = new InlineKeyboard().text('✅ Guardar Registro', 'guardar_rc').text('❌ Cancelar', 'cancelar');
    await ctx.reply(resumen, { parse_mode: 'Markdown', reply_markup: tecladoConfirmacion });

    const cbFinal = await conversation.waitFor('callback_query:data');
    await cbFinal.answerCallbackQuery();
    
    if (cbFinal.callbackQuery.data !== 'guardar_rc') {
      return ctx.reply('❌ Registro cancelado.', { reply_markup: { remove_keyboard: true } });
    }

    // Construir Payload
    const payload = {
      nombre,
      apellido_paterno,
      apellido_materno,
      clave_elector: clave_elector.toUpperCase().trim().replace(/[^A-Z0-9]/g, ''),
      numero_credencial: numero_credencial.toUpperCase().trim().replace(/[^A-Z0-9]/g, ''),
      cic: cic.toUpperCase().trim().replace(/[^A-Z0-9]/g, ''),
      telefono: telefono.replace(/\D/g, '').slice(0, 10),
      correo_electronico: correo_electronico !== '-' ? correo_electronico.toLowerCase().trim() : null,
      df_id,
      dl_id,
      seccion_id,
      calle,
      num_ext,
      num_int,
      colonia,
      codigo_postal,
      credencial_vigente,
      es_militante,
      autoriza_propaganda: false,
      tipo_propaganda: 'Ninguno',
      firma_capturada,
      casilla_id,
      tipo_nombramiento,
      capturista_id: miembro.id
    };

    await guardarNuevoRC(payload);
    await ctx.reply('✅ *Representante de Casilla registrado correctamente.*', { parse_mode: 'Markdown' });

  } catch (err) {
    if (err.message === 'CANCELADO') {
      await ctx.reply('❌ Proceso cancelado por el usuario.');
    } else {
      console.error('Error registrando RC:', err);
      await ctx.reply(`❌ Ocurrió un error al guardar: ${err.message}`);
    }
  }
}
