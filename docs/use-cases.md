# Practical Use Cases: Multiplayer AI Agents

This document lists eight concrete use cases for shared agent sessions in DomChat. Each case shows who participates, what the shared session looks like, and why multiplayer beats a private AI chat.

For product architecture and prerequisites, see [multiplayer-agent-solution.md](./multiplayer-agent-solution.md).

For the first wedge MVP spec, see [mvp-engineering-incident.md](./mvp-engineering-incident.md).

For the phased build roadmap, see [implementation-phases.md](./implementation-phases.md).

---

## Summary

| # | Use case | Primary teams | Shared session focus | Key multiplayer value |
|---|---|---|---|---|
| 1 | Production bug / incident | Engineering | Live incident room | Redirect agent mid-investigation; hand off fix to reviewer |
| 2 | Enterprise deal | Sales, SE, Manager | Deal room | Align messaging; approve outbound before send |
| 3 | Support ticket escalation | Support, Team lead | Ticket room | Shift handoff without losing context |
| 4 | Feature spec to build | PM, Design, Engineering | Feature room | One spec context from idea to tasks |
| 5 | Contract redlines | Legal, Sales ops | Contract room | Clause review with approval trail |
| 6 | Campaign launch | Marketing, PM, Sales | Launch room | Cross-functional messaging in one place |
| 7 | Executive report | Analytics, Finance | Analysis room | Collaborative numbers + narrative with approval |
| 8 | Renewal at risk | CS, AE, Manager | Renewal room | Save plan built and handed off across roles |

---

## 1. Engineering — Shared Bug Fix on Production

### Situation

A payment API is failing in production. On-call engineer, backend lead, and PM all need the same context quickly.

### Problem today

One engineer runs a private agent chat, pastes logs into Slack, and teammates ask follow-ups in threads. Context fragments across chat, docs, and DMs.

### Shared session

**Room name:** `prod-payment-500-error`

**Connected context:**
- GitHub repo
- Sentry / error tracker
- Recent deploy notes or incident channel summary

### Flow

1. On-call engineer opens the session and connects repo + error tracker
2. Agent streams investigation: reading logs → checking recent commits → proposing root cause
3. Backend lead joins live and redirects: *“Focus on the Stripe webhook handler from yesterday’s deploy”*
4. Agent updates hypothesis and drafts a patch
5. Team reviews the diff in the same room
6. On-call approves or requests changes
7. Session handed to reviewer for merge + postmortem draft

### Artifacts

- Root cause summary
- Proposed code diff
- Postmortem draft
- Timeline of agent and human actions

### Why multiplayer wins

- No transcript forwarding
- Live redirect during investigation
- Clear audit trail for incident response

**MVP wedge:** Yes — see [mvp-engineering-incident.md](./mvp-engineering-incident.md)

---

## 2. Sales — Team Working an Enterprise Deal

### Situation

An AE, sales engineer, and manager are closing a $200k deal. The buyer raised security and pricing objections after the last call.

### Problem today

Each person uses their own AI chat or notes. Messaging drifts. Manager finds out about strategy changes late.

### Shared session

**Room name:** `acme-corp-q4-deal`

**Connected context:**
- CRM account and opportunity
- Call transcript or meeting notes
- Product docs and security/compliance pages

### Flow

1. AE starts the session with CRM notes and last call summary
2. Agent drafts account summary, objection responses, and follow-up email
3. Manager joins and redirects: *“Emphasize SOC 2 and implementation timeline, not discounting”*
4. Sales engineer adds technical constraints in chat
5. Agent regenerates proposal talking points and security FAQ
6. Manager approves outbound email before send
7. AE hands session to CSM for onboarding prep after close

### Artifacts

- Deal summary
- Objection handling doc
- Approved follow-up email
- Security FAQ for buyer

### Why multiplayer wins

- Deal strategy stays in one room across AE → SE → manager → CSM
- Approval before customer-facing actions
- No version confusion on “which draft did we send?”

---

## 3. Support — Ticket Handoff Across Shifts

### Situation

A complex billing ticket needs investigation. Morning shift starts it; evening shift must continue without restarting from zero.

### Problem today

Handoff notes are incomplete. Evening agent re-reads the ticket, re-runs searches, and may miss what was already ruled out.

### Shared session

**Room name:** `ticket-8842-billing-dispute`

**Connected context:**
- Zendesk / Intercom / Freshdesk ticket
- Billing policy docs
- Customer account history

### Flow

1. Morning support agent connects ticket and billing docs
2. Agent pulls customer history and identifies duplicate charge pattern
3. Agent drafts internal note and customer reply
4. Refund requires approval → team lead approves in session
5. Evening agent joins the same session and sees full timeline
6. Customer replies with new information; evening agent redirects agent to update response
7. Session closes with resolution summary attached to ticket

### Artifacts

- Investigation timeline
- Internal note
- Customer reply (approved)
- Resolution summary

### Why multiplayer wins

- Shift handoffs preserve full context
- Approvals for refunds or account changes are logged
- Support lead can drop in without a verbal briefing

---

## 4. Product + Design + Engineering — Feature Spec to Implementation

### Situation

The team needs to ship “team billing” in two weeks. PM, designer, and engineer must align on scope and tasks.

### Problem today

PM uses AI for spec, engineer uses AI for implementation plan, designer uses AI for UX — three separate threads, diverging assumptions.

### Shared session

**Room name:** `feature-team-billing-v1`

**Connected context:**
- PRD draft
- Customer feedback / support themes
- Existing codebase or API docs

### Flow

