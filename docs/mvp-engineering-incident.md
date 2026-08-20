# MVP Specification: Engineering Incident Room

DomChat MVP focused on **shared production incident response** — the first wedge from [use-cases.md](./use-cases.md).

**Goal:** Let an engineering team open one live incident room, investigate a production failure with a shared AI agent, redirect it in real time, review proposed fixes, and hand off cleanly — with a full audit timeline.

**Not in MVP:** Sales CRM, support tickets, legal workflows, multi-region HA, full Cursor/IDE integration.

---

## 1. MVP Scope

### In scope

- Workspace + user auth
- Create/join incident session by URL
- Live presence (who is in the room)
- Connect one GitHub repo per session
- Paste or attach error logs / Sentry snippet (manual v1)
- Shared prompt + streaming agent responses
- Agent investigation loop with read-only repo tools (v1)
- Live event timeline (persisted + replayable)
- Stop / redirect agent mid-run
- Handoff session ownership
- One approval gate: **approve proposed diff before marking “ready for PR”**
- Artifacts: root cause summary, diff preview, postmortem draft
- Roles: viewer, contributor, owner

### Out of scope (post-MVP)

- Auto-merge or auto-deploy
- Full Sentry/GitHub OAuth integrations (use manual paste + repo URL in v1)
- Docker sandbox code execution (phase 2)
- Slack/email notifications
- Mobile app
- Billing
- SSO / SAML

---

## 2. Personas

| Persona | Role in incident | Typical actions |
|---|---|---|
| **On-call engineer** | Opens session, drives investigation | Start run, paste logs, redirect agent, propose fix |
| **Backend lead** | Senior guidance | Join live, redirect focus, review diff |
| **Reviewer** | Code review / merge prep | Take handoff, approve diff artifact |
| **PM (optional)** | Visibility | View timeline, read summary (viewer) |

---

## 3. User Stories

### Session lifecycle

| ID | Story | Acceptance criteria |
|---|---|---|
| US-1 | As on-call, I create an incident session so my team has one shared room | Session has title, severity, repo URL, unique share link |
| US-2 | As a teammate, I join via link and see who is present | Presence updates within 2s; role shown |
| US-3 | As owner, I hand off ownership to another member | New owner can redirect agent; event logged |

### Investigation

| ID | Story | Acceptance criteria |
|---|---|---|
| US-4 | As contributor, I paste logs and ask the agent to investigate | Logs stored as session context; agent run starts |
| US-5 | As any member, I see agent actions stream live | Tool calls and messages appear in timeline for all clients |
| US-6 | As contributor, I redirect the agent without restarting | New instruction cancels or steers current run; visible in timeline |

### Fix and approval

| ID | Story | Acceptance criteria |
|---|---|---|
| US-7 | As agent, I propose a code diff based on repo context | Diff saved as artifact; not applied to repo in MVP |
| US-8 | As reviewer, I approve the diff artifact | Approval recorded; session status can move to `ready_for_pr` |
| US-9 | As any member, I export root cause + postmortem draft | Artifacts downloadable or copyable from session |

### Safety

| ID | Story | Acceptance criteria |
|---|---|---|
| US-10 | As viewer, I cannot redirect or approve | UI disabled; API returns 403 |
| US-11 | As any member, I replay the full incident timeline | Events load in order after refresh |

---

## 4. Primary User Flow

```text
1. On-call creates session "prod-payment-500-error"
2. Sets repo URL + pastes Sentry stack trace
3. Clicks "Start investigation"
4. Agent streams: reading files → checking recent paths → hypothesis
5. Backend lead joins → redirects: "Check stripe/webhook.ts from last deploy"
6. Agent updates analysis → proposes patch diff
7. On-call reviews diff in artifact panel
8. Reviewer joins → approves diff artifact
9. On-call hands off to reviewer for PR creation (manual outside DomChat in v1)
10. Session marked resolved; timeline + artifacts archived
```

