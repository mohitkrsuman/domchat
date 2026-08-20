# Phase reference (Phases 5–8)

Condensed from [docs/implementation-phases.md](../../docs/implementation-phases.md).

## Phase 5 — Engineering depth

- GitHub App for private repos
- Sentry webhook / auto-attach errors
- Docker sandbox for code execution
- PR creation from approved diff
- Run resume, Slack/email notifications

**Exit:** private repo connected; approved diff opens PR

## Phase 6 — Second wedge (pick one)

**Support:** Zendesk/Intercom connector, reply drafts, refund approval  
**Sales:** CRM connector, deal summary, outbound email approval

**Exit:** second template works with redirect + handoff + approval

## Phase 7 — Platform generalization

- `incidents` → generic `sessions` with templates
- Connector framework (GitHub, Sentry, CRM, tickets)
- Template picker, admin policies, audit export

**Exit:** new room type without rewriting core

## Phase 8 — Production SaaS

- Stripe billing, SSO, tenant security audit
- Observability, self-serve onboarding, data retention

**Exit:** paying team can onboard self-serve

## Dependency chain

```text
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
```

Phases 2–4 must not be parallelized or skipped.
