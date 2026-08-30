import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Cpu, Zap, AlertTriangle } from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { useTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={cn('text-sm text-slate-200', mono && 'font-mono')}>{value || '—'}</span>
    </div>
  );
}

export function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useSession(id);
  const { data: tasks } = useTasks();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-6 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-sm">
          {error?.message || 'Session not found. This resource may not exist in the backend.'}
        </div>
      </div>
    );
  }

  const relatedTasks = (tasks || []).filter((t) => t.missionId === session.taskId);

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Command Center
      </button>

      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-mono">
              {session.title || `Session ${session.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Session ID: {session.id}
            </p>
          </div>
          <span className={cn(
            'px-3 py-1 rounded-full text-xs font-medium border',
            session.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
            session.status === 'completed' ? 'bg-slate-500/10 text-slate-400 border-slate-500/30' :
            session.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
            'bg-amber-500/10 text-amber-400 border-amber-500/30'
          )}>
            {session.status}
          </span>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Session Details</h2>
        <div className="space-y-0">
          <InfoRow label="Agent ID" value={session.agentId} mono />
          <InfoRow label="Workspace ID" value={session.workspaceId} mono />
          <InfoRow label="Runtime ID" value={session.runtimeId} mono />
          <InfoRow label="Cline Session" value={session.clineSessionId} mono />
          <InfoRow label="Status" value={session.status} />
          <InfoRow label="Started" value={session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'} />
          <InfoRow label="Created" value={new Date(session.createdAt).toLocaleString()} />
          <InfoRow label="Updated" value={new Date(session.updatedAt).toLocaleString()} />
        </div>
      </div>

      {/* Token Usage */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Token Usage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100 font-mono">
              {session.tokenUsage.promptTokens.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Prompt Tokens</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100 font-mono">
              {session.tokenUsage.completionTokens.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Completion Tokens</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400 font-mono">
              ${session.tokenUsage.estimatedCostUsd.toFixed(4)}
            </p>
            <p className="text-xs text-slate-500">Estimated Cost</p>
          </div>
        </div>
      </div>

      {/* Runtime Metadata */}
      {session.runtimeMetadata && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Runtime</h2>
          <div className="space-y-0">
            <InfoRow label="Host Mode" value={session.runtimeMetadata.hostMode} />
            <InfoRow label="Working Directory" value={session.runtimeMetadata.workingDirectory} mono />
            {session.runtimeMetadata.hostname && <InfoRow label="Hostname" value={session.runtimeMetadata.hostname} />}
            {session.runtimeMetadata.pid && <InfoRow label="PID" value={String(session.runtimeMetadata.pid)} />}
            {session.runtimeMetadata.nodeVersion && <InfoRow label="Node Version" value={session.runtimeMetadata.nodeVersion} />}
            {session.runtimeMetadata.osPlatform && <InfoRow label="Platform" value={session.runtimeMetadata.osPlatform} />}
            {session.runtimeMetadata.gitBranch && <InfoRow label="Git Branch" value={session.runtimeMetadata.gitBranch} mono />}
            {session.runtimeMetadata.gitCommitSha && <InfoRow label="Git Commit" value={session.runtimeMetadata.gitCommitSha} mono />}
          </div>
        </div>
      )}
    </div>
  );
}
