import { useState, useEffect, useCallback } from 'react';
import { api, apiClient } from '../api/client';
import { ActiveMetrics, ActiveWorkItem, AttentionItem, RecentWorkItem, RunSession } from '../types/run';
import { useWebSocket } from '../realtime/WebSocketProvider';

export function useRuns(params?: { agentId?: string; status?: string }) {
  const [metrics, setMetrics] = useState<ActiveMetrics>({
    running: 0,
    waiting: 0,
    verifying: 0,
    todayTotal: 0,
  });
  const [activeWork, setActiveWork] = useState<ActiveWorkItem[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [recentWork, setRecentWork] = useState<RecentWorkItem[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const { subscribe } = useWebSocket();

  const reloadData = useCallback(async () => {
    try {
      const [m, aw, att, rw, sessions] = await Promise.all([
        apiClient.getActiveMetrics(),
        apiClient.getActiveWork(),
        apiClient.getAttentionItems(),
        apiClient.getRecentWork(),
        api.getSessions(params).catch(() => []),
      ]);
      setMetrics(m);
      setActiveWork(aw);
      setAttentionItems(att);
      setRecentWork(rw as RecentWorkItem[]);
      setRuns(sessions);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    reloadData();

    const unsubs = [
      subscribe('run.created', reloadData),
      subscribe('run.completed', reloadData),
      subscribe('run.failed', reloadData),
      subscribe('approval.requested', reloadData),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [reloadData, subscribe]);

  const startTask = async (goalOrData: string | Record<string, any>): Promise<any> => {
    setIsCreating(true);
    try {
      let newRun: any;
      if (typeof goalOrData === 'string') {
        newRun = await apiClient.createRun(goalOrData, 'task');
      } else {
        newRun = await api.createSession(goalOrData);
      }
      await reloadData();
      return newRun;
    } finally {
      setIsCreating(false);
    }
  };

  const createAgent = async (goal: string): Promise<RunSession> => {
    const newRun = await apiClient.createRun(goal, 'agent');
    await reloadData();
    return newRun;
  };

  const createTeam = async (goal: string): Promise<RunSession> => {
    const newRun = await apiClient.createRun(goal, 'team');
    await reloadData();
    return newRun;
  };

  const exploreWorld = async (goal: string): Promise<RunSession> => {
    const newRun = await apiClient.createRun(goal, 'world');
    await reloadData();
    return newRun;
  };

  return {
    metrics,
    activeWork,
    attentionItems,
    recentWork,
    runs,
    isLoading,
    isCreating,
    isError: false,
    error: null,
    reloadData,
    refetch: reloadData,
    startTask,
    createAgent,
    createTeam,
    exploreWorld,
    createRun: startTask,
  };
}

export { useRun } from './useRun.js';
