import { verificarUsuarioActivo } from './db.js';

/**
 * Middleware de autenticación.
 * Verifica que el usuario tenga su telegram_id vinculado y bot_activo = true.
 * Si no está autenticado, le indica que ejecute /start para registrarse.
 */
export async function authMiddleware(ctx, next) {
  if (ctx.miembro) {
    return next();
  }

  // Usuario no autenticado
  await ctx.reply(
    '🔒 *Acceso restringido*\n\n' +
    'Solo usuarios registrados pueden usar este bot.\n\n' +
    'Usa el comando /start para verificar tu número de teléfono.',
    { parse_mode: 'Markdown' }
  );
}

/**
 * Middleware de administrador.
 * Solo permite el paso a IDs configurados en ADMIN_IDS.
 */
export function adminMiddleware(ctx, next) {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => parseInt(id.trim()))
    .filter(Boolean);

  if (adminIds.includes(ctx.from?.id)) {
    return next();
  }

  return ctx.reply('⛔ Solo los administradores pueden usar este comando.');
}
