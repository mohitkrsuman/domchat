# DomChat

Multiplayer AI agent workspace — shared live sessions where teams investigate, redirect, and hand off agent work together.

**Current phase:** Phase 2 — Multiplayer shell  
**Status tracker:** [PROJECT_STATUS.md](./PROJECT_STATUS.md)

## Docs

| Document | Purpose |
|---|---|
| [docs/multiplayer-agent-solution.md](./docs/multiplayer-agent-solution.md) | Vision, prerequisites, concepts |
| [docs/use-cases.md](./docs/use-cases.md) | Eight practical use cases |
| [docs/mvp-engineering-incident.md](./docs/mvp-engineering-incident.md) | Phase 4 MVP spec |
| [docs/implementation-phases.md](./docs/implementation-phases.md) | Phase 0–8 roadmap |

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres + Redis)
- Git
- LLM API key (OpenRouter or OpenAI)

## Quick start

### 1. Clone and install

```bash
cd domchat
cp .env.example .env
# Edit .env — add OPENROUTER_API_KEY or OPENAI_API_KEY
```

### 2. Start infrastructure

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
docker compose up -d
docker compose ps   # postgres + redis should be healthy
```

If Docker is not installed, skip this step for now — the app still runs; health check will show `degraded`.

### 3. Run the app

```bash
cd apps/web
npm install
npm run db:push      # first time / after schema changes
cp .env.example .env.local   # add Supabase keys + REDIS_URL
npm run dev:all      # Next.js + realtime WebSocket server
```

`dev:all` starts the Next.js app and the realtime server (`ws://localhost:4001`). You can also run them separately: `npm run dev` and `npm run dev:realtime`.

Open the app URL from your terminal (often [http://localhost:3000](http://localhost:3000) or `:4000`).

**Phase 2 flow:** Sign up → create workspace → add a teammate by email → New session → open the room in two browsers → chat live → refresh restores the timeline.

**Supabase tip:** For local testing, in Supabase Dashboard → Authentication → Providers → Email, you can disable “Confirm email” so sign-up creates a session immediately.

### 4. Verify Phase 0 exit criteria

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) checklist.

## Project structure

```text
domchat/
├── apps/web/              # Next.js app
├── docs/                  # Product + architecture docs
├── .cursor/
│   ├── rules/             # Agent rules (always-on guardrails)
│   └── skills/            # Phase-aware agent skills
├── docker-compose.yml     # Postgres + Redis
├── AGENTS.md              # Instructions for coding agents
└── PROJECT_STATUS.md      # Current phase + exit criteria
```

## For coding agents

Read [AGENTS.md](./AGENTS.md) before making changes. Agents must follow the phased roadmap — do not skip ahead.

Setup details: [docs/agent-setup.md](./docs/agent-setup.md)

## Stack (decided)

| Layer | Choice |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind |
| Database | PostgreSQL + Prisma |
| Cache / queue | Redis (+ BullMQ in Phase 3) |
| Realtime | WebSockets (Phase 2) |
| LLM | OpenRouter or OpenAI |
