# Спецификация зависимостей проекта (Dependencies)

В проекте используется стандартный менеджер пакетов **npm**.

- Основной фиксирующий файл блокировки версий: **[`package-lock.json`](./package-lock.json)** (lockfileVersion 3, строго фиксирует точные версии, дерево зависимостей и SHA-512 хэши всех 174 пакетов).
- Манифест зависимостей: **[`package.json`](./package.json)**.

---

## 📦 Runtime-зависимости (Production Dependencies)

| Пакет | Зафиксированная версия | Назначение |
| :--- | :---: | :--- |
| [`@maxhub/max-bot-api`](https://www.npmjs.com/package/@maxhub/max-bot-api) | `^0.3.1` (0.3.1) | Официальный SDK чат-ботов платформы MAX (max.ru) |
| [`express`](https://www.npmjs.com/package/express) | `^4.21.2` (4.22.3) | HTTP-сервер, раздача REST API и статических файлов мини-приложения |
| [`cors`](https://www.npmjs.com/package/cors) | `^2.8.5` (2.8.6) | CORS middleware для проксирования медиа и API |
| [`tsx`](https://www.npmjs.com/package/tsx) | `^4.19.3` (4.23.15) | Высокопроизводительный движок на базе esbuild для запуска TypeScript-сервера в production |
| [`react`](https://www.npmjs.com/package/react) | `^19.2.8` (19.3.0) | React 19 фреймворк пользовательского интерфейса |
| [`react-dom`](https://www.npmjs.com/package/react-dom) | `^19.2.8` (19.3.0) | Рендеринг React в DOM |
| [`lucide-react`](https://www.npmjs.com/package/lucide-react) | `^1.48.0` (1.48.0) | Набор векторных иконок для интерфейса |
| [`maplibre-gl`](https://www.npmjs.com/package/maplibre-gl) | `^6.10.0` (6.11.2) | Векторная интерактивная карта мероприятий |
| [`supercluster`](https://www.npmjs.com/package/supercluster) | `^9.1.0` (9.1.0) | Быстрая гео-кластеризация маркеров на карте |

---

## 🛠️ Dev-зависимости (Сборка и типизация)

| Пакет | Зафиксированная версия | Назначение |
| :--- | :---: | :--- |
| [`vite`](https://www.npmjs.com/package/vite) | `^8.3.0` (8.3.1) | Быстрый бандлер и dev-сервер фронтенда |
| [`typescript`](https://www.npmjs.com/package/typescript) | `~5.8.2` (5.8.3) | Компилятор TypeScript и проверка типов |
| [`@vitejs/plugin-react`](https://www.npmjs.com/package/@vitejs/plugin-react) | `^6.1.1` (6.1.1) | Плагин поддержки React и Fast Refresh для Vite |
| [`concurrently`](https://www.npmjs.com/package/concurrently) | `^9.1.2` (9.2.4) | Параллельный запуск процессов в режиме локальной разработки |
| [`@types/node`](https://www.npmjs.com/package/@types/node) | `^24.13.3` (24.19.0) | TypeScript типы для Node.js runtime |
| [`@types/express`](https://www.npmjs.com/package/@types/express) | `^5.0.0` (5.0.6) | TypeScript типы для Express |
| [`@types/cors`](https://www.npmjs.com/package/@types/cors) | `^2.8.17` (2.8.19) | TypeScript типы для CORS |
| [`@types/react`](https://www.npmjs.com/package/@types/react) | `^19.2.18` (19.3.0) | TypeScript типы для React |
| [`@types/react-dom`](https://www.npmjs.com/package/@types/react-dom) | `^19.2.7` (19.3.0) | TypeScript типы для ReactDOM |
| [`@types/supercluster`](https://www.npmjs.com/package/@types/supercluster) | `^7.1.3` (7.1.3) | TypeScript типы для библиотеки кластеризации |
| [`@types/geojson`](https://www.npmjs.com/package/@types/geojson) | `^7946.0.16` (7946.0.16) | TypeScript типы для GeoJSON структур карты |

---

## ⚙️ Воспроизводимая установка зависимостей

Для гарантированной установки **абсолютно идентичных** версий библиотек (как в Docker, так и на хосте):

```bash
npm ci
```

Команда `npm ci` использует исключительно файл `package-lock.json`, гарантируя 100% повторяемость сборки и исключая любые расхождения в зависимостях.
