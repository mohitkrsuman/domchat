# Project Status

**Update this file when a phase is started or completed.** Coding agents must read this before implementing features.

---

## Current phase: **Phase 1 — Foundation**

**Phase 0 completed:** 2026-08-20  
**Phase 1 started:** 2026-08-20  
**Target:** Auth, workspace, incident CRUD (no agent, no realtime)

---

## Phase 1 exit criteria

- [ ] User can sign in and create a workspace
- [ ] User can create and list incidents
- [ ] Incident data persists across refresh
- [ ] Basic role on workspace: admin | member

---

## Phase progress

| Phase | Name | Status |
|---|---|---|
| 0 | Setup & learning | **complete** |
| 1 | Foundation (auth, workspace, incident CRUD) | **in progress** |
| 2 | Multiplayer shell (WebSocket, timeline) | not started |
| 3 | Agent v1 (queue, tools, streaming) | not started |
| 4 | Collaboration MVP (redirect, diff, approval, handoff) | not started |
| 5 | Engineering depth (private repos, sandbox, PR) | not started |
| 6 | Second wedge (support or sales) | not started |
| 7 | Platform generalization | not started |
| 8 | Production SaaS | not started |

---

## What to build in current phase only

### Phase 1 (now)

- Prisma + Postgres schema: `users`, `workspaces`, `workspace_members`, `incidents`
- Auth (sign up / sign in)
- Workspace creation
- Incident CRUD API (`/api/v1/incidents`)
- UI: incident list page, create incident form

### Do NOT build yet

- WebSockets / presence (Phase 2)
- Agent runs / BullMQ (Phase 3)
- Incident room / timeline / approvals (Phase 4)

---

## Phase 0 completion record

All exit criteria met on 2026-08-20:

- [x] Next.js app scaffolded and builds
- [x] Agent skills and rules created
- [x] Docker: Postgres and Redis running locally
- [x] `.env` configured with LLM key
- [x] App runs (`npm run dev`)
- [x] LLM streaming works in browser
- [x] Core concepts understood: session, event, run, artifact, redirect, handoff

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