---

## 5. Screens

### 5.1 Auth + workspace

- Sign up / sign in
- Create workspace (team name)
- Invite member by email (optional v1: manual user IDs)

### 5.2 Incident list (`/incidents`)

- Table: title, severity, status, owner, last activity, participants count
- CTA: **New incident**

### 5.3 Create incident (`/incidents/new`)

Fields:
- Title (required) — e.g. `prod-payment-500-error`
- Severity — `sev1` | `sev2` | `sev3`
- Repo URL (required) — GitHub public or accessible repo
- Initial context (optional) — logs, error message, deploy note
- First prompt (optional) — default: "Investigate this production error and propose a fix."

### 5.4 Incident room (`/incidents/:id`) — core screen

Layout (three columns on desktop):

```text
┌─────────────────────────────────────────────────────────────────┐
│ Header: title | severity badge | status | owner | Share link    │
├──────────────┬──────────────────────────────┬───────────────────┤
│ Participants │ Timeline (center)            │ Artifacts         │
│ + presence   │ - human messages             │ - root cause      │
│              │ - agent stream               │ - diff preview    │
│              │ - tool events                │ - postmortem      │
│              │ - redirects                  │                   │
│              │ - approvals                  │                   │
├──────────────┴──────────────────────────────┴───────────────────┤
│ Composer: message input | [Stop] [Redirect] [Start run]         │
└─────────────────────────────────────────────────────────────────┘
```

**Header actions:**
- Copy invite link
- Hand off ownership
- Mark resolved

**Composer:**
- Send message to agent (contributor+)
- Stop current run (contributor+)
- Redirect with new instruction (contributor+)

### 5.5 Artifact detail (drawer or panel)

- Diff viewer (unified diff text)
- Approve / reject buttons (reviewer or owner)
- Root cause markdown
- Postmortem template filled by agent

---

## 6. Session States

```text
open → investigating → fix_proposed → ready_for_pr → resolved
                  ↘ blocked (optional)
```

| Status | Meaning |
|---|---|
| `open` | Session created, no active run |
| `investigating` | Agent run in progress |
| `fix_proposed` | Diff artifact created, awaiting review |
| `ready_for_pr` | Diff approved |
| `resolved` | Incident closed |
| `blocked` | Waiting on external input |

---

## 7. Roles & Permissions

| Action | Viewer | Contributor | Owner |
|---|---|---|---|
| View timeline | yes | yes | yes |
| Send message | no | yes | yes |
| Start/stop/redirect run | no | yes | yes |
| Approve diff | no | yes* | yes |
| Hand off ownership | no | no | yes |
| Mark resolved | no | no | yes |
| Edit session metadata | no | no | yes |

*Optional policy: only owner can approve in v1 — configure as owner-only if simpler.

---

## 8. Data Model

### Tables

