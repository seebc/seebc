import 'dotenv/config';
import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';

import {
  buscarUsuarioPorTelefono,
  vincularTelegramId,
  verificarUsuarioActivo,
  obtenerMisCapturas,
  registrarAccesoBot,
} from './db.js';
import { authMiddleware } from './middleware.js';
import { tecladoCompartirTelefono, menuPrincipal } from './teclados.js';
import { conversacionRG } from './conversations/captura_rg.js';
import { conversacionRC } from './conversations/captura_rc.js';
import { conversacionRegistroRG } from './conversations/registro_rg.js';
import { conversacionRegistroRC } from './conversations/registro_rc.js';

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────────────────────

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN no está definido en .env');
}

const bot = new Bot(process.env.BOT_TOKEN);

// Sesiones en memoria (en producción usar @grammyjs/storage-redis o similar)
bot.use(session({ initial: () => ({}) }));

// Global middleware to attach ctx.miembro before conversations intercept the updates
bot.use(async (ctx, next) => {
  const telegramId = ctx.from?.id;
  if (telegramId) {
    try {
      const miembro = await verificarUsuarioActivo(telegramId);
      if (miembro) {
        ctx.miembro = miembro;
        // Persist in session for future updates
        ctx.session.miembro = miembro;
      } else {
        // DB returned null — use session as fallback (e.g. during DB hiccup or timing)
        if (ctx.session?.miembro) {
          ctx.miembro = ctx.session.miembro;
        }
      }
    } catch (err) {
      console.error('Error in global middleware verifying user:', err.message);
      // On error, fall back to session so the user isn't locked out
      if (ctx.session?.miembro) {
        ctx.miembro = ctx.session.miembro;
      }
    }
  }
  return next();
});

// Plugin de conversaciones (formularios multi-paso)
bot.use(conversations());

// Registrar conversaciones
bot.use(createConversation(conversacionRG, 'captura_rg'));
bot.use(createConversation(conversacionRC, 'captura_rc'));
bot.use(createConversation(conversacionRegistroRG, 'registro_rg'));
bot.use(createConversation(conversacionRegistroRC, 'registro_rc'));

// ─────────────────────────────────────────────────────────────────────────────
// COMANDO /start — Verificación de teléfono
// ─────────────────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  try {
    console.log('Received /start from', ctx.from?.username || ctx.from?.id);
    const telegramId = ctx.from.id;

    // ¿Ya está registrado?
    const miembro = await verificarUsuarioActivo(telegramId);
    if (miembro) {
      await ctx.reply(
        `¡Bienvenido de vuelta, *${miembro.nombre_completo || miembro.usuario}*! 👋\n\n` +
          '¿Qué deseas hacer?',
        { parse_mode: 'Markdown', reply_markup: menuPrincipal }
      );
      return;
    }

    // Primera vez: pedir número de teléfono
    await ctx.reply(
      '👋 *Bienvenido al sistema SEEBC*\n\n' +
        'Este bot es exclusivo para representantes registrados.\n\n' +
        '📱 Para verificar tu identidad, presiona el botón de abajo para compartir tu número de teléfono.\n\n' +
        '_Tu número se comparará con la base de datos de miembros registrados._',
      {
        parse_mode: 'Markdown',
        reply_markup: tecladoCompartirTelefono,
      }
    );
  } catch (err) {
    console.error('Error in /start handler:', err);
    await ctx.reply('⚠️ Ocurrió un error interno. Por favor, intenta más tarde.');
  }
});

