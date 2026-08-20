# Project Status

**Update this file when a phase is started or completed.** Coding agents must read this before implementing features.

---

## Current phase: **Phase 0 — Setup & Learning**

**Started:** 2026-08-20  
**Target:** Dev stack running + Phase 0 spike complete

---

## Phase 0 exit criteria

- [x] Next.js app scaffolded and builds (`cd apps/web && npm run build`)
- [x] Agent skills and rules created (`.cursor/skills/domchat-phases`, `.cursor/rules/`)
- [ ] Docker: Postgres and Redis running locally (`docker compose ps` healthy) — **requires Docker Desktop**
- [ ] `.env` configured: copy `apps/web/.env.example` → `apps/web/.env.local` and add LLM key
- [ ] App runs (`cd apps/web && npm run dev`)
- [ ] LLM streaming works in browser at http://localhost:3000
- [ ] Core concepts understood: session, event, run, artifact, redirect, handoff

---

## Phase progress

| Phase | Name | Status |
|---|---|---|
| 0 | Setup & learning | **in progress** |
| 1 | Foundation (auth, workspace, incident CRUD) | not started |
| 2 | Multiplayer shell (WebSocket, timeline) | not started |
| 3 | Agent v1 (queue, tools, streaming) | not started |
| 4 | Collaboration MVP (redirect, diff, approval, handoff) | not started |
| 5 | Engineering depth (private repos, sandbox, PR) | not started |
| 6 | Second wedge (support or sales) | not started |
| 7 | Platform generalization | not started |
| 8 | Production SaaS | not started |

---

## What to build in current phase only

### Phase 0 (now)

- Docker Compose for Postgres + Redis
- Next.js spike app with health check
- Streaming LLM API route (`/api/spike/stream`)
- Project docs, agent skills, and rules

### Do NOT build yet

- Auth / workspaces (Phase 1)
- WebSockets / presence (Phase 2)
- Agent runs / BullMQ (Phase 3)
- Incidents room / approvals (Phase 4)

---

## When advancing a phase

1. All exit criteria for current phase checked off above
2. Update **Current phase** header
3. Update phase row status to `complete` / `in progress`
4. Add new exit criteria from [docs/implementation-phases.md](./docs/implementation-phases.md)

---

## Key references

- Roadmap: [docs/implementation-phases.md](./docs/implementation-phases.md)
- Phase 4 spec: [docs/mvp-engineering-incident.md](./docs/mvp-engineering-incident.md)
- Agent instructions: [AGENTS.md](./AGENTS.md)
