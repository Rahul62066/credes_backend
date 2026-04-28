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

