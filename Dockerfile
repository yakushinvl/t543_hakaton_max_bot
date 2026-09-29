# syntax=docker/dockerfile:1

# ==========================================
# 1. Builder Stage: сборка SPA-клиента (Vite + React)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Кэширование слоя зависимостей для быстрой повторной сборки
COPY package.json package-lock.json ./

# Установка зависимостей сборщика
RUN npm ci

# Копирование исходных файлов
COPY . .

# Сборка статических файлов фронтенда в /app/dist
RUN npm run build

# ==========================================
# 2. Production Runner Stage: минимальный легковесный образ
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Копирование манифестов для установки только production-зависимостей
COPY package.json package-lock.json ./

# Установка production-зависимостей и очистка кэша npm
RUN npm ci --omit=dev && npm cache clean --force

# Копирование собранного статического фронтенда
COPY --from=builder /app/dist ./dist

# Копирование серверной части и конфигураций TypeScript
COPY server ./server
COPY tsconfig.json tsconfig.node.json ./

# Подготовка директории данных и передача прав пользователю node
RUN mkdir -p /app/server/data && chown -R node:node /app

USER node

EXPOSE 3001

# Проверка работоспособности сервиса
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

# Запуск приложения (Express API + статика + MAX Bot)
CMD ["npm", "start"]
