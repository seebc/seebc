import {
  guardarNuevoRG,
  getDistritosFederales,
  getDistritosLocales,
  getMunicipios,
  verificarClaveElectorExistente,
  verificarUsuarioActivo
} from '../db.js';
import { tecladoCancelar } from '../teclados.js';
import { InlineKeyboard } from 'grammy';

/**
 * Pide al usuario que escriba texto, repitiendo si lo deja vacío o lo cancela.
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
 * Pide un sí/no con botones inline. Lanza Error('CANCELADO') si el usuario cancela.
 */
async function pedirBooleano(ctx, conversation, pregunta) {
  const teclado = new InlineKeyboard()
    .text('✅ Sí', 'si')
    .text('❌ No', 'no')
    .text('🚫 Cancelar', 'cancelar');
  await ctx.reply(pregunta, { parse_mode: 'Markdown', reply_markup: teclado });
  const cb = await conversation.waitFor('callback_query:data');
  await cb.answerCallbackQuery();
  if (cb.callbackQuery.data === 'cancelar') throw new Error('CANCELADO');
  return cb.callbackQuery.data === 'si';
}

export async function conversacionRegistroRG(conversation, ctx) {
  // Obtener miembro desde la BD al inicio de la conversación
  const telegramId = ctx.from?.id;
  const miembro = ctx.miembro || await conversation.external(() => verificarUsuarioActivo(telegramId));
  if (!miembro) {
    await ctx.reply('⚠️ Necesitas estar autenticado. Usa /start para verificar tu número de teléfono.');
    return;
  }

  // Loop para permitir registrar múltiples RG sin recursión
  let continuar = true;
  while (continuar) {
    continuar = false;
    try {
      await ctx.reply('📝 *Registro de Nuevo Representante General*\n\nVamos a pedirte los datos paso a paso.', { parse_mode: 'Markdown' });

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
      
      const nombre = await pedirTexto(ctx, conversation, '2. *Nombre(s)* del RG:');
      const apellido_paterno = await pedirTexto(ctx, conversation, '3. *Apellido Paterno*:');
      const apellido_materno = await pedirTexto(ctx, conversation, '4. *Apellido Materno*:', true); // ✅ Opcional
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
      
      const dlInput = await pedirTexto(ctx, conversation, '11. *Distrito Local (DL)* (ej. 1, 2, 3...):'); // ✅ Corregido de 8→11
      const dl_id = parseInt(dlInput) || 0;
      
      const seccionInput = await pedirTexto(ctx, conversation, '12. *Número de Sección*:'); // ✅ Corregido de 9→12
      const seccion_id = parseInt(seccionInput) || 0;

      // 3. Domicilio
      const calle = await pedirTexto(ctx, conversation, '13. *Calle*:');
      const num_ext = await pedirTexto(ctx, conversation, '14. *Número Exterior*:');
      const num_int = await pedirTexto(ctx, conversation, '15. *Número Interior*:', true);
      const colonia = await pedirTexto(ctx, conversation, '16. *Colonia*:');
      const codigo_postal = await pedirTexto(ctx, conversation, '17. *Código Postal*:');

      // 4. Preguntas Booleanas (con soporte de cancelación)
      const credencial_vigente = await pedirBooleano(ctx, conversation, '18. ¿La credencial está *vigente*?');
      const es_militante = await pedirBooleano(ctx, conversation, '19. ¿Es *militante*?');
      const firma_capturada = await pedirBooleano(ctx, conversation, '20. ¿Se cuenta con la *Firma Capturada*?');
      
      // Resumen
      const resumen = `📋 *RESUMEN DEL RG*
👤 Nombre: ${nombre} ${apellido_paterno} ${apellido_materno}
💳 Clave: ${clave_elector} | OCR: ${numero_credencial || 'N/A'} | CIC: ${cic || 'N/A'}
📞 Tel: ${telefono}
📍 Mun: ${municipio_id} | DF: ${df_id} | DL: ${dl_id} | Sec: ${seccion_id}
🏠 Dir: ${calle} ${num_ext}, ${colonia}, CP ${codigo_postal}
✅ Firma: ${firma_capturada ? 'Sí' : 'No'} | Militante: ${es_militante ? 'Sí' : 'No'}

¿Deseas guardar este registro?`;

      const tecladoConfirmacion = new InlineKeyboard().text('✅ Guardar Registro', 'guardar_rg').text('❌ Cancelar', 'cancelar');
      await ctx.reply(resumen, { parse_mode: 'Markdown', reply_markup: tecladoConfirmacion });

      const cbFinal = await conversation.waitFor('callback_query:data');
      await cbFinal.answerCallbackQuery();
      
      if (cbFinal.callbackQuery.data !== 'guardar_rg') {
        await ctx.reply('❌ Registro cancelado.', { reply_markup: { remove_keyboard: true } });
        return;
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
        capturista_id: miembro.id
      };

      await guardarNuevoRG(payload);
      await ctx.reply('✅ *Representante General registrado correctamente.*', { parse_mode: 'Markdown' });

      // Ofrecer registrar otro RG — usando loop, sin recursión
      const postKeyboard = new InlineKeyboard()
        .text('📄 Registrar otro RG', 'nuevo_rg')
        .text('🚪 Salir', 'salir_rg');
      await ctx.reply('¿Qué deseas hacer ahora?', { reply_markup: postKeyboard });
      const postCb = await conversation.waitFor('callback_query:data');
      await postCb.answerCallbackQuery();
      if (postCb.callbackQuery.data === 'nuevo_rg') {
        continuar = true; // ✅ Reinicia el loop en lugar de recursarse
      }

    } catch (err) {
      if (err.message === 'CANCELADO') {
        await ctx.reply('❌ Proceso cancelado por el usuario.');
      } else {
        console.error('Error registrando RG:', err);
        await ctx.reply(`❌ Ocurrió un error al guardar: ${err.message}`);
      }
    }
  }
}
