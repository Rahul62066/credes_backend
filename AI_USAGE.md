# AI Usage and Prompts

This repository was built with AI assistance for scaffolding, debugging, documentation, and prompt refinement. The codebase was still reviewed, validated, and adjusted manually after each significant AI-generated suggestion.

## AI tools used

- GitHub Copilot for code assistance inside the editor
- ChatGPT-style prompting for architecture, debugging, and documentation drafting
- Antigravity prompt workflow for staged implementation planning

## Where AI assistance was used

AI was used for:

- project scaffolding and folder-structure planning
- Prisma schema drafting
- auth flow design and refresh-token strategy
- content-generation prompt design
- queue and worker flow design
- Telegram bot conversation flow drafting
- README and architecture documentation

AI was not treated as the source of truth. Every major change was checked against the actual implementation, tests, and deployment behavior.

## Prompts used

The project was developed using a staged prompt sequence. The main prompt asked for a production-ready Node.js TypeScript backend called Postly using:

- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- JWT auth
- bcrypt
- Zod validation
- Jest + Supertest
- Docker and docker-compose

The prompt sequence was split into implementation steps:

1. Base project setup, Docker, Prisma connection, health route, and modular structure.
2. Prisma schema design for users, refresh tokens, social accounts, AI keys, posts, and platform posts.
3. Auth system with register, login, refresh, logout, and me endpoints.
4. User profile, social accounts, and encrypted AI key handling.
5. AI content generation with OpenAI and Anthropic.
6. BullMQ publishing queue with one job per platform.
7. Platform publisher abstraction with platform-specific TODO-safe implementations.
8. Telegram bot conversational publishing flow using grammY.
9. Dashboard stats and post-history APIs.
10. Jest and Supertest integration testing.
11. Production documentation for README, architecture, and AI usage.

## Prompting strategy

- Prompts asked for layered architecture: routes → controller → service → repository.
- System prompts for content generation included strict JSON output requirements and platform-specific limits.
- AI responses were treated as structured suggestions, not final truth.
- When the model output was unstable, the service added parsing fallbacks and validation warnings.

### Example content-generation prompt pattern

```text
Return JSON only.
Generate platform-specific content for the requested platforms.
Respect character limits and hashtag guidance.
If a platform cannot be fully satisfied, still return valid JSON and keep the output usable.
```

## Manual review and validation

I manually reviewed and validated the following after AI assistance:

- Prisma schema relations, indexes, and cascade-delete behavior
- auth token rotation and refresh-token hashing
- Telegram webhook route and conversation-state handling
- BullMQ job payload shape and retry/backoff behavior
- AI content parsing and constraint validation
- Render deployment configuration and environment variables
- documentation consistency with the actual codebase

Validation included:

- TypeScript compile checks
- integration-test coverage where available
- runtime log review on Render
- Telegram command flow testing
- queue/job behavior verification

## What changed after AI suggestions

The following changes were made after reviewing AI-generated drafts:

- relaxed content schema validation to allow partial platform responses
- added robust JSON extraction from model responses wrapped in prose or code fences
- converted some hard validation failures into warnings so content generation remains usable
- improved prompt examples to reduce malformed AI output
- added OpenRouter support without removing OpenAI or Anthropic
- changed BullMQ job IDs to avoid invalid characters
- corrected Redis URL parsing for Render deployments
- fixed Prisma deploy packaging so `prisma.config.ts` is available at runtime

## What was manually owned

The following areas were intentionally owned and verified by hand:

- repository structure and naming conventions
- database and queue data model
- security-sensitive settings such as secrets, JWT, and encryption keys
- production deployment values on Render
- the final wording of README, architecture, and AI usage documentation

## Notes

- Prompts live in `src/modules/content/content.prompts.ts`.
- AI output is logged and reviewed when users report failures.
- The final repository should remain explainable by a human reviewer, not just by the prompt history.

## Phase 2: Production Features (April 2026)

Following the initial MVP, the following features were implemented to enhance production readiness:

### Rate Limiting

**Feature**: Redis-backed per-user request throttling for high-cost operations.

**Implementation**:
- Content generation: 10 requests per 15 minutes per user
- Publishing (publish + schedule): 20 requests per hour per user
- Unauthenticated routes: per-IP fallback
- Middleware applies after auth to ensure consistent error envelopes
- Fails open if Redis is unreachable (intentional availability trade-off)

**Files**:
- `src/middlewares/rateLimiter.ts` — Redis-backed limiter factory
- Applied to: `POST /api/content/generate`, `POST /api/posts/publish`, `POST /api/posts/schedule`
- Configuration via `.env` variables with sensible defaults

### Telegram Webhook Header Verification

**Feature**: Optional per-request header verification to strengthen webhook security.

**Implementation**:
- Path-based secret validation (existing)
- Optional header check: `X-Telegram-Bot-Api-Secret-Token` (new)
- Gated by environment flag `TELEGRAM_VERIFY_WEBHOOK` (default `false` for dev, `true` for prod)

**Files**:
- Updated: `src/modules/bot/bot.controller.ts`
- Configuration: `TELEGRAM_VERIFY_WEBHOOK` in `.env`

### WhatsApp/Twilio Bot Module

**Feature**: WhatsApp conversational bot using Twilio webhooks, mirroring Telegram UX/flow.

**Implementation**:
- Same multi-step flow as Telegram: post type → platforms → tone → model → idea → preview → confirm/edit
- Redis sessions: `whatsapp_session:{phoneNumber}` with 30-minute TTL
- Numeric menu selections (more SMS-natural than button clicks)
- Reuses existing `contentService` and `postsService` (no logic duplication)
- Twilio webhook signature validation (configurable via `TWILIO_VERIFY_WEBHOOK`)

**Files**:
- `src/modules/whatsapp/whatsapp.validation.ts` — Zod schemas + types
- `src/modules/whatsapp/whatsapp.service.ts` — Session + flow logic
- `src/modules/whatsapp/whatsapp.controller.ts` — Webhook handler
- `src/modules/whatsapp/whatsapp.routes.ts` — Route: `POST /webhooks/whatsapp/twilio`
- Updated: `package.json` (added `twilio` dependency)
- Updated: `src/server.ts`, `src/app.ts` (initialization + routing)

**Configuration**:
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `TWILIO_WEBHOOK_URL`, `TWILIO_VERIFY_WEBHOOK`

### Tests

Added integration tests for new features:
- `src/__tests__/rateLimiter.test.ts` — Tests Redis counter, key expiry, per-user tracking
- `src/__tests__/botWebhookVerification.test.ts` — Tests path-secret + optional header verification

### Documentation Updates

- **README.md**: Added rate limiting section, WhatsApp bot setup, environment variable docs
- **ARCHITECTURE.md**: Added sections on rate limiting, webhook verification, multi-bot architecture, new trade-offs
- **AI_USAGE.md**: This section documenting Phase 2 implementation

## Remaining Features (To Do)

Features designed but not yet implemented:
1. **Full OAuth for Twitter/X and LinkedIn** — Callback handlers, state parameter validation, token encryption
2. **Cron Dispatcher** — Scheduled post publishing via node-cron
3. **Post Analytics API** — Fetch engagement metrics from platforms
4. **Language Detection** — Auto-detect idea language using franc or similar
5. **Soft Delete + Restore** — Logical deletion for posts, restore endpoint

