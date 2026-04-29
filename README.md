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
- Telegram & WhatsApp bots for conversational post creation (via grammY and Twilio)
- AI providers: OpenAI, Anthropic, OpenRouter (fallback support)
- Redis-backed rate limiting (per-user request throttling)
- JWT authentication with refresh token rotation
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
- `TELEGRAM_VERIFY_WEBHOOK` — Verify Telegram webhook header `X-Telegram-Bot-Api-Secret-Token` (default `false`, set to `true` in production)
- `RATE_LIMIT_CONTENT_WINDOW_SECONDS` — Rate limit window for content generation (default `900` = 15 min)
- `RATE_LIMIT_CONTENT_MAX` — Max content generation requests per window (default `10`)
- `RATE_LIMIT_PUBLISH_WINDOW_SECONDS` — Rate limit window for publishing (default `3600` = 1 hour)
- `RATE_LIMIT_PUBLISH_MAX` — Max publish requests per window (default `20`)
- `TWILIO_ACCOUNT_SID` — Twilio account SID for WhatsApp (optional)
- `TWILIO_AUTH_TOKEN` — Twilio auth token (keep secret)
- `TWILIO_WHATSAPP_FROM` — WhatsApp sender number in format `whatsapp:+1234567890`
- `TWILIO_WEBHOOK_URL` — Webhook base URL for Twilio callbacks (no path)
- `TWILIO_VERIFY_WEBHOOK` — Verify Twilio webhook signatures (default `true`)

Notes:
- `REDIS_HOST` accepts either a host or a full `redis://` URL; the code parses both formats.
- `ENCRYPTION_KEY` must be kept secret and consistent across deployments; rotate with care.
- Rate limiting uses Redis and fails open (allows requests if Redis is unreachable).
- Webhook verification can be disabled locally for testing (`TELEGRAM_VERIFY_WEBHOOK=false`, `TWILIO_VERIFY_WEBHOOK=false`).

See `.env.example` for a template.

## API endpoints (high-level)

Authentication

- `POST /api/auth/register` — register (body: `{ email, password, name }`)
- `POST /api/auth/login` — login (body: `{ email, password }`) returns access + refresh tokens
- `GET /api/auth/me` — returns current user (requires `Authorization: Bearer <token>`)

Content / AI (rate-limited: 10 req/15min per user)

- `POST /api/content/generate` — generate AI content
	- body: `{ idea, post_type, platforms, tone, model }`
	- returns: per-platform preview, warnings (if any)

Publishing (rate-limited: 20 req/hour per user)

- `POST /api/posts/publish` — create a post and enqueue platform jobs
	- body: `{ idea, platforms, platformContents, language, model }`
	- returns: created post, platform posts and initial statuses
- `POST /api/posts/schedule` — schedule a post for future publishing
- `GET /api/posts?page=1&limit=10` — list user's posts (supports filtering by status, platform, date range)
- `GET /api/posts/:id` — returns post and platform statuses
- `POST /api/posts/:id/retry` — retry failed platforms
- `DELETE /api/posts/:id` — cancel a post

Dashboard

- `GET /api/dashboard/stats` — aggregate stats (total posts, success rate, posts per platform)

Bot webhooks

- `POST /api/bot/telegram/webhook/:secret` — Telegram webhook (grammY)
- `POST /webhooks/whatsapp/twilio` — WhatsApp webhook (Twilio)

For complete request/response examples, use the Postman collection (placeholder). I can add the collection file on request.

## Bot Setup

### Telegram Bot

1. Use BotFather to create a bot and copy the `TELEGRAM_BOT_TOKEN`.
2. Choose a `TELEGRAM_WEBHOOK_SECRET` (random string) and set `TELEGRAM_WEBHOOK_URL` to your app base (no path) — e.g. `https://credes-backend-xxxxx.onrender.com`.
3. Set `TELEGRAM_VERIFY_WEBHOOK=false` for local dev; set to `true` in production to require header verification.
4. Add environment variables and deploy; the server will register the webhook automatically on boot.
5. Bot commands: `/start <user_id>`, `/post`, `/status`, `/accounts`, `/help`

Verify webhook (optional):

```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

### WhatsApp Bot (via Twilio)

1. Create a Twilio account and enable WhatsApp integration.
2. Copy `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and get your WhatsApp sender number (format: `whatsapp:+1234567890`).
3. Set `TWILIO_WEBHOOK_URL` to your app base and configure webhook in Twilio console to `https://your-app.com/webhooks/whatsapp/twilio`.
4. Users start with `/start <user_id>` and follow numeric menu selections (1-6, etc.).
5. Same flow as Telegram: post type → platforms → tone → model → idea → preview → confirm.

**Conversations are session-based**:
- Telegram sessions: `telegram_session:{chatId}` (expires 30 min)
- WhatsApp sessions: `whatsapp_session:{phoneNumber}` (expires 30 min)
- Both use Redis and are automatically garbage-collected.

Tips:
- Use the same `userId` returned by the API when linking from Telegram/WhatsApp.
- Rate limiting is per-user; unauthenticated routes are limited by IP.
- Check logs for `Telegram bot initialised` and `WhatsApp bot initialised` on boot.

## Postman collection
Postman collection: [<link-to-postman-collection>](https://lively-station-573091.postman.co/workspace/My-Workspace~6b26c949-1d22-446c-83fd-23b579ea4502/collection/31081743-df12a31e-9a4b-4ebe-aa06-13f70f7d9145?action=share&creator=31081743) (I can export and add this for you if you want).

--- 
### preview of postman collection
For preview `[text](credes_backend.postman_collection.json)
---
## Rate Limiting

Redis-backed per-user rate limiting is applied to:

- `POST /api/content/generate` — 10 requests per 15 minutes
- `POST /api/posts/publish` and `POST /api/posts/schedule` — 20 requests per hour

Unauthenticated routes are limited by IP. If Redis is unreachable, rate limiting fails open (requests are allowed).

## Known issues and limitations

- Redis eviction policy: managed Redis instances may use `allkeys-lru`; BullMQ requires stable storage — prefer `noeviction`.
- AI outputs can be inconsistent; the service applies parsing fallbacks and returns warnings when constraints are violated.
- The system expects OAuth tokens for social platforms; platform publisher adapters are currently simulated or require configuration.
- WhatsApp/Twilio and full OAuth flows (Twitter, LinkedIn) are under development.
- If secrets (e.g., `TELEGRAM_BOT_TOKEN`, `TWILIO_AUTH_TOKEN`) were exposed in repo history, rotate them immediately.
- Webhook signature verification should be enabled in production (`TELEGRAM_VERIFY_WEBHOOK=true`, `TWILIO_VERIFY_WEBHOOK=true`).

For more architectural notes, see `ARCHITECTURE.md` and `AI_USAGE.md`.


---
For development notes and architecture, see `ARCHITECTURE.md` and `AI_USAGE.md`.
