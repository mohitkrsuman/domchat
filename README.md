# DoomChat

Multiplayer AI agent workspace — shared live sessions where teams investigate, redirect, and hand off agent work together.

**Current phase:** Phase 3 — Agent v1  
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
npm run dev          # Next.js (:3000) + realtime WebSocket (:4001)
```

`npm run dev` starts **Next.js**, the realtime server (`ws://localhost:4001`), and the **agent worker**. Use `npm run dev:web` if you only want Next.js.

Open [http://localhost:3000](http://localhost:3000).

**Phase 3 flow:** Sign up → create workspace → New session (set a public GitHub repo URL) → open the room → paste logs via **Add context** → **Start agent**. Teammates see streaming output and tool calls live.

In the session room, Participants should show **Live** (not Offline). If it says Offline, the realtime process is not running. If Start agent never leaves “queued”, the worker process is not running.

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
| Cache / queue | Redis + BullMQ |
| Realtime | WebSockets (Phase 2) |
| LLM | OpenRouter or OpenAI |