1. PM creates session with PRD draft and customer feedback
2. Agent proposes user stories, edge cases, and API outline
3. Designer joins and redirects: *“Keep UI similar to existing billing page”*
4. Engineer joins and asks agent to map stories to existing code
5. Agent produces spec doc, task breakdown, and API sketch
6. PM approves spec; engineer takes ownership for implementation tasks
7. Artifacts saved for sprint planning

### Artifacts

- Approved spec
- User stories with acceptance criteria
- Task breakdown
- Open questions list

### Why multiplayer wins

- One shared context from spec to build
- Redirects keep scope aligned across functions
- Handoff from PM to engineer is explicit

---

## 5. Legal + Sales — Contract Redlines Under Time Pressure

### Situation

Customer legal sent contract redlines. Deal closes Friday. Sales needs fast, safe turnaround.

### Problem today

Redlines bounce over email. Legal reviews ad-hoc AI drafts with no audit trail. Sales may send unapproved language.

### Shared session

**Room name:** `acme-msa-redlines-aug`

**Connected context:**
- Master contract template
- Customer redlined version
- Internal fallback positions / playbooks

### Flow

1. Sales ops uploads contract and customer redlines
2. Agent highlights risky clauses and suggests counter-language
3. Legal counsel joins and redirects on liability cap and DPA terms
4. Agent produces redline draft with rationale per clause
5. Legal approves final version before sales sends back
6. Session archived for audit

### Artifacts

- Clause-by-clause analysis
- Redline draft
- Approval record
- Rationale notes per clause

### Why multiplayer wins

- Legal stays in control with approval gates
- Full audit trail for compliance
- Faster than async email loops

---

## 6. Marketing — Campaign Launch with Cross-Functional Input

### Situation

Product launch is next week. Marketing, PM, and sales need aligned messaging across channels.

### Problem today

Copy lives in Docs, strategy in Slack, sales objections in CRM notes. Messaging drifts by channel and audience.

### Shared session

**Room name:** `launch-campaign-q4`

**Connected context:**
- Product brief
- Competitor landing pages
- Recent sales call themes

### Flow

1. Marketer starts with product brief and competitor references
2. Agent drafts landing copy, email sequence, and social posts
3. PM redirects: *“Lead with reliability, not price”*
4. Sales adds real objection quotes from recent calls
5. Agent regenerates messaging matrix by persona
6. Marketer approves email #1; schedules rest for review
7. Sales enablement doc exported from session

### Artifacts

- Messaging matrix by persona
- Landing page copy
- Email sequence
- Sales enablement one-pager

### Why multiplayer wins

- One campaign room instead of scattered docs
- PM and sales steer messaging live
- Approved assets are clearly versioned

---

## 7. Data / Analytics — Ad-Hoc Executive Report

### Situation

CEO wants churn analysis by segment by end of day. Analyst and finance lead must align on numbers and narrative.

### Problem today

Analyst works solo in a notebook or private AI session. Finance finds data issues late. Exec gets inconsistent story.

### Shared session

**Room name:** `churn-analysis-aug-20`

**Connected context:**
- Data warehouse schema or sample exports
- Prior month’s report
- Metric definitions doc

### Flow

1. Analyst connects schema and last report
2. Agent proposes queries, runs analysis, streams findings
3. Finance lead joins: *“Split enterprise vs SMB”*
4. Agent updates charts and narrative
5. Analyst approves numbers before export
6. Session produces SQL, summary, and slide bullets for exec review

### Artifacts

- SQL queries used
- Summary narrative
- Chart definitions / exports
- Slide bullet points

### Why multiplayer wins

- Collaborative analysis with live redirects
- Approval before exec-facing numbers
- Reproducible query and decision trail

---

## 8. Customer Success — Renewal at Risk

### Situation

Key account renewal in 30 days. Product usage dropped. CSM, AE, and manager need a save plan.

### Problem today

CSM notes live in CRM, AE has separate context, manager learns about risk late. Save plans are inconsistent.

### Shared session

**Room name:** `renewal-contoso-2026`

**Connected context:**
- CRM account record
- Product usage data
- Support ticket history

### Flow

1. CSM connects CRM, usage, and support history
2. Agent identifies drop-off patterns and support themes
3. CSM redirects: *“Prepare save plan and exec outreach email”*
4. AE joins with pricing authority context
5. Agent drafts save plan: actions, talking points, discount options
6. Manager approves discount range in approval gate
7. CSM hands session to AE for exec call prep

### Artifacts

- Risk assessment summary
- Save plan checklist
- Exec outreach email draft
- Approved discount guidance

### Why multiplayer wins

- Renewal strategy built together with full account context
- Manager approval on commercial terms
- Clean handoff from CSM to AE

---

## Cross-Cutting Patterns (All 8 Use Cases)

Every use case above relies on the same multiplayer primitives:

| Pattern | Description |
|---|---|
| **Live join** | Teammates enter mid-run without waiting for a summary |
| **Redirect** | Any authorized member can change agent focus without restarting |
| **Handoff** | Explicit ownership transfer with preserved memory |
| **Approval gate** | Risky or external actions require human yes/no |
| **Artifacts** | Deliverables saved to the session, not buried in chat |
| **Audit trail** | Who asked, redirected, approved, and handed off — and when |

---

## Recommended Build Order

If implementing DomChat incrementally:

1. **Engineering incident** — clearest artifacts (diffs, timeline), high pain, good demo
2. **Support ticket room** — daily shift handoffs, strong retention use case
3. **Sales deal room** — broad appeal, many stakeholders, approval workflows

Use cases 4–8 reuse the same platform with different connectors and templates.
