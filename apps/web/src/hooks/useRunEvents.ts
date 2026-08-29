import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useWebSocket } from '../realtime/WSConnectionProvider';
import { SynapseRealtimeEvent } from '@/types';
import { RunSession, ConversationMessage } from '../types/run';

export function useRunEvents(
  runId?: string,
  onUpdate?: () => void,
  setRun?: React.Dispatch<React.SetStateAction<RunSession | null>>
) {
  const [events, setEvents] = useState<SynapseRealtimeEvent[]>([]);
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    if (!runId) return;
    const unsub = subscribe('*', (evt) => {
      if (!evt.sessionId || evt.sessionId === runId) {
        setEvents((prev) => [evt, ...prev.slice(0, 99)]);
        onUpdate?.();
      }
    });

    return () => {
      unsub();
    };
  }, [runId, subscribe, onUpdate]);

  const sendInstruction = useCallback(
    async (instruction: string, attachments?: Array<{ name: string; size: string; type: string }>, provider?: string, modelId?: string) => {
      if (!runId) return;

      const userMessage: ConversationMessage = {
        id: `usr_${Date.now()}`,
        sender: 'user',
        content: instruction,
        timestamp: new Date().toISOString(),
        attachments,
      };

      // Optimistic update
      setRun?.((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, userMessage],
        };
      });

      try {
        const res: any = await apiClient.sendInstruction(runId, instruction, attachments, provider, modelId);
        if (res && Array.isArray(res.messages)) {
          setRun?.((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: res.messages,
            };
          });
        }
        setTimeout(() => {
          onUpdate?.();
        }, 300);
        return res;
      } catch (err) {
        console.error('Failed to send instruction:', err);
      }
    },
    [runId, onUpdate, setRun]
  );

  const pauseRun = useCallback(async () => {
    if (!runId) return;
    await apiClient.pauseRun(runId);
    onUpdate?.();
  }, [runId, onUpdate]);

  const resumeRun = useCallback(async () => {
    if (!runId) return;
    await apiClient.resumeRun(runId);
    onUpdate?.();
  }, [runId, onUpdate]);

  const emergencyHalt = useCallback(async () => {
    if (!runId) return;
    await apiClient.haltRun(runId);
    onUpdate?.();
  }, [runId, onUpdate]);

  const approveTool = useCallback(
    async (approvalId: string, reason?: string) => {
      const res = await apiClient.resolveApproval(approvalId, 'APPROVED', reason);
      onUpdate?.();
      return res;
    },
    [onUpdate]
  );

  const rejectTool = useCallback(
    async (approvalId: string, reason?: string) => {
      const res = await apiClient.resolveApproval(approvalId, 'REJECTED', reason);
      onUpdate?.();
      return res;
    },
    [onUpdate]
  );

  const answerQuestion = useCallback(
    async (questionId: string, answer: string) => {
      if (!runId) return;
      await apiClient.answerQuestion(runId, questionId, answer);
      onUpdate?.();
    },
    [runId, onUpdate]
  );

  return {
    events,
    connected,
    sendInstruction,
    pauseRun,
    resumeRun,
    emergencyHalt,
    approveTool,
    rejectTool,
    answerQuestion,
  };
}
