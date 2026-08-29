import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { RunSession, RunStatus } from '../types/run';
import { useWebSocket } from '../realtime/WebSocketProvider';

export function useRun(initialRunId?: string) {
  const [activeRunId, setActiveRunId] = useState<string | undefined>(initialRunId);
  const [run, setRun] = useState<RunSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  const loadRun = useCallback(async () => {
    try {
      let targetId = activeRunId;

      // If no target ID is set, look for active sessions or create a fresh one
      if (!targetId || targetId === 'run_checkout_99182') {
        const sessions = await apiClient.getSessions();
        if (sessions && sessions.length > 0) {
          targetId = sessions[0].id;
        } else {
          const fresh = await apiClient.createSession({
            title: 'Conversational CLI Operator Session',
            status: 'active',
          });
          targetId = fresh.id;
        }
        setActiveRunId(targetId);
      }

      const data = await apiClient.getRunSession(targetId);
      setRun(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load run');
    } finally {
      setIsLoading(false);
    }
  }, [activeRunId]);

  useEffect(() => {
    loadRun();

    if (!activeRunId) return;

    // Subscribe to run lifecycle events
    const unsubs = [
      subscribe('run.status_changed', (evt) => {
        if (evt.sessionId === activeRunId || !evt.sessionId) {
          setRun((prev) => (prev ? { ...prev, status: (evt.payload.status as RunStatus) || prev.status } : null));
        }
      }),
      subscribe('session.message', (evt) => {
        if (evt.sessionId === activeRunId && evt.payload.message) {
          setRun((prev) => {
            if (!prev) return null;
            const newMsg = evt.payload.message as any;
            const exists = prev.messages.some((m) => m.id === newMsg.id);
            if (exists) return prev;
            return {
              ...prev,
              messages: [...prev.messages, newMsg],
            };
          });
        }
      }),
      subscribe('plan.updated', (evt) => {
        if (evt.sessionId === activeRunId && Array.isArray(evt.payload.plan)) {
          setRun((prev) => (prev ? { ...prev, activePlan: evt.payload.plan as any } : null));
        }
      }),
      subscribe('approval.requested', (evt) => {
        if (evt.sessionId === activeRunId && evt.payload.approval) {
          setRun((prev) => (prev ? { ...prev, pendingApprovals: [...prev.pendingApprovals, evt.payload.approval as any] } : null));
        }
      }),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [activeRunId, loadRun, subscribe]);

  const setWorkspaceTab = (tab: 'preview' | 'files' | 'diff' | 'terminal' | 'tests' | 'infra') => {
    setRun((prev) => (prev ? { ...prev, activeWorkspaceTab: tab } : null));
  };

  return {
    runId: activeRunId,
    run,
    setRun,
    isLoading,
    error,
    reload: loadRun,
    setWorkspaceTab,
  };
}
