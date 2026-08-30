# SYNAPSE-OS — Operator Frontend Architecture

## Overview

The Operator UI is a pure observability and control surface over the real SYNAPSE backend. It renders only real backend data and never fabricates, fakes, or mocks operational state.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript (strict) |
| Build | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| Data Fetching | @tanstack/react-query 5 |
| Routing | react-router-dom 7 |
| Realtime | Native WebSocket |
| Validation | Zod 3 (via @synapse/contracts) |
| Icons | lucide-react |

## Architecture Principles

1. **Backend = Source of Truth** — All data comes from SYNAPSE REST API or WebSocket events
2. **Zero Mock Data** — Empty states, loading states, error states only. Never fabricate.
3. **No Frontend Business Logic** — The frontend never decides what is safe, allowed, or authorized
4. **Cache ≠ Source of Truth** — React Query caches for performance; re-sync on reconnect
5. **Graceful Degradation** — If backend is unavailable, show "Backend unavailable", not fake content

## Directory Structure

```
apps/web/src/
├── api/                    # Typed API client layer
│   └── client.ts           # Single API client with all endpoints
├── components/
│   ├── navigation/         # Sidebar, TopBar
│   ├── product/            # Shared product components (RiskBadge, StatusIndicator)
│   └── ui/                 # Generic UI primitives (Button, Card, Badge, etc.)
├── features/
│   ├── missions/           # Mission Command Center + Mission Detail
│   ├── graph/              # Execution Graph Viewer + Version Comparison
│   ├── workforce/          # Workforce (Agent Tree)
│   ├── simulation/         # Simulation Results
│   ├── approvals/          # Approval Center
│   ├── escalations/        # Escalation Center
│   ├── audit/              # Audit Trail
│   └── runtime/            # Runtime Details
├── hooks/                  # Data fetching hooks
├── layouts/                # AppShell layout
├── lib/                    # Utilities
├── realtime/               # WebSocket connection provider
├── state/                  # Auth state
└── types/                  # TypeScript type definitions
```

## Data Flow

```
User Action
    ↓
React Component
    ↓
Hook (useQuery/useMutation)
    ↓
API Client (fetch)
    ↓
SYNAPSE REST API (/api/v1/*)
    ↓
Response validated against contract types
    ↓
React Query Cache updated
    ↓
Component re-renders with real data
```

## Realtime Data Flow

```
SYNAPSE Backend
    ↓ (EventBus publish)
WebSocket Server (port 3001)
    ↓ (JSON message)
WSConnectionProvider
    ↓ (parse SynapseEventEnvelope)
Event Listeners / React Query Invalidation
    ↓
Components re-render with fresh data
```

## State Management

- **React Query** for server state (sessions, tasks, agents, approvals, etc.)
- **React Context** for auth (`AuthProvider`) and WebSocket (`WSConnectionProvider`)
- **Local component state** for UI-only state (selected tab, drawer open/closed, etc.)
- **No Redux, no Zustand** — React Query + Context is sufficient

## Error Handling

| HTTP Status | Frontend Behavior |
|-------------|-------------------|
| 401 | Redirect to login / show auth error |
| 403 | Show "Access denied" |
| 404 | Show "Resource not found" |
| 429 | Show "Rate limited, retrying..." |
| 500 | Show "Backend error" |
| Network failure | Show "Backend unavailable" |
| WebSocket disconnect | Show "Disconnected from SYNAPSE" with reconnect button |

## Empty States

Every page must show a proper empty state when the backend returns no data:

| Page | Empty State Message |
|------|-------------------|
| Missions | "No missions found" |
| Agents | "No active agents" |
| Graph | "Execution graph unavailable" |
| Workforce | "No active agents" |
| Simulations | "No simulations" |
| Approvals | "No pending approvals" |
| Escalations | "No escalations" |
| Audit | "No audit events" |
| Runtime | "No runtime information" |

## Performance

- Graph rendering supports 1000+ nodes via efficient SVG/Canvas rendering
- React Query staleTime: 5s for real-time data, 30s for static data
- WebSocket events trigger targeted cache invalidation, not full refetch
- Virtual scrolling for large lists (audit, timeline)