```sql
-- workspaces
workspaces (
  id            uuid PK,
  name          text NOT NULL,
  created_at    timestamptz
)

-- users (app users)
users (
  id            uuid PK,
  email         text UNIQUE NOT NULL,
  name          text,
  created_at    timestamptz
)

workspace_members (
  workspace_id  uuid FK → workspaces,
  user_id       uuid FK → users,
  role          text, -- admin | member
  PRIMARY KEY (workspace_id, user_id)
)

-- incident sessions
incidents (
  id            uuid PK,
  workspace_id  uuid FK → workspaces,
  title         text NOT NULL,
  severity      text NOT NULL, -- sev1 | sev2 | sev3
  status        text NOT NULL,
  repo_url      text NOT NULL,
  owner_id      uuid FK → users,
  created_by    uuid FK → users,
  created_at    timestamptz,
  updated_at    timestamptz,
  resolved_at   timestamptz
)

incident_participants (
  incident_id   uuid FK → incidents,
  user_id       uuid FK → users,
  role          text NOT NULL, -- viewer | contributor | owner
  joined_at     timestamptz,
  PRIMARY KEY (incident_id, user_id)
)

-- append-only event log
incident_events (
  id            uuid PK,
  incident_id   uuid FK → incidents,
  type          text NOT NULL,
  actor_id      uuid NULL, -- null = system/agent
  payload       jsonb NOT NULL,
  created_at    timestamptz
)

-- agent runs
agent_runs (
  id            uuid PK,
  incident_id   uuid FK → incidents,
  status        text NOT NULL, -- queued | running | stopped | completed | failed
  requested_by  uuid FK → users,
  prompt        text,
  started_at    timestamptz,
  ended_at      timestamptz
)

-- context attachments (logs, notes)
incident_context (
  id            uuid PK,
  incident_id   uuid FK → incidents,
  kind          text NOT NULL, -- log | note | error_snippet
  content       text NOT NULL,
  created_by    uuid FK → users,
  created_at    timestamptz
)

-- artifacts
artifacts (
  id            uuid PK,
  incident_id   uuid FK → incidents,
  run_id        uuid FK → agent_runs NULL,
  type          text NOT NULL, -- root_cause | diff | postmortem
  title         text,
  content       text NOT NULL,
  status        text, -- draft | approved | rejected (for diff)
  created_at    timestamptz
)

approvals (
  id            uuid PK,
  artifact_id   uuid FK → artifacts,
  approved_by   uuid FK → users,
  decision      text NOT NULL, -- approved | rejected
  comment       text,
  created_at    timestamptz
)
```

---

## 9. Event Types (Timeline)

All real-time updates map to `incident_events.type`:

| Event type | Payload (examples) | Trigger |
|---|---|---|
| `session.created` | title, severity, repo_url | Session created |
| `participant.joined` | user_id, role | User opens room |
| `participant.left` | user_id | Disconnect / leave |
| `message.user` | text, user_id | Human message |
| `message.agent` | text chunk, run_id | Streaming agent token/chunk |
| `run.started` | run_id, prompt | New agent run |
| `run.stopped` | run_id, reason | User stop or redirect |
| `run.completed` | run_id | Agent finished |
| `run.failed` | run_id, error | Agent error |
| `tool.call` | tool_name, args summary | Agent invokes tool |
| `tool.result` | tool_name, result summary | Tool returns |
| `context.added` | context_id, kind | Logs/notes attached |
| `redirect` | text, user_id | User steers agent |
| `artifact.created` | artifact_id, type | Diff/summary generated |
| `approval.requested` | artifact_id | Diff ready for review |
| `approval.decided` | artifact_id, decision | Approve/reject |
| `ownership.handed_off` | from_user, to_user | Handoff |
| `status.changed` | old, new | Status transition |

---

## 10. REST API

Base path: `/api/v1`

### Incidents

| Method | Path | Description |
|---|---|---|
| POST | `/incidents` | Create incident session |
| GET | `/incidents` | List workspace incidents |
| GET | `/incidents/:id` | Get incident + participants + status |
| PATCH | `/incidents/:id` | Update metadata / status / owner |
| POST | `/incidents/:id/context` | Add logs or notes |
| POST | `/incidents/:id/runs` | Start agent run |
| POST | `/incidents/:id/runs/:runId/stop` | Stop run |
| POST | `/incidents/:id/redirect` | Redirect active run |
| POST | `/incidents/:id/handoff` | Transfer ownership |
| GET | `/incidents/:id/events` | Paginated event history |
| GET | `/incidents/:id/artifacts` | List artifacts |
| POST | `/incidents/:id/artifacts/:artifactId/approve` | Approve/reject diff |

### Example: create incident

```http
POST /api/v1/incidents
Content-Type: application/json

{
  "title": "prod-payment-500-error",
  "severity": "sev1",
  "repoUrl": "https://github.com/acme/payments-api",
  "initialContext": "Stripe webhook 500 since deploy abc123...",
  "prompt": "Investigate this production error and propose a minimal fix."
}
```

