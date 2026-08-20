# DomChat — Agent Instructions

Instructions for AI coding agents working in this repository.

## First steps (every session)

1. Read [PROJECT_STATUS.md](./PROJECT_STATUS.md) — know the **current phase**
2. Read [docs/implementation-phases.md](./docs/implementation-phases.md) — know **exit criteria** for that phase
3. Apply skill: **domchat-phases** (`.cursor/skills/domchat-phases/SKILL.md`)
4. Only implement features allowed for the current phase

## Product summary

DomChat is a **multiplayer AI agent workspace**. Teams share live agent sessions to investigate problems, redirect agents, approve outputs, and hand off ownership — starting with an **engineering incident room** MVP.

## Phased development (strict order)

```text
Phase 0 → 1 → 2 → 3 → 4 (first ship) → 5 → 6 → 7 → 8
```

**Do not skip Phase 2–4.** Do not build later-phase features early.

| Phase | Build | Do not build |
|---|---|---|
| 0 | Docker, Next.js spike, streaming LLM | Auth, WebSocket, agent queue |
| 1 | Auth, workspace, incident CRUD | Realtime, agent runs |
| 2 | WebSocket room, presence, timeline | Agent orchestration |
| 3 | BullMQ, agent runs, repo read tools | Approvals, diff artifacts |
| 4 | Redirect, artifacts, approval, handoff | GitHub App, sandbox, billing |
| 5+ | See implementation-phases.md | — |

## Stack (do not change without user approval)

- **Frontend:** Next.js 14+ App Router, TypeScript, Tailwind
- **DB:** PostgreSQL + Prisma
- **Cache/queue:** Redis; BullMQ from Phase 3
- **Realtime:** WebSockets from Phase 2
- **LLM:** OpenRouter or OpenAI

## Code conventions

- Minimize scope — only build what the current phase requires
- Match existing patterns in the repo
- Append-only event log for timeline (Phase 2+)
- Human-in-the-loop for risky actions (Phase 4+)
- No auto-merge or auto-deploy without approval gates
- Secrets in `.env` only — never commit API keys
- UI feedback on every feature: toast (success/error), button loaders on mutations, skeleton loaders on data fetch — see skill `domchat-phases`

## File layout

```text
apps/web/           # Next.js application
docs/               # Product specs (source of truth)
.cursor/rules/      # Always-on guardrails
.cursor/skills/     # Phase workflow skills
PROJECT_STATUS.md   # Current phase tracker (update when advancing)
```

## Before marking a phase complete

1. Verify all exit criteria in PROJECT_STATUS.md
2. Update PROJECT_STATUS.md phase status
3. Do not start next phase features in the same PR unless user asks

## Detailed specs

- Phase 4 MVP: [docs/mvp-engineering-incident.md](./docs/mvp-engineering-incident.md)
- Use cases: [docs/use-cases.md](./docs/use-cases.md)
- Architecture concepts: [docs/multiplayer-agent-solution.md](./docs/multiplayer-agent-solution.md)
