import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';
import {
  RunItem,
  TimelineEvent,
  ConversationMessage,
  ToolExecution,
  FileRecord,
  CodeDiff,
  ApprovalItem,
  RunUsageReport,
  VerificationRun,
  AuditRecord,
  AgentItem,
  TaskItem,
  TeamItem,
  TeamTopologyData,
} from '../types/index.js';

// ==========================================
// RUNS HOOKS
// ==========================================

export function useRuns() {
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getRuns();
      setRuns(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, loading, error, refetch: fetchRuns };
}

export function useRun(runId: string) {
  const [run, setRun] = useState<RunItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const data = await apiClient.getRunById(runId);
      setRun(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch run detail');
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  return { run, loading, error, refetch: fetchRun };
}

export function useRunDetails(runId: string) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [tools, setTools] = useState<ToolExecution[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [changes, setChanges] = useState<CodeDiff[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [usage, setUsage] = useState<RunUsageReport | null>(null);
  const [verification, setVerification] = useState<VerificationRun | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const [
        timelineData,
        conversationData,
        toolsData,
        filesData,
        changesData,
        approvalsData,
        usageData,
        verificationData,
        auditData,
      ] = await Promise.all([
        apiClient.getRunTimeline(runId),
        apiClient.getRunConversation(runId),
        apiClient.getRunTools(runId),
        apiClient.getRunFiles(runId),
        apiClient.getRunChanges(runId),
        apiClient.getRunApprovals(runId),
        apiClient.getRunUsage(runId),
        apiClient.getRunVerification(runId),
        apiClient.getRunAuditTrail(runId),
      ]);

      setTimeline(timelineData);
      setConversation(conversationData);
      setTools(toolsData);
      setFiles(filesData);
      setChanges(changesData);
      setApprovals(approvalsData);
      setUsage(usageData);
      setVerification(verificationData);
      setAuditTrail(auditData);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    timeline,
    conversation,
    tools,
    files,
    changes,
    approvals,
    usage,
    verification,
    auditTrail,
    loading,
    refetch: fetchDetails,
  };
}

// ==========================================
// AGENTS HOOKS
// ==========================================

export function useAgents() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAgents();
      setAgents(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgent = async (agent: Partial<AgentItem>) => {
    const created = await apiClient.createAgent(agent);
    await fetchAgents();
    return created;
  };

  return { agents, loading, error, refetch: fetchAgents, createAgent };
}

export function useAgent(agentId: string) {
  const [agent, setAgent] = useState<AgentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!agentId) return;
    try {
      setLoading(true);
      const data = await apiClient.getAgentById(agentId);
      setAgent(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, loading, error, refetch: fetchAgent };
}

// ==========================================
// TASKS HOOKS
// ==========================================

export function useTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTasks();
      setTasks(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (task: Partial<TaskItem>) => {
    const created = await apiClient.createTask(task);
    await fetchTasks();
    return created;
  };

  const updateStatus = async (id: string, status: TaskItem['status']) => {
    const updated = await apiClient.updateTaskStatus(id, status);
    await fetchTasks();
    return updated;
  };

  return { tasks, loading, error, refetch: fetchTasks, createTask, updateStatus };
}

export function useTask(taskId: string) {
  const [task, setTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const data = await apiClient.getTaskById(taskId);
      setTask(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, loading, error, refetch: fetchTask };
}

// ==========================================
// TEAMS HOOKS
// ==========================================

export function useTeams() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTeams();
      setTeams(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const createTeam = async (team: Partial<TeamItem>) => {
    const created = await apiClient.createTeam(team);
    await fetchTeams();
    return created;
  };

  return { teams, loading, error, refetch: fetchTeams, createTeam };
}

export function useTeam(teamId: string) {
  const [team, setTeam] = useState<TeamItem | null>(null);
  const [topology, setTopology] = useState<TeamTopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const [teamData, topData] = await Promise.all([
        apiClient.getTeamById(teamId),
        apiClient.getTeamTopology(teamId),
      ]);
      setTeam(teamData);
      setTopology(topData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return { team, topology, loading, error, refetch: fetchTeam };
}

// ==========================================
// APPROVALS HOOKS
// ==========================================

export function useApprovals() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getApprovals();
      setApprovals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const resolve = async (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    const res = await apiClient.resolveApproval(id, decision, reason);
    await fetchApprovals();
    return res;
  };

  return { approvals, loading, refetch: fetchApprovals, resolve };
}