Response:

```json
{
  "id": "inc_01H...",
  "shareUrl": "https://app.domchat.io/incidents/inc_01H...",
  "status": "open"
}
```

---

## 11. WebSocket Protocol

**Channel:** `incident:{incidentId}`

### Client → server

| Message | Payload |
|---|---|
| `join` | `{ incidentId, userId }` |
| `leave` | `{ incidentId }` |
| `message` | `{ text }` |
| `run.start` | `{ prompt? }` |
| `run.stop` | `{ runId }` |
| `redirect` | `{ text, runId? }` |
| `presence.ping` | `{}` |

### Server → client (broadcast)

| Message | Payload |
|---|---|
| `presence.update` | `{ users: [{ id, name, role }] }` |
| `event.append` | `{ event: IncidentEvent }` |
| `run.status` | `{ runId, status }` |
| `artifact.updated` | `{ artifact }` |
| `error` | `{ code, message }` |

---

## 12. Agent Tools (MVP)

Read-only repo investigation in v1. No writes to GitHub from agent.

| Tool | Description | MVP implementation |
|---|---|---|
| `read_file` | Read file from repo | GitHub API or shallow clone cache |
| `search_repo` | Search code by keyword | GitHub search API or local index |
| `list_recent_paths` | Suggest files from error stack / paths | Parse stack trace + heuristics |
| `summarize_root_cause` | Produce markdown summary | LLM over gathered context |
| `propose_diff` | Generate unified diff text | LLM + file contents (not applied) |
| `draft_postmortem` | Fill postmortem template | LLM from timeline + summary |

**Guardrail:** `propose_diff` creates an artifact only — never pushes to repo in MVP.

---

## 13. Agent Run Loop

```text
1. User starts run with prompt + session context
2. Orchestrator loads: incident metadata, logs, repo URL
3. Loop (max N steps):
   a. LLM plans next action
   b. If tool call → execute → emit tool.call / tool.result events
   c. Stream assistant text to timeline
   d. If redirect received → inject user instruction, continue or stop
   e. If stop received → exit loop
4. On completion:
   - Create root_cause artifact if not yet created
   - If fix identified → create diff artifact → status fix_proposed
   - Optionally draft postmortem artifact
5. Mark run completed; emit run.completed
```

**Limits for MVP:**
- Max 20 tool steps per run
- Max run duration: 10 minutes
- One active run per incident at a time

---

## 14. Approval Flow (Diff)

```text
1. Agent creates artifact type=diff, status=draft
2. System emits approval.requested
3. Reviewer opens diff panel
4. Reviewer clicks Approve or Reject (+ optional comment)
5. System writes approvals row + artifact.status
6. Emits approval.decided
7. If approved → incident.status = ready_for_pr
```

Human creates PR manually outside DomChat in v1 (copy diff or use GitHub UI).

---

## 15. Handoff Flow

```text
1. Owner clicks "Hand off"
2. Selects participant + new role (usually owner)
3. POST /incidents/:id/handoff
4. Update incidents.owner_id + participant roles
5. Emit ownership.handed_off event
6. New owner can redirect and resolve
```

---

## 16. Example Timeline (Mock Session)

```text
10:02  [system]     session.created — prod-payment-500-error (sev1)
10:02  [alex]       participant.joined
10:03  [alex]       context.added — Sentry stack trace pasted
10:03  [alex]       run.started — "Investigate Stripe webhook 500..."
10:04  [agent]      tool.call — search_repo("stripe webhook")
10:04  [agent]      tool.result — 3 files found
10:05  [agent]      tool.call — read_file("src/webhooks/stripe.ts")
10:06  [agent]      message.agent — "Likely null guard missing on event.type..."
10:08  [sam]        participant.joined
10:08  [sam]        redirect — "Check deploy abc123; focus webhook handler"
10:09  [agent]      run.started (continued)
10:11  [agent]      artifact.created — diff: add null check + test
10:11  [system]     status.changed — fix_proposed
10:12  [sam]        approval.decided — approved
10:12  [system]     status.changed — ready_for_pr
10:15  [alex]       ownership.handed_off → sam
10:20  [sam]        status.changed — resolved
```