// ── /salir — Mensaje de despedida (accesible sin autenticación)
bot.command('salir', async (ctx) => {
  // Si hay una conversación activa, cerrarla
  if (ctx.conversation) await ctx.conversation.exit();
  await ctx.reply('👋 ¡Hasta luego! Gracias por su participación. Si deseas volver, escribe /start.', { reply_markup: { remove_keyboard: true } });
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE CONTACTO — Verificación
// ─────────────────────────────────────────────────────────────────────────────

bot.on('message:contact', async (ctx) => {
  const contacto = ctx.message.contact;
  const telegramId = ctx.from.id;

  // Telegram solo permite compartir el propio número (seguridad nativa)
  // user_id puede venir undefined en algunos clientes o configuraciones de privacidad
  if (contacto.user_id && String(contacto.user_id) !== String(telegramId)) {
    await ctx.reply(
      '⚠️ Solo puedes compartir *tu propio* número de teléfono.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const telefono = contacto.phone_number;
  await ctx.reply('🔍 Verificando tu número en la base de datos...');

  try {
    const usuario = await buscarUsuarioPorTelefono(telefono);

    if (!usuario) {
      await ctx.reply(
        '❌ *Número no encontrado*\n\n' +
        `Tu número \`${telefono}\` no está registrado en el sistema.\n\n` +
        'Pide a tu administrador que registre tu teléfono en la sección de Usuarios.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Vincular telegram_id
    await vincularTelegramId(usuario.id, telegramId);
    // Registrar acceso en el log
    await registrarAccesoBot(usuario.id, usuario.nombre_completo || usuario.usuario);
    // Attach member info to context and session
    ctx.miembro = { ...usuario, telegram_id: telegramId, bot_activo: true };
    ctx.session.miembro = ctx.miembro;

    await ctx.reply(
      `✅ *¡Verificado exitosamente!*\n\n` +
      `Bienvenido, *${usuario.nombre_completo || usuario.usuario}*\n` +
      `Rol: ${usuario.rol}\n\n` +
      '🎉 Ya tienes acceso completo al sistema.',
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );

    // Mostrar menú principal
    await ctx.reply(
      '¿Qué deseas capturar?',
      { reply_markup: menuPrincipal }
    );
  } catch (err) {
    console.error('Error en verificación:', err.message);
    await ctx.reply('❌ Error de sistema. Intenta de nuevo en un momento.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MENSAJES DE TEXTO DE USUARIOS NO AUTENTICADOS
// Captura mensajes de texto (ej. el usuario escribe su número en vez de
// usar el botón) ANTES del middleware de auth, para dar un mensaje útil.
// ─────────────────────────────────────────────────────────────────────────────

bot.on('message:text', async (ctx, next) => {
  // Si el texto es un comando (/start, /ayuda, etc.) dejarlo pasar
  if (ctx.message.text.startsWith('/')) return next();

  // Verificar si el usuario ya está autenticado
  if (ctx.miembro) return next(); // Autenticado → continuar normalmente

  // Usuario NO autenticado que escribió texto: guiarlo al botón
  await ctx.reply(
    '📱 Para acceder al sistema necesitas verificar tu identidad.\n\n' +
    'Usa el botón de abajo para compartir tu número de teléfono automáticamente.\n\n' +
    '_No escribas el número manualmente, usa el botón._',
    {
      parse_mode: 'Markdown',
      reply_markup: tecladoCompartirTelefono,
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMANDOS PROTEGIDOS (requieren auth)
// ─────────────────────────────────────────────────────────────────────────────

const protegido = bot.filter((ctx) => {
  // Permitir /start y contactos sin auth
  if (ctx.message?.text === '/start') return false;
  if (ctx.message?.contact) return false;
  return true;
});

protegido.use(authMiddleware);

// ── /capturar — Menú principal ─────────────────────────────────────────────
protegido.command('capturar', async (ctx) => {
  await ctx.reply('¿Qué deseas capturar?', { reply_markup: menuPrincipal });
});

// ── /captura_general ───────────────────────────────────────────────────────
protegido.command('captura_general', async (ctx) => {
  await ctx.conversation.enter('captura_rg');
});

// ── /captura_casilla ──────────────────────────────────────────────────────
protegido.command('captura_casilla', async (ctx) => {
  await ctx.conversation.enter('captura_rc');
});

// ── /mis_capturas ──────────────────────────────────────────────────────────
protegido.command('mis_capturas', async (ctx) => {
  const miembro = ctx.miembro;
  const { rg, rc } = await obtenerMisCapturas(miembro.id);

  let texto = `📋 *Tus últimas capturas*\n\n`;

  texto += `👤 *Generales (RG)*\n`;
  if (rg.length === 0) {
    texto += '  _Sin capturas_\n';
  } else {
    rg.forEach((r) => {
      const fecha = new Date(r.created_at).toLocaleString('es-MX', { timeZone: 'America/Tijuana' });
      texto += `  • Ruta ${r.ruta} | ${r.nombre_rg} | ${r.tipo_accion} — ${fecha}\n`;
    });
  }

  texto += `\n🗳️ *Casillas (RC)*\n`;
  if (rc.length === 0) {
    texto += '  _Sin capturas_\n';
  } else {
    rc.forEach((r) => {
      const fecha = new Date(r.created_at).toLocaleString('es-MX', { timeZone: 'America/Tijuana' });
      texto += `  • Sec. ${r.seccion} Cas. ${r.casilla} | ${r.nombre_rc} | ${r.tipo_accion} — ${fecha}\n`;
    });
  }

  await ctx.reply(texto, { parse_mode: 'Markdown' });
});

// ── /cancelar — Salir de conversación activa ───────────────────────────────
protegido.command('cancelar', async (ctx) => {
  await ctx.conversation.exit();
  await ctx.reply('❌ Operación cancelada.', { reply_markup: menuPrincipal });
});

// ── /salir — Mensaje de despedida al cerrar la interacción
// Duplicate protected /salir command removed to avoid conflict. The unprotected /salir defined earlier handles exit for all users.

// ── /ayuda ─────────────────────────────────────────────────────────────────
protegido.command('ayuda', async (ctx) => {
  await ctx.reply(
    '📖 *Comandos disponibles*\n\n' +
    '`capturar` — Menú principal\n' +
    '`captura_general` — Registrar acción de RG\n' +
    '`captura_casilla` — Registrar acción de RC\n' +
    '`mis_capturas` — Ver mis últimas capturas\n' +
    '`cancelar` — Cancelar operación actual\n' +
    '`ayuda` — Ver esta ayuda\n\n' +
    '💬 Ante cualquier problema contacta a tu coordinador.',
    { parse_mode: 'Markdown' }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLBACKS DE MENÚ PRINCIPAL (botones inline)
// ─────────────────────────────────────────────────────────────────────────────

protegido.callbackQuery('menu_rg', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('captura_rg');
});

protegido.callbackQuery('menu_rc', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('captura_rc');
});

protegido.callbackQuery('menu_registro_rg', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('registro_rg');
});

protegido.callbackQuery('menu_registro_rc', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('registro_rc');
});

protegido.callbackQuery('menu_capturas', async (ctx) => {
  await ctx.answerCallbackQuery();
  const miembro = ctx.miembro;
  const { rg, rc } = await obtenerMisCapturas(miembro.id);

  let texto = `📋 *Tus últimas capturas*\n\n`;
  texto += `RG: ${rg.length} registros | RC: ${rc.length} registros\n\n`;

  if (rg.length > 0) {
    texto += `*Generales:*\n`;
    rg.slice(0, 3).forEach((r) => {
      texto += `  • ${r.ruta} — ${r.nombre_rg} (${r.tipo_accion})\n`;
    });
  }

  if (rc.length > 0) {
    texto += `\n*Casillas:*\n`;
    rc.slice(0, 3).forEach((r) => {
      texto += `  • Sec.${r.seccion}/Cas.${r.casilla} — ${r.nombre_rc} (${r.tipo_accion})\n`;
    });
  }

  await ctx.reply(texto, { parse_mode: 'Markdown', reply_markup: menuPrincipal });
});

// ─────────────────────────────────────────────────────────────────────────────
// MANEJO DE ERRORES
// ─────────────────────────────────────────────────────────────────────────────

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error procesando update ${ctx.update.update_id}:`, err.error);
});

// ─────────────────────────────────────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────────────────────────────────────

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());

bot.start({
  onStart: (botInfo) => {
    console.log(`Bot ${botInfo.username} está polling…`);
    console.log(`
╔══════════════════════════════════════╗
║   🤖 SEEBC Bot iniciado              ║
║   @${botInfo.username.padEnd(28)}║
║   ${new Date().toLocaleString('es-MX').padEnd(35)}║
╚══════════════════════════════════════╝
    `);
  },
});
