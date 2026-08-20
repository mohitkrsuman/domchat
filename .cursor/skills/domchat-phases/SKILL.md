---
name: domchat-phases
description: >-
  Guides DomChat development through phased roadmap (Phase 0–8). Reads
  PROJECT_STATUS.md, enforces phase scope, and checks exit criteria before
  advancing. Use when implementing features, scaffolding code, or when the user
  asks what to build next in DomChat.
---

# DomChat phased development

## On every task

1. Read [PROJECT_STATUS.md](../../PROJECT_STATUS.md) for **current phase**
2. Read that phase section in [docs/implementation-phases.md](../../docs/implementation-phases.md)
3. Implement **only** items listed for the current phase
4. Before suggesting next phase work, verify exit criteria are met

## Phase gate rules

| Rule | Action |
|---|---|
| User asks for out-of-phase feature | Explain which phase it belongs to; offer current-phase alternative |
| Phase exit criteria incomplete | Do not scaffold next phase code |
| Ambiguous scope | Default to smallest change that satisfies current phase |
| Phase 4 work | Read [docs/mvp-engineering-incident.md](../../docs/mvp-engineering-incident.md) first |

## Phase quick reference

### Phase 0 — Setup (current until PROJECT_STATUS says otherwise)

**Build:** docker-compose, Next.js spike, streaming LLM route, agent docs/skills  
**Skip:** auth, WebSocket, Prisma models for incidents, agent queue

**Exit:** Postgres+Redis healthy, app runs, streaming works

### Phase 1 — Foundation

**Build:** auth, workspace, Prisma schema (users, workspaces, incidents), incident list/create API + UI  
**Skip:** WebSocket, agent runs, timeline events

**Exit:** CRUD incidents persist in Postgres

### Phase 2 — Multiplayer shell

**Build:** incident room page, WebSocket gateway, Redis pub/sub, presence, human messages, `incident_events` log, timeline UI  
**Skip:** agent orchestration, tools, approvals

**Exit:** two browsers see live chat + replay on refresh

### Phase 3 — Agent v1

**Build:** BullMQ worker, `agent_runs`, start/stop API, stream agent to timeline, context paste, `read_file`/`search_repo` tools  
**Skip:** redirect, diff artifacts, approvals, handoff

**Exit:** agent run visible to all participants with tool events

### Phase 4 — Collaboration MVP (first ship)

**Build:** stop/redirect, artifacts (root_cause, diff, postmortem), diff viewer, approval flow, handoff, status machine  
**Spec:** [docs/mvp-engineering-incident.md](../../docs/mvp-engineering-incident.md)

**Exit:** full 5-minute demo script works

### Phase 5–8

See [phase-reference.md](phase-reference.md)

## UI conventions (required on every feature)

When building any UI feature, include:

1. **Toast feedback** via `useToast()` from `src/components/toast.tsx`
2. **Button loaders** via `ButtonLoader` / `Spinner` from `src/components/ui.tsx` on submit/actions
3. **Skeleton loaders** for page/list fetch states via `src/components/skeletons.tsx` (extend as needed)

### Error handling + toast

```tsx
import { useToast } from "@/components/toast";

const { toast } = useToast();

try {
  const res = await fetch(...);
  const data = await res.json();
  if (!res.ok) {
    toast(data.error ?? "Something went wrong", "error");
    return;
  }
  toast("Saved"); // or feature-specific success
} catch {
  toast("Something went wrong", "error");
}
```

Rules:
- Toast **errors** for failed API/auth actions
- Toast **success** for create/update/sign-in/sign-up/sign-out
- Keep toast copy short (one line)
- Still show inline form errors when useful; toast is the primary feedback
- API responses stay `{ error: string, code?: string }`

### Loaders

| Situation | Use |
|---|---|
| Form submit / mutation in progress | `ButtonLoader` on the button; disable inputs |
| Initial page/list data fetch | Skeleton (`IncidentsListSkeleton`, `FormPageSkeleton`, or new minimal skeleton) |
| Suspense boundary fallback | Skeleton blocks, not raw "Loading…" text |
| Tiny async action (sign out) | Inline `Spinner` + short label |

Do **not** ship features with blank screens or spinner-only full pages when a skeleton layout fits.

### Shared components

- `src/components/toast.tsx` — `ToastProvider`, `useToast`
- `src/components/ui.tsx` — `Spinner`, `Skeleton`, `ButtonLoader`
- `src/components/skeletons.tsx` — page/list skeletons
- Wrap app with `Providers` in `layout.tsx` (already done)

## Anti-patterns (reject unless phase allows)

- Billing, SSO, CRM, support tickets before Phase 6
- GitHub App / private repos / Docker sandbox before Phase 5
- Auto-merge code — diff + approval only (Phase 4+)
- Fully autonomous agents without human-in-the-loop
- Skipping event log — timeline is append-only from Phase 2

## When completing a phase

Copy checklist to response, mark items done, then tell user to update PROJECT_STATUS.md:

```markdown
Phase N complete:
- [ ] criterion 1
- [ ] criterion 2
Ready to advance to Phase N+1?
```

## Additional resources

- Full phase details: [phase-reference.md](phase-reference.md)
- UI toast/loader patterns: [ui-conventions.md](ui-conventions.md)
- MVP spec: [docs/mvp-engineering-incident.md](../../docs/mvp-engineering-incident.md)
- Agent entrypoint: [AGENTS.md](../../AGENTS.md)
