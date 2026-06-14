## Dockerfile
# ---- Builder stage -------------------------------------------------
FROM node:20-alpine AS builder

# Install git (optional, for private deps)
RUN apk add --no-cache git

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY telegram-bot ./telegram-bot
WORKDIR /app/telegram-bot

# ---- Runtime stage -------------------------------------------------
FROM node:20-alpine

# Create non‑root user
RUN addgroup -S bot && adduser -S bot -G bot
WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/telegram-bot ./

# Switch to non‑root user
USER bot

# Default command (uses scripts.start in package.json)
CMD ["npm", "start"]
