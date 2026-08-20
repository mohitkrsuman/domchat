# Project Status

**Update this file when a phase is started or completed.** Coding agents must read this before implementing features.

---

## Current phase: **Phase 2 — Multiplayer shell**

**Phase 0 completed:** 2026-08-20  
**Phase 1 completed:** 2026-08-20  
**Phase 2 started:** 2026-08-20  
**Target:** Live session room, presence, human chat, persisted timeline (no agent)

---

## Phase 2 exit criteria

- [ ] Two browser sessions join the same session room
- [ ] Messages appear for all participants within ~2 seconds
- [ ] Page refresh restores full timeline
- [ ] Viewer cannot send messages (403 / disabled UI)
- [ ] Presence list updates on join/leave

### Implemented (code ready — verify in two browsers)

- Workspace members API + UI (admin adds by email, roles `admin` | `member`)
- Session GET/PATCH + `/sessions/[id]` room (metadata, share link, timeline)
- `session_participants` (`viewer` | `contributor` | `owner`) and append-only `session_events`
- REST: join, messages, events, participant role
- WebSocket server + Redis pub/sub (`npm run dev:all` or `npm run dev:realtime`)
- Presence panel, composer (viewers blocked), timeline replay

---

## Phase progress

| Phase | Name | Status |
|---|---|---|
| 0 | Setup & learning | **complete** |
| 1 | Foundation (auth, workspace, session CRUD) | **complete** |
| 2 | Multiplayer shell (WebSocket, timeline) | **in progress** |
| 3 | Agent v1 (queue, tools, streaming) | not started |
| 4 | Collaboration MVP (redirect, diff, approval, handoff) | not started |
| 5 | Engineering depth (private repos, sandbox, PR) | not started |
| 6 | Second wedge (support or sales) | not started |
| 7 | Platform generalization | not started |
| 8 | Production SaaS | not started |

---

## What to build in current phase only

### Phase 2 (now)

- Session room at `/sessions/:id`
- WebSocket gateway + Redis pub/sub (`session:{id}`)
- Presence, human messages, append-only event log, timeline replay
- Share link; session roles viewer / contributor / owner

### Do NOT build yet

- Agent runs / BullMQ (Phase 3)
- Redirect, artifacts, approvals, handoff, status machine (Phase 4)

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
