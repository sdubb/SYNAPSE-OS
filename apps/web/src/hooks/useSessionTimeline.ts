import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useRealtime, RealtimeEventListener } from '@/realtime/WSConnectionProvider';
import { useEffect, useState, useCallback } from 'react';
import { SynapseRealtimeEvent } from '@/types';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  category: 'tool' | 'governance' | 'observation' | 'simulation' | 'agent' | 'graph' | 'system' | 'error';
  summary: string;
  details?: Record<string, unknown>;
  agentId?: string;
  evidenceId?: string;
  auditEventId?: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

function classifyEvent(eventType: string): TimelineEvent['category'] {
  if (eventType.includes('tool')) return 'tool';
  if (eventType.includes('approval') || eventType.includes('escalation') || eventType.includes('policy')) return 'governance';
  if (eventType.includes('observation')) return 'observation';
  if (eventType.includes('simulation')) return 'simulation';
  if (eventType.includes('agent') || eventType.includes('workforce')) return 'agent';
  if (eventType.includes('graph') || eventType.includes('version') || eventType.includes('frontier')) return 'graph';
  if (eventType.includes('error') || eventType.includes('failed') || eventType.includes('block')) return 'error';
  return 'system';
}

function classifySeverity(eventType: string): TimelineEvent['severity'] {
  if (eventType.includes('error') || eventType.includes('failed') || eventType.includes('block')) return 'error';
  if (eventType.includes('warning') || eventType.includes('escalation')) return 'warning';
  if (eventType.includes('completed') || eventType.includes('allowed') || eventType.includes('success')) return 'success';
  return 'info';
}

function realtimeToTimelineEvent(event: SynapseRealtimeEvent): TimelineEvent {
  const payload = event.payload || {};
  return {
    id: event.eventId || `evt_${Date.now()}`,
    timestamp: event.isoTimestamp || (typeof event.timestamp === 'number' ? new Date(event.timestamp).toISOString() : new Date().toISOString()),
    type: event.eventType || 'unknown',
    category: classifyEvent(event.eventType || ''),
    summary: formatEventSummary(event),
    details: payload,
    agentId: event.agentId || payload.agentId as string | undefined,
    evidenceId: payload.evidenceId as string | undefined,
    auditEventId: payload.auditEventId as string | undefined,
    severity: classifySeverity(event.eventType || ''),
  };
}

function formatEventSummary(event: SynapseRealtimeEvent): string {
  const type = event.eventType || '';
  const payload = (event.payload || {}) as Record<string, unknown>;

  if (type.includes('tool.started')) return `Tool executing: ${payload.toolName || 'unknown'}`;
  if (type.includes('tool.completed')) return `Tool completed: ${payload.toolName || 'unknown'}`;
  if (type.includes('tool.blocked')) return `Tool blocked by policy: ${payload.toolName || 'unknown'}`;
  if (type.includes('approval.required')) return `Approval required for: ${payload.toolName || 'action'}`;
  if (type.includes('approval.resolved')) return `Approval ${payload.decision || 'resolved'}: ${payload.toolName || 'action'}`;
  if (type.includes('escalation')) return `Escalation ${payload.level || ''}: ${payload.reason || 'triggered'}`;
  if (type.includes('observation')) return `Observation recorded`;
  if (type.includes('graph.version')) return `Graph version ${payload.version || ''} created`;
  if (type.includes('graph.frontier')) return `Execution frontier updated`;
  if (type.includes('agent.spawned')) return `Agent spawned: ${payload.agentId || ''}`;
  if (type.includes('agent.terminated')) return `Agent terminated: ${payload.agentId || ''}`;
  if (type.includes('simulation')) return `Simulation ${payload.status || 'requested'}`;
  if (type.includes('session.completed')) return 'Mission completed';
  if (type.includes('session.failed')) return 'Mission failed';
  if (type.includes('runtime.failed')) return 'Runtime failure';
  return type.replace(/\./g, ' ');
}

export function useSessionTimeline(sessionId: string | undefined) {
  const { subscribe } = useRealtime();
  const [liveEvents, setLiveEvents] = useState<TimelineEvent[]>([]);

  // Fetch historical timeline from backend API
  const { data: historicalEvents, isLoading, error } = useQuery({
    queryKey: ['session-timeline', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      try {
        const rawEvents = await apiClient.getSessionTimeline(sessionId);
        return (rawEvents || []).map((e: any, i: number) => ({
          id: e.id || e.eventId || `hist_${i}`,
          timestamp: e.timestamp || e.createdAt || new Date().toISOString(),
          type: e.type || e.eventType || 'unknown',
          category: classifyEvent(e.type || e.eventType || ''),
          summary: e.summary || e.description || formatEventSummary(e),
          details: e.details || e.payload || {},
          agentId: e.agentId,
          evidenceId: e.evidenceId,
          auditEventId: e.auditEventId,
          severity: classifySeverity(e.type || e.eventType || ''),
        })) as TimelineEvent[];
      } catch {
        return [];
      }
    },
    enabled: !!sessionId,
    staleTime: 5000,
  });

  // Subscribe to live WebSocket events for this session
  const handleRealtimeEvent: RealtimeEventListener = useCallback((event: SynapseRealtimeEvent) => {
    if (sessionId && event.sessionId === sessionId) {
      setLiveEvents((prev) => {
        const newEvent = realtimeToTimelineEvent(event);
        // Deduplicate by ID
        if (prev.some((e) => e.id === newEvent.id)) return prev;
        return [...prev, newEvent];
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribe('*', handleRealtimeEvent);
    return unsub;
  }, [sessionId, subscribe, handleRealtimeEvent]);

  // Merge historical + live, sorted by timestamp
  const allEvents = [...(historicalEvents || []), ...liveEvents]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Deduplicate by ID after merge
  const seen = new Set<string>();
  const dedupedEvents = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return {
    events: dedupedEvents,
    isLoading,
    error,
    liveEventCount: liveEvents.length,
  };
}

/**
 * Hook for computing mission stats from timeline events
 */
export function useMissionStats(events: TimelineEvent[]) {
  const toolCalls = events.filter((e) => e.type.includes('tool'));
  const governanceDecisions = events.filter((e) => e.category === 'governance');
  const errors = events.filter((e) => e.category === 'error');
  const agentEvents = events.filter((e) => e.category === 'agent');

  const toolSuccess = toolCalls.filter((e) => e.type.includes('completed')).length;
  const toolBlocked = toolCalls.filter((e) => e.type.includes('blocked')).length;

  return {
    totalEvents: events.length,
    toolCalls: toolCalls.length,
    toolSuccess,
    toolBlocked,
    governanceDecisions: governanceDecisions.length,
    errors: errors.length,
    agentChanges: agentEvents.length,
  };
}
