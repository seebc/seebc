# Dockerfile — telegram-bot
# Render usa telegram-bot/ como contexto de build (directorio del Dockerfile)
# Por eso los paths son relativos a telegram-bot/, no a la raíz del repo

FROM node:20-alpine

# Crear usuario no-root
RUN addgroup -S bot && adduser -S bot -G bot

WORKDIR /app

# Copiar dependencias (relativo al contexto = telegram-bot/)
COPY package.json package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar código fuente
COPY src ./src

# Cambiar a usuario no-root
USER bot

# Arrancar el bot
CMD ["node", "src/index.js"]
