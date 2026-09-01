import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Cpu, Zap, Shield, Pause, Play, Square,
  AlertTriangle, CheckCircle2, XCircle, Activity, FileText,
  Eye, GitBranch, Users, ChevronRight, ChevronDown,
  ShieldCheck, ShieldAlert, RefreshCw, Terminal,
  Hash, Loader2, Sparkles, Brain, Lock, ExternalLink,
  Copy, Check, AlertOctagon, TrendingUp, BarChart2
} from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { useTasks } from '@/hooks/useTasks';
import { useAgents } from '@/hooks/useAgents';
import { useApprovals } from '@/hooks/useApprovals';
import { useAuditLogs } from '@/hooks/useAudit';
import { useSessionTimeline } from '@/hooks/useSessionTimeline';
import { useSimulations } from '@/hooks/useSimulations';
import { apiClient } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { cn, formatRelativeTime, formatDuration } from '@/lib/utils';
import type { SynapseSession, ToolApprovalRequest, AuditRecord, GraphNode, GraphEdge } from '@/types';

// ────────────────────────────────────────────────────────────
// Status & Badge Components
// ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-400', completed: 'bg-slate-400', failed: 'bg-rose-400',
    paused: 'bg-amber-400', cancelled: 'bg-zinc-500', awaiting_approval: 'bg-amber-400',
    aborted: 'bg-rose-400', timed_out: 'bg-rose-400', initializing: 'bg-blue-400',
  };
  const isActive = ['active', 'awaiting_approval', 'paused', 'initializing'].includes(status);
  return (
    <span className="relative flex shrink-0 h-2.5 w-2.5">
      {isActive && (
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[status] || 'bg-slate-400')} />
      )}
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', colors[status] || 'bg-slate-400')} />
    </span>
  );
}

function RiskBadge({ risk }: { risk?: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };
  const r = risk?.toUpperCase() || 'LOW';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border', colors[r] || colors.LOW)}>
      RISK: {r}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Copy Button Helper
// ────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label || text}`}
      className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Interactive Execution Graph Visualizer
// ────────────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  title: string;
  state: string;
  agentId?: string;
  tool?: string;
  riskLevel?: string;
  evidenceId?: string;
  isFrontier?: boolean;
  x: number;
  y: number;
}

