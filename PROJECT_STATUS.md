# Project Status

**Update this file when a phase is started or completed.** Coding agents must read this before implementing features.

---

## Current phase: **Phase 3 — Agent v1**

**Phase 0 completed:** 2026-08-20  
**Phase 1 completed:** 2026-08-20  
**Phase 2 completed:** 2026-08-20  
**Phase 3 started:** 2026-08-20  
**Target:** Background agent runs, stream to timeline, repo read tools (no redirect/approvals)

---

## Phase 3 exit criteria

- [ ] User starts run from session room
- [ ] All participants see streaming agent output
- [ ] Agent reads/searches public GitHub repo
- [ ] Tool calls visible on timeline
- [ ] Run completes with clear status

---

## Phase progress

| Phase | Name | Status |
|---|---|---|
| 0 | Setup & learning | **complete** |
| 1 | Foundation (auth, workspace, session CRUD) | **complete** |
| 2 | Multiplayer shell (WebSocket, timeline) | **complete** |
| 3 | Agent v1 (queue, tools, streaming) | **in progress** |
| 4 | Collaboration MVP (redirect, diff, approval, handoff) | not started |
| 5 | Engineering depth (private repos, sandbox, PR) | not started |
| 6 | Second wedge (support or sales) | not started |
| 7 | Platform generalization | not started |
| 8 | Production SaaS | not started |

---

## What to build in current phase only

### Phase 3 (now)

- BullMQ worker + `agent_runs` (queued → running → stopped/completed/failed)
- Start/stop run API from session room
- Stream agent tokens + tool events to timeline via WebSocket
- Context paste (`session_context` / logs)
- Read-only tools: `read_file`, `search_repo` (public GitHub)
- Run limits (max steps / duration)

### Do NOT build yet

- Redirect, artifacts, approvals, handoff, status machine (Phase 4)
- GitHub App / private repos / sandbox (Phase 5)

---

## Phase 2 completion record

All exit criteria met on 2026-08-20 (verified via `apps/web/scripts/verify-phase2.mts` — two WS clients):

- [x] Two browser sessions join the same session room
- [x] Messages appear for all participants within ~2 seconds
- [x] Page refresh restores full timeline (events API returns latest N, chronological)
- [x] Viewer cannot send messages (403 / disabled UI)
- [x] Presence list updates on join/leave

Also shipped: WebSocket gateway + Redis pub/sub, `session_events` append-only log, share link, roles `viewer` | `contributor` | `owner`.

---

## Phase 1 completion record

All exit criteria met on 2026-08-20:

- [x] User can sign in and create a workspace
- [x] User can create and list sessions
- [x] Session data persists across refresh
- [x] Basic role on workspace: admin | member

Also shipped: add workspace members by email (admin-only); session PATCH + detail/room page.

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
