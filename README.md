# PING — PLAY. WIN. COLLECT.

Mobile-first Telegram Mini App MVP for social table tennis. Players record opponent-confirmed matches, earn Elo and Pingpoints, join QR tournaments, and collect cosmetic stickers.

## Run locally

```bash
cd outputs/ping
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

## Онлайн-деплой

Проект содержит `Dockerfile` и `render.yaml` для быстрого деплоя в Render. Размести содержимое этого каталога в Git-репозитории и создай Render Blueprint из `render.yaml`. Добавь `TELEGRAM_BOT_TOKEN`, дождись HTTPS URL и укажи его в BotFather через `/setmenubutton` или `/newapp`. Для production обязательно используй постоянный disk/volume для SQLite.

Для Railway используй `railway.json`: подключи GitHub-репозиторий, создай Volume с mount path `/app/.data`, затем добавь Variables `APP_ENV=production`, `MOCK_TELEGRAM=false`, `DATABASE_URL=file:/app/.data/ping.sqlite`, `TELEGRAM_BOT_TOKEN`, `JWT_SECRET` (случайная строка от 32 символов) и `WEB_URL` равный сгенерированному Railway HTTPS домену. В Railway включи Generate Domain. После деплоя URL Web App указывается в BotFather.

Open http://127.0.0.1:5173. Development mode logs in as Alex. The DEMO switcher can change to Max (organizer) or Sam River (admin). API runs on port 3001.

`npm run build` type-checks and builds the web app. `npm test` runs domain tests. `npm run test:e2e` runs Playwright smoke coverage.

## Included

React 19 + TypeScript + Vite frontend; Fastify 5 API; Node 24 built-in SQLite adapter; JWT httpOnly sessions; Zod validation; rate limiting and origin checks; Telegram initData HMAC validation; configurable Elo/leagues; transactional matches and rewards; anti-abuse cooldowns and daily caps; immutable Pingpoint ledger; single-elimination tournaments with secure regeneratable QR invitations and brackets; 100 SVG stickers; weighted server-side pack draws; achievements, notifications, head-to-head, statistics and admin tools.

## Environment

See `.env.example`: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBAPP_URL`, `JWT_SECRET`, `APP_ENV`, `API_URL`, `WEB_URL`, `MOCK_TELEGRAM`.

For production set `APP_ENV=production`, `MOCK_TELEGRAM=false`, a strong 32+ character `JWT_SECRET`, a bot token, and an HTTPS `WEB_URL`. Configure BotFather's Main Mini App URL to `TELEGRAM_WEBAPP_URL`.

При старте автоматически применяются миграции и создаётся каталог без демо-аккаунтов. Render URL определяется автоматически через `RENDER_EXTERNAL_URL`; на другом хостинге укажи `WEB_URL=https://...`. Токен вводи в секретные переменные хостинга. Конфигурация использует платный сервис с постоянным диском; тариф проверь перед созданием. Docker-образ пока не проверен локально: Docker отсутствует.