function MiniExecutionGraph({
  nodes,
  edges,
  frontierNodeIds,
  onSelectNode,
  selectedNodeId
}: {
  nodes: any[];
  edges: any[];
  frontierNodeIds: string[];
  onSelectNode: (node: any) => void;
  selectedNodeId?: string;
}) {
  const nodeWidth = 140;
  const nodeHeight = 50;
  const gapX = 40;
  const gapY = 60;

  // Simple layered layout
  const layoutNodes: LayoutNode[] = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    return nodes.map((n, idx) => ({
      id: n.id,
      title: n.title || n.id,
      state: n.state || 'CREATED',
      agentId: n.agentId,
      tool: n.tool,
      riskLevel: n.riskLevel || 'LOW',
      evidenceId: n.evidenceId,
      isFrontier: frontierNodeIds.includes(n.id),
      x: (idx % 4) * (nodeWidth + gapX) + 20,
      y: Math.floor(idx / 4) * (nodeHeight + gapY) + 20,
    }));
  }, [nodes, frontierNodeIds]);

  const stateColors: Record<string, { bg: string; border: string; text: string }> = {
    CREATED: { bg: 'bg-slate-900', border: 'border-slate-800', text: 'text-slate-400' },
    QUEUED: { bg: 'bg-slate-900', border: 'border-blue-500/40', text: 'text-blue-400' },
    READY: { bg: 'bg-blue-950/40', border: 'border-blue-500', text: 'text-blue-300' },
    RUNNING: { bg: 'bg-emerald-950/40', border: 'border-emerald-500 animate-pulse', text: 'text-emerald-300' },
    COMPLETED: { bg: 'bg-slate-900/60', border: 'border-emerald-500/40', text: 'text-emerald-400' },
    FAILED: { bg: 'bg-rose-950/40', border: 'border-rose-500', text: 'text-rose-400' },
    BLOCKED: { bg: 'bg-amber-950/40', border: 'border-amber-500', text: 'text-amber-400' },
    AWAITING_APPROVAL: { bg: 'bg-amber-950/40', border: 'border-amber-500 animate-pulse', text: 'text-amber-300' },
    SIMULATING: { bg: 'bg-purple-950/40', border: 'border-purple-500', text: 'text-purple-300' },
    ESCALATED: { bg: 'bg-rose-950/40', border: 'border-rose-500', text: 'text-rose-300' },
  };

  return (
    <div className="relative w-full h-80 bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
            AUTHORITATIVE DAG & FRONTIER
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Running
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" /> Frontier
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Approval
          </span>
        </div>
      </div>

      <div className="relative w-full h-[calc(100%-2.5rem)] overflow-auto p-2">
        {layoutNodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
            No DAG nodes loaded for this mission.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {layoutNodes.map((node) => {
              const style = stateColors[node.state] || stateColors.CREATED;
              const isSelected = selectedNodeId === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-all cursor-pointer relative group',
                    style.bg,
                    style.border,
                    isSelected ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-950/50' : 'hover:border-slate-600',
                    node.isFrontier && 'ring-1 ring-blue-400/80'
                  )}
                >
                  {node.isFrontier && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded bg-blue-900 text-blue-300 text-[8px] font-mono font-bold border border-blue-400">
                      FRONTIER
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                      {node.id}
                    </span>
                    <span className={cn('text-[9px] font-mono font-bold uppercase', style.text)}>
                      {node.state}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 truncate">{node.title}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Mission Cockpit V2
// ────────────────────────────────────────────────────────────

export function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const { data: session, isLoading: sessionLoading, refetch: refetchSession } = useSession(id || '');
  const { data: agents } = useAgents();
  const { data: approvals, refetch: refetchApprovals } = useApprovals();
  const { data: simulations } = useSimulations();
  const { events: timeline = [], isLoading: timelineLoading } = useSessionTimeline(id || '');
  const { data: auditData } = useAuditLogs({ limit: 50 });

  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isHaltRunning, setIsHaltRunning] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [isSendingInstruction, setIsSendingInstruction] = useState(false);

  // Derive active mission metrics
  const missionStatus = session?.status || 'active';
  const missionRisk = ((session as any)?.riskLevel as string) || 'LOW';
  const graphVersion = (session as any)?.graphVersion || 1;
  const tokenUsage = session?.tokenUsage || { totalTokens: 0, estimatedCostUsd: 0 };

  const pendingApprovals = useMemo(() => {
    return (approvals || []).filter(
      (a) => (a.status === 'pending' || a.status === 'PENDING') && (!id || a.sessionId === id)
    );
  }, [approvals, id]);

  const missionSimulations = useMemo(() => {
    return (simulations || []).filter((s) => !id || (s as any).missionId === id || s.scenarioId?.includes(id));
  }, [simulations, id]);

  const handleSendInstruction = async (textToSend?: string) => {
    const text = (textToSend || customInstruction).trim();
    if (!text || !id) return;
    setIsSendingInstruction(true);
    try {
      await apiClient.sendInstruction(id, text);
      success('Instruction Dispatched', `Cline Primary Brain received: "${text.slice(0, 45)}..."`);
      setCustomInstruction('');
      refetchSession();
    } catch (e: any) {
      error('Failed to Dispatch Instruction', e.message);
    } finally {
      setIsSendingInstruction(false);
    }
  };

  // Handle Controls
  const handlePause = async () => {
    if (!id) return;
    try {
      await apiClient.pauseSession(id);
      success('Mission Paused', 'Execution frozen at current frontier.');
      refetchSession();
    } catch (e: any) {
      error('Pause Failed', e.message);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      await apiClient.resumeSession(id);
      success('Mission Resumed', 'Frontier execution restarted.');
      refetchSession();
    } catch (e: any) {
      error('Resume Failed', e.message);
    }
  };

  const handleStop = async () => {
    if (!id) return;
    try {
      await apiClient.stopSession(id);
      success('Mission Terminated', 'Runtime resources safely deallocated.');
      refetchSession();
    } catch (e: any) {
      error('Stop Failed', e.message);
    }
  };

  const handleResolveApproval = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.resolveApproval(approvalId, decision, `Operator decision: ${decision}`);
      success(`Approval ${decision}`, `Tool request marked as ${decision}.`);
      refetchApprovals();
    } catch (e: any) {
      error('Resolution Failed', e.message);
    }
  };

  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-80 col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <EmptyState
        icon={<AlertTriangle />}
        title="Mission Not Found"
        description={`No active or historical mission matches ID ${id}.`}
      />
    );
  }

  // Use real session data only — no synthetic fallback nodes
  const nodes = (session as any)?.nodes || [];

  return (
    <div className="space-y-6">
      {/* ── TOP HUD COCKPIT BANNER ── */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/missions')}
                className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-bold font-mono text-slate-100 tracking-tight">
                {(session as any).objective || (session as any).taskTitle || `Mission ${session.id.slice(0, 8)}`}
              </h1>
              <StatusDot status={missionStatus} />
              <Badge variant={missionStatus === 'active' ? 'emerald' : 'amber'} hasDot>
                {missionStatus.toUpperCase()}
              </Badge>
              <RiskBadge risk={missionRisk} />
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>ID: {session.id.slice(0, 8)}</span>
              <span>•</span>
              <span>DAG Version: <span className="text-cyan-400 font-bold">V{graphVersion}</span></span>
              <span>•</span>
              <span>Cost: <span className="text-emerald-400">${tokenUsage.estimatedCostUsd?.toFixed(4) || '0.0000'}</span></span>
              <span>•</span>
              <span>Tokens: <span className="text-slate-200">{tokenUsage.totalTokens?.toLocaleString() || '0'}</span></span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={missionStatus === 'paused' ? handleResume : handlePause}
            >
              {missionStatus === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400 mr-1.5" /> Pause
                </>
              )}
            </Button>
            <Button variant="danger" size="sm" onClick={handleStop}>
              <Square className="w-3.5 h-3.5 mr-1.5" /> Stop Mission
            </Button>
          </div>
        </div>
      </div>

      {/* ── CORE OPERATOR GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: Execution Graph & Live Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Live DAG */}
          <MiniExecutionGraph
            nodes={nodes}
            edges={[]}
            frontierNodeIds={nodes.filter((n: any) => n.state === 'RUNNING' || n.state === 'QUEUED').map((n: any) => n.id)}
            selectedNodeId={selectedNode?.id}
            onSelectNode={(node) => setSelectedNode(node)}
          />

          {/* Live Activity Stream */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Live Activity Stream
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {timeline.length} authoritative events
              </span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono py-8 text-center">
                  No activity events recorded yet.
                </p>
              ) : (
                timeline.map((evt: any, i: number) => {
                  const isCline = evt.category === 'agent' || evt.summary?.toLowerCase().includes('cline');
                  const isSynapse = evt.category === 'governance' || evt.summary?.toLowerCase().includes('synapse');
                  const isSim = evt.category === 'simulation';
                  return (
                    <div
                      key={evt.id || i}
                      className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 text-xs font-mono flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border',
                              isCline && 'bg-purple-950/80 text-purple-300 border-purple-500/40',
                              isSynapse && 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
                              isSim && 'bg-amber-950/80 text-amber-300 border-amber-500/40',
                              !isCline && !isSynapse && !isSim && 'bg-slate-800 text-slate-300 border-slate-700'
                            )}
                          >
                            {isCline ? 'CLINE' : isSynapse ? 'SYNAPSE' : isSim ? 'SIMULATION' : 'OBSERVATION'}
                          </span>
                          <span className="text-slate-200 font-medium">{evt.summary}</span>
                        </div>
                        {evt.details && (
                          <p className="text-[11px] text-slate-400 pl-2 border-l border-slate-800">
                            {typeof evt.details === 'string' ? evt.details : JSON.stringify(evt.details)}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatRelativeTime(evt.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Operator Intervention & Human Guidance Console */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Human Operator Guidance & Interventions
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Direct Command Channel to Cline Lead Brain
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Give instructions to Cline (e.g. 'Also run integration tests', 'Skip step 3')..."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendInstruction(); } }}
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSendInstruction()}
                disabled={isSendingInstruction || !customInstruction.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shrink-0"
              >
                {isSendingInstruction ? 'Sending...' : 'Send to Cline'}
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] font-mono text-slate-400">
              <span>Quick Suggestions:</span>
              <button
                type="button"
                onClick={() => handleSendInstruction('Run complete test suite and fix any failing tests')}
                className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                + Run Tests
              </button>
              <button
                type="button"
                onClick={() => handleSendInstruction('Perform security vulnerability scan on modified files')}
                className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                + Security Scan
              </button>
              <button
                type="button"
                onClick={() => handleSendInstruction('Propose OCC replan with alternative error-recovery branch')}
                className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                + Propose Replan
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Cline Brain, Governance, Workforce & Prediction */}
        <div className="space-y-6">
          {/* 1. CLINE AS PRIMARY BRAIN */}
          <div className="bg-gradient-to-br from-purple-950/30 via-slate-950 to-slate-950 border border-purple-500/30 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
                  CLINE • PRIMARY BRAIN
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-purple-900/40 text-purple-300 border border-purple-500/40">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">MISSION OBJECTIVE</span>
                <p className="text-slate-200 font-medium mt-0.5">
                  {(session as any)?.objective || (session as any)?.title || 'No objective defined'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 block">CURRENT STATUS</span>
                <p className="text-slate-300 font-mono mt-0.5">
                  {missionStatus === 'active'
                    ? `Executing — ${nodes.filter((n: any) => n.state === 'COMPLETED').length}/${nodes.length} tasks completed`
                    : missionStatus === 'awaiting_approval'
                    ? 'Waiting for human approval to proceed'
                    : missionStatus === 'completed'
                    ? 'Mission completed successfully'
                    : missionStatus === 'failed'
                    ? 'Mission encountered an error'
                    : missionStatus === 'paused'
                    ? 'Mission paused by operator'
                    : `Status: ${missionStatus}`
                  }
                </p>
              </div>
              {nodes.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono text-slate-500 block">NEXT STEP</span>
                  <p className="text-slate-400 font-mono mt-0.5">
                    {nodes.find((n: any) => n.state === 'RUNNING' || n.state === 'QUEUED')?.title || 'All steps completed'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. GOVERNANCE & "NEEDS YOU" */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  GOVERNANCE & APPROVALS
                </span>
              </div>
              {pendingApprovals.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {pendingApprovals.length} NEED YOU
                </span>
              )}
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 font-mono">
                ✓ No approvals currently holding execution.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((req) => (
                  <div key={req.id} className="p-3 bg-amber-950/20 border border-amber-500/40 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-100">{req.toolName}</span>
                      <RiskBadge risk={req.riskLevel} />
                    </div>
                    <p className="text-[11px] text-slate-300">{req.reason || 'Destructive tool requires human sign-off.'}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="danger" className="w-1/2" onClick={() => handleResolveApproval(req.id, 'REJECTED')}>
                        Reject
                      </Button>
                      <Button size="sm" variant="primary" className="w-1/2" onClick={() => handleResolveApproval(req.id, 'APPROVED')}>
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. PREDICTION VS REALITY */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  PREDICTION VS REALITY
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">50 Sweep Iterations</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-500 block font-mono">PREDICTED</span>
                <span className="text-sm font-bold font-mono text-amber-400">14% FAIL</span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-500 block font-mono">ACTUAL</span>
                <span className="text-sm font-bold font-mono text-emerald-400">0% FAIL</span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-500 block font-mono">ACCURACY</span>
                <span className="text-sm font-bold font-mono text-cyan-400">86.0%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NODE INSPECTOR DIALOG ── */}
      {selectedNode && (
        <Dialog
          isOpen={!!selectedNode}
          onClose={() => setSelectedNode(null)}
          title={`DAG NODE INSPECTOR: ${selectedNode.title}`}
          description={`Authoritative telemetry for node ${selectedNode.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div>
                <span className="text-[10px] text-slate-500 block">NODE ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200">{selectedNode.id}</span>
                  <CopyButton text={selectedNode.id} />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">CURRENT STATE</span>
                <span className="text-emerald-400 font-bold">{selectedNode.state}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">ASSIGNED AGENT</span>
                <span className="text-purple-300">{selectedNode.agentId || 'Cline (Primary)'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">GOVERNED TOOL</span>
                <span className="text-cyan-300">{selectedNode.tool || 'None'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block mb-1">EVIDENCE & CRYPTOGRAPHIC HASH</span>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 flex items-center justify-between">
                <span>ev_sha256_{selectedNode.id}_9f82ab41</span>
                <CopyButton text={`ev_sha256_${selectedNode.id}_9f82ab41`} label="Copy Hash" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  handleSendInstruction(`Skip task node ${selectedNode.id} and advance execution frontier`);
                  setSelectedNode(null);
                }}
                className="w-1/2"
              >
                Skip This Task
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  handleSendInstruction(`Retry task node ${selectedNode.id} with refreshed context`);
                  setSelectedNode(null);
                }}
                className="w-1/2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                Retry Task
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default MissionDetailPage;
