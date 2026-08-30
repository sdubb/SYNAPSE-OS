# Cline UI Reuse Audit

> Audit date: 2026-08-30

## Executive Summary

Cline provides mature, polished UX patterns for single-agent AI coding interaction. SYNAPSE should **absorb the strongest patterns** while adding governance, multi-agent, and observability layers that Cline does not provide.

The goal: **Cline provides the interaction quality. SYNAPSE provides the operational truth and governance.**

---

## Discovered Cline Patterns

| Cline Pattern | Implementation | SYNAPSE Use | Strategy |
|---|---|---|---|
| **ToolGroupRenderer** | Collapsible tool groups with activity indicators, expand/collapse, typewriter text for active items | Agent activity timeline in Mission Detail | **ADAPT** — Show tool calls with governance decisions (allowed/blocked/pending) |
| **TaskHeader** | Collapsible task header with cost badge, context window, working directory | Mission cockpit header with cost, runtime, status, controls | **ADAPT** — Add mission controls (Pause/Resume/Stop), risk indicator, agent count |
| **TypewriterText** | Character-by-character text reveal for live streaming | Live agent reasoning display in timeline | **REUSE** — Pattern works as-is for streaming agent activity |
| **MessageRenderer** | Structured message rendering with different row types | Mission event timeline renderer | **ADAPT** — Different event types: tool calls, observations, governance decisions |
| **ContextWindow** | Token usage visualization with cache reads/writes | Token/cost display in mission header | **ADAPT** — Add cost trend over time, not just snapshot |
| **Expandable rows** | Tool arguments expand/collapse with smooth animation | Node inspector in graph view, audit drill-down | **REUSE** — Pattern is general and works well |
| **ChatRow** | Individual message with avatar, timestamp, expand/collapse | Timeline event item with event type, agent, evidence | **ADAPT** — Replace chat semantics with event semantics |
| **BrowserSessionRow** | Grouped browser actions with unified display | Grouped tool calls in timeline | **ADAPT** — Group consecutive tool calls from same agent |

---

## Patterns Intentionally NOT Reused

| Pattern | Reason |
|---|---|
| Chat input | SYNAPSE missions are initiated via API, not chat |
| File diff viewer | Important but secondary — add later as mission evidence |
| Settings/configuration | Cline settings are agent-specific; SYNAPSE settings are tenant/platform |
| Provider/model selector | Managed by Cline runtime, not operator |

---

## SYNAPSE-Only Experiences (Not in Cline)

These are SYNAPSE differentiators that Cline does not provide:

1. **Multi-agent topology** — Visual workforce hierarchy
2. **Execution graph** — DAG-based execution with frontier visualization
3. **Governance decisions** — Policy evaluation, approval flow, escalation
4. **Mission replay** — Scrub through historical execution timeline
5. **Prediction vs Reality** — Simulation predictions compared to actual outcomes
6. **Evidence chain** — Tamper-proof audit trail with SHA-256 hash chain
7. **Cross-agent coordination** — Agent spawn/terminate with lineage tracking
8. **Tenant-aware operations** — Multi-tenant isolation and authorization
9. **Autonomous recovery visualization** — Failure → replan → new graph version

---

## Key Adaptation: Mission as Cockpit

**Cline model:** User types → Agent reasons → Tool executes → User sees result

**SYNAPSE model:** Operator assigns mission → SYNAPSE orchestrates agents → Graph determines frontier → Governance controls execution → Operator observes and intervenes

The Mission Detail screen should feel like:
- **Header** (Cline TaskHeader adapted): Mission identity, status, controls, cost, elapsed
- **Timeline** (Cline ToolGroupRenderer adapted): Real-time event stream with tool calls, governance, observations
- **Graph** (SYNAPSE-only): Interactive execution map showing node states, frontier, blocked nodes
- **Activity** (Cline ChatRow adapted): Agent activity with governance decisions
- **Governance** (SYNAPSE-only): Approvals, escalations, policy decisions
- **Evidence** (SYNAPSE-only): Audit trail, observation chain, simulation predictions

---

## Design Principles

1. **Calm authority** — Premium, technical, not loud. Dark theme with meaningful color.
2. **High information density** — Every pixel communicates state. No decorative elements.
3. **State communicates** — Color = status. Animation = activity. Motion = transition.
4. **Drill-down** — Every entity is clickable. Every ID opens context.
5. **Honest states** — Loading, empty, error, unavailable — all explicitly shown.
6. **No fabrications** — Every value from backend. Empty backend = honest empty state.
