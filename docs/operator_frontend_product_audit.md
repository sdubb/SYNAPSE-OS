# SYNAPSE-OS — Operator Frontend Product Audit

> Audit date: 2026-08-30

## Executive Summary

The current frontend is a clean, zero-mock observability surface with correct data tracing. However, it reads like an admin dashboard rather than an AI operations platform. The mission experience is metadata-heavy but activity-poor. There is no live timeline, no interactive graph execution view, no tool call visibility, and no mission replay.

**The mission flow must become the primary product experience.**

---

## Current State Assessment

### Screens

| Screen | Strength | Weakness | Priority |
|--------|----------|----------|----------|
| Mission Command Center | Clean list, honest empty state | Flat list, no visual richness, no live activity | HIGH — needs mission cards |
| Mission Detail | Shows real session data | Metadata dump, no activity timeline, no tool calls | CRITICAL — needs complete redesign |
| Execution Graph | Correct data trace, SVG renderer | Static, no execution state, no interactivity | HIGH — needs interactive execution map |
| Workforce | Correct agent mapping | Flat list, no hierarchy | MEDIUM |
| Approvals | Real mutation flow | Good but isolated | MEDIUM |
| Escalations | Real-time WebSocket | Minimal | LOW |
| Audit | Real audit chain | Table view, no drill-down | MEDIUM |
| Simulation | Shows real data | Minimal | LOW |
| Runtime Details | Shows real metadata | Duplicate of Mission Detail | REMOVE or MERGE |
| Graph Versions | Honest empty state | No implementation | LOW |

### Navigation

Current: "OPERATOR" + "GOVERNANCE" sections with 8 items.

Problem: Too many screens, none of them feel like the primary experience. The user has to navigate between unrelated pages to understand what's happening.

**Proposed: MISSION-CENTRIC navigation**
- Command (home — what are agents doing right now?)
- Mission Detail (the cockpit — everything about one mission)
- Workforce (agent topology)
- Governance (approvals, escalations, audit)
- System (health, settings)

### Information Hierarchy

Current: All information is at the same visual level. No hierarchy between "what matters now" and "what happened before."

**Proposed: Three tiers**
1. **NEEDS YOU** — approvals, escalations, failures (attention)
2. **ACTIVE** — running missions, live agents (observation)
3. **HISTORY** — completed work, audit trail (proof)

### Visual Design

Current: Dark theme with cyan accents. Clean but generic. Looks like a monitoring dashboard.

**Proposed: Mission Control aesthetic**
- Premium, technical, calm
- High information density without clutter
- Meaningful color: emerald=healthy, amber=attention, rose=critical
- Subtle motion that communicates state
- Excellent typography hierarchy

---

## Cline UX Patterns to Reuse

| Pattern | Cline Implementation | SYNAPSE Use | Strategy |
|---------|---------------------|-------------|----------|
| Tool call groups | ToolGroupRenderer — collapsible, expandable, activity indicators | Agent activity timeline in Mission Detail | Adapt: show tool calls with governance decisions |
| Task header | TaskHeader — cost, context, working directory | Mission header with cost, runtime, controls | Adapt: add status, risk, agent count |
| Streaming text | TypewriterText — character-by-character reveal | Live agent reasoning display | Reuse directly |
| Auto-approve | AutoApproveBar — tool approval UI | Governance approval center | Adapt: show policy, risk, evidence |
| Context window | ContextWindow — token usage visualization | Token/cost display in mission header | Adapt: add cost trend |
| Message renderer | MessageRenderer — structured tool output | Tool call result display | Adapt: add audit/evidence links |
| Collapsible details | Tool group expand/collapse | Node inspector in graph view | Reuse pattern |

---

## Opportunities for Dramatically Better UX

1. **Mission as cockpit**: One screen where you see everything about a mission — graph, timeline, agents, governance, evidence — without navigating away.

2. **Live activity**: Real-time tool calls, observations, and governance decisions appearing as they happen.

3. **Graph as execution map**: Not a static SVG but an interactive map where you can see which nodes are running, which are waiting, and why.

4. **Mission Replay**: Scrub through the actual execution timeline of a completed mission. This is SYNAPSE's signature experience.

5. **Decision explainability**: Every governance decision (approve, block, escalate) explained with full context — WHO, WHAT, WHY, RISK, EVIDENCE.

6. **Prediction vs Reality**: When simulation data exists, show predicted vs actual outcomes side by side.

7. **Attention system**: A unified "needs you" surface that aggregates approvals, escalations, and failures.

---

## Backend Capability Gaps

| Capability | Frontend Need | Backend Status | Impact |
|-----------|---------------|----------------|--------|
| Mission graph endpoint | Graph viewer needs data | Not implemented | HIGH — graph shows empty |
| Mission timeline endpoint | Timeline needs events | Not implemented | HIGH — no live activity |
| Workforce graph endpoint | Agent hierarchy | Not implemented | MEDIUM — uses proxy data |
| Graph version comparison | Version diff | Not implemented | LOW — shows empty |
| Mission replay events | Replay feature | Not implemented | MEDIUM — signature experience blocked |
