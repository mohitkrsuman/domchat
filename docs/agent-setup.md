# Agent Setup Guide

How DomChat uses Cursor rules and skills so coding agents follow the phased roadmap.

---

## What was created

```text
.cursor/
├── rules/
│   ├── domchat-core.mdc      # Always on — phase guardrails
│   └── domchat-web.mdc       # TypeScript/Next.js conventions
└── skills/
    └── domchat-phases/
        ├── SKILL.md          # Phase workflow (main skill)
        └── phase-reference.md

AGENTS.md                     # Agent entrypoint (read first)
PROJECT_STATUS.md             # Current phase + exit criteria
```

---

## How it works

1. **`domchat-core` rule** applies to every chat in this repo  
   → tells the agent to read `PROJECT_STATUS.md` and not skip phases

2. **`domchat-phases` skill** provides detailed phase gates  
   → agent checks what is allowed in the current phase before coding

3. **`PROJECT_STATUS.md`** is the source of truth for current phase  
   → update it when you complete a phase

4. **`AGENTS.md`** is the quick entrypoint for any new agent session

---

## Using skills in chat

Mention the skill or ask phase-aware questions:

- “Implement the next Phase 1 task”
- “Follow domchat-phases — what should I build now?”
- “Are we ready to advance to Phase 2?”

The agent should read `PROJECT_STATUS.md` and refuse out-of-phase work.

---

## Advancing a phase

When exit criteria are met:

1. Check off items in `PROJECT_STATUS.md`
2. Change `Current phase` to the next phase
3. Update the phase progress table
4. Copy exit criteria from [implementation-phases.md](./implementation-phases.md)

Example prompt:

> “Phase 0 exit criteria are done. Update PROJECT_STATUS.md and start Phase 1 foundation.”

---

## Rules vs skills

| | Rules (`.mdc`) | Skills (`SKILL.md`) |
|---|---|---|
| **When loaded** | Automatically (always or by file glob) | When relevant or invoked |
| **Purpose** | Short guardrails | Detailed workflows |
| **DomChat files** | `domchat-core`, `domchat-web` | `domchat-phases` |

---

## Phase 0 setup checklist

- [ ] Copy `.env.example` → `apps/web/.env.local` and add LLM key
- [ ] Install Docker Desktop (for Postgres + Redis)
- [ ] Run `docker compose up -d` from repo root
- [ ] Run `cd apps/web && npm install && npm run dev`
- [ ] Open http://localhost:3000 — check health + stream

When all pass, mark Phase 0 complete in `PROJECT_STATUS.md`.

---

## Adding more skills later

Suggested future project skills:

| Skill | When to add |
|---|---|
| `domchat-incident-mvp` | Phase 4 — full incident room spec |
| `domchat-realtime` | Phase 2 — WebSocket + event log patterns |
| `domchat-agent-loop` | Phase 3 — orchestrator + tools |

Create under `.cursor/skills/<name>/SKILL.md` following Cursor skill format.
