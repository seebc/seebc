# Dockerfile — telegram-bot
# Render clona el repo completo (contexto = raíz del repo) y luego usa este Dockerfile.
# Por eso cada ruta debe comenzar con "telegram-bot/".

FROM node:20-alpine

# Crear usuario no‑root
RUN addgroup -S bot && adduser -S bot -G bot

WORKDIR /app

# Copiar dependencias del sub‑directorio telegram-bot/
COPY telegram-bot/package.json telegram-bot/package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar el código fuente del sub‑directorio
COPY telegram-bot/src ./src

# Cambiar a usuario no‑root
USER bot

# Comando de arranque
CMD ["node", "src/index.js"]