---

## 17. Tech Stack (MVP)

| Layer | Choice |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind |
| Realtime | WebSocket server (or Socket.io) + Redis pub/sub |
| API | Next.js route handlers |
| DB | PostgreSQL (Prisma ORM) |
| Queue | BullMQ + Redis for agent runs |
| LLM | OpenRouter or OpenAI with streaming |
| Repo read | GitHub REST API (public repos) or clone cache |
| Auth | Auth.js / Clerk |

---

## 18. Suggested File Structure

```text
domchat/
├── apps/
│   └── web/                    # Next.js app
│       ├── app/
│       │   ├── incidents/
│       │   │   ├── page.tsx           # list
│       │   │   ├── new/page.tsx       # create
│       │   │   └── [id]/page.tsx      # incident room
│       │   └── api/v1/...
│       └── components/
│           ├── incident-room/
│           │   ├── Timeline.tsx
│           │   ├── Composer.tsx
│           │   ├── PresencePanel.tsx
│           │   ├── ArtifactPanel.tsx
│           │   └── DiffViewer.tsx
├── packages/
│   ├── db/                     # Prisma schema
│   ├── agent/                  # orchestrator + tools
│   └── shared/                 # types, event schemas
└── workers/
    └── agent-runner/           # BullMQ worker
```

---

## 19. MVP Build Plan (4–6 weeks)

### Week 1 — Foundation
- Auth, workspace, users
- Incidents CRUD (no agent yet)
- Basic incident list + create form

### Week 2 — Multiplayer shell
- Incident room UI
- WebSocket join/presence
- User messages + persisted event log
- Timeline replay on refresh

### Week 3 — Agent v1
- BullMQ worker + run.start/stop
- Streaming agent messages to timeline
- Manual context paste (logs)
- read_file + search_repo tools (GitHub)

### Week 4 — Collaboration controls
- Redirect + stop
- Artifacts: root cause + diff
- Diff viewer panel
- Approval flow

### Week 5 — Polish
- Handoff ownership
- Status transitions
- Postmortem artifact
- Share link + role enforcement

### Week 6 — Hardening
- Error states, run limits
- Basic logging/metrics
- Seed demo incident for sales demo

---

## 20. Success Metrics

| Metric | Target (first 10 teams) |
|---|---|
| Time to create session | < 30 seconds |
| Teammate join to live timeline | < 5 seconds |
| Incidents with 2+ participants | > 60% |
| Redirect used per incident | > 30% |
| Diff artifact approved in-session | > 50% of fix_proposed |
| Session resolved with artifacts | > 70% |

---

## 21. Demo Script (5 minutes)

1. Create session `prod-payment-500-error`, paste stack trace
2. Start investigation — show live tool calls
3. Open invite link in second browser as “backend lead”
4. Redirect agent to specific file
5. Show diff artifact appear
6. Approve diff → status `ready_for_pr`
7. Hand off to reviewer
8. Show full timeline replay

---

## 22. Open Questions (Decide Before Build)

1. **Approve permission:** owner-only or any contributor?
2. **Repo access:** public GitHub only in v1, or GitHub App for private repos?
3. **Run concurrency:** strictly one active run per incident?
4. **Agent backend:** built-in orchestrator only, or pluggable later?

**Recommended v1 defaults:** owner-only approve, public repos + paste logs, one run at a time, built-in orchestrator.

---

## Related Documents

- [use-cases.md](./use-cases.md) — all eight practical use cases
- [multiplayer-agent-solution.md](./multiplayer-agent-solution.md) — product vision, prerequisites, concepts
- [implementation-phases.md](./implementation-phases.md) — phased build roadmap (Phase 4 = this MVP)
