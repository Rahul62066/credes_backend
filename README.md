# Postly — Social Content Backend

> Production-ready backend for generating and publishing social content using AI, with Telegram bot integration.

Live API: https://credes-backend-1g52.onrender.com
## Quick clone

```bash
git clone https://github.com/Rahul62066/credes_backend.git
cd credes_backend
```

## Project overview

- Express + TypeScript API
- Prisma (Postgres) for persistence
- BullMQ + Redis for background publishing jobs
- Telegram bot for conversational post creation
- AI providers: OpenAI, Anthropic, OpenRouter (fallback support)
## Project Workflow

![alt text](BotArchitecture.png)

## Local setup

Prerequisites: Docker (for local DB/Redis) or running Postgres + Redis instances.

1. Clone and install dependencies

```bash
git clone https://github.com/Rahul62066/credes_backend.git
cd credes_backend
npm ci
```

2. Create environment file

Create a copy of `.env.example` called `.env` and fill values.

3. Generate Prisma client and build

```bash
npx prisma generate
npm run build
```

4. Start local services with Docker Compose (recommended)

```bash
docker-compose up --build
```

The app will be available at `http://localhost:5000` by default.

## Docker Compose

This repo includes `docker-compose.yml` for local development. It starts Postgres, Redis and the app. To use:

```bash
docker-compose up --build
```

## Environment variables

All environment variables (describe and example values). Copy these into `.env` or set them in your deployment platform.

- `NODE_ENV` — `development` or `production` (set to `production` on Render)
- `PORT` — HTTP port (default `5000`)
- `DATABASE_URL` — Postgres connection string. Example: `postgresql://user:pass@host:5432/dbname?schema=public`
- `REDIS_HOST` — Redis hostname or full URL (supports `redis://host:port`). Example: `redis://red-xxxx:6379` or `localhost`
- `REDIS_PORT` — Redis port (if using `REDIS_HOST` without URL). Example: `6379`
- `REDIS_PASSWORD` — Redis password if required
- `JWT_ACCESS_SECRET` — JWT signing secret for access tokens (min recommended length 32)
- `JWT_REFRESH_SECRET` — JWT signing secret for refresh tokens (min recommended length 32)
- `ACCESS_TOKEN_EXPIRES_IN` — e.g. `15m`
- `REFRESH_TOKEN_EXPIRES_IN` — e.g. `7d`
- `ENCRYPTION_KEY` — 32-byte hex string used to encrypt user secrets (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `OPENAI_API_KEY` — optional global OpenAI key
- `ANTHROPIC_API_KEY` — optional global Anthropic key
- `OPENROUTER_API_KEY` — optional global OpenRouter key
- `TWITTER_API_BASE_URL` — API base for Twitter/X (default `https://api.twitter.com`)
- `LINKEDIN_API_BASE_URL` — API base for LinkedIn (default `https://api.linkedin.com`)
- `BULL_QUEUE_PREFIX` — BullMQ prefix (default `postly`)
- `TELEGRAM_BOT_TOKEN` — Bot token from BotFather (keep secret)
- `TELEGRAM_WEBHOOK_URL` — Public base URL for webhook (no path). Example: `https://your-app.onrender.com`
- `TELEGRAM_WEBHOOK_SECRET` — Secret path segment for webhook route (random string)
- `CORS_ORIGIN` — Allowed origin for browser clients (default `http://localhost:3000`)

Notes:
- `REDIS_HOST` accepts either a host or a full `redis://` URL; the code parses both formats.
- `ENCRYPTION_KEY` must be kept secret and consistent across deployments; rotate with care.

See `.env.example` for a template.

## API endpoints (high-level)

Authentication

- `POST /api/auth/register` — register (body: `{ email, password, name }`)
- `POST /api/auth/login` — login (body: `{ email, password }`) returns access + refresh tokens
- `GET /api/auth/me` — returns current user (requires `Authorization: Bearer <token>`)

Content / AI

- `POST /api/content/generate` — generate AI content
	- body: `{ idea, post_type, platforms, tone, model }`
	- returns: per-platform preview, warnings (if any)

Publishing

- `POST /api/posts/publish` — create a post and enqueue platform jobs
	- body: `{ idea, platforms, platformContents, language, model }`
	- returns: created post, platform posts and initial statuses
- `GET /api/posts/:id` — returns post and platform statuses

Bot webhook

- `POST /api/bot/telegram/webhook/:secret` — Telegram webhook (used by grammY webhookCallback)

For complete request/response examples, use the Postman collection (placeholder). I can add the collection file on request.

## Telegram bot setup

1. Use BotFather to create a bot and copy the `TELEGRAM_BOT_TOKEN`.
2. Choose a `TELEGRAM_WEBHOOK_SECRET` (random string) and set `TELEGRAM_WEBHOOK_URL` to your app base (no path) — e.g. `https://credes-backend-xxxxx.onrender.com`.
3. Add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`, and `TELEGRAM_WEBHOOK_SECRET` to your deployment env.
4. Deploy the app; during bootstrap the server will call `setWebhook` automatically and the route will be available at `/api/bot/telegram/webhook/:secret`.

Verify webhook (optional):

```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Bot quick test flow:

- `/start <user_id>` — link chat to a user id returned from the API
- `/post` — start multi-step flow (type → platforms → tone → model → idea → preview → confirm)

Tips:
- Use the same `userId` returned by the API when linking from Telegram.
- If the bot doesn't respond, check Render logs for `Telegram webhook configured` and `Telegram bot initialised`.

## Postman collection

Postman collection: <link-to-postman-collection> (I can export and add this for you if you want).

---
## Known issues and limitations

- Redis eviction policy: managed Redis instances may use `allkeys-lru`; BullMQ requires stable storage — prefer `noeviction`.
- AI outputs can be inconsistent; the service applies parsing fallbacks and returns warnings when constraints are violated.
- The system expects OAuth tokens for social platforms; platform publisher adapters are currently simulated or require configuration.
- If secrets (e.g., `TELEGRAM_BOT_TOKEN`) were exposed in repo history, rotate them immediately.

For more architectural notes, see `ARCHITECTURE.md` and `AI_USAGE.md`.


---
For development notes and architecture, see `ARCHITECTURE.md` and `AI_USAGE.md`.
