import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, HardDrive, Terminal, GitBranch, Clock } from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

function InfoBlock({ label, value, icon, mono, highlight }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn(
        'text-sm break-all',
        mono && 'font-mono text-cyan-300',
        highlight ? 'text-emerald-400 font-medium' : 'text-slate-200'
      )}>
        {value || '—'}
      </p>
    </div>
  );
}

export function RuntimeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useSession(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
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
          {error?.message || 'No runtime information available for this session.'}
        </div>
      </div>
    );
  }

  const meta = session.runtimeMetadata;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Command Center
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-100">Runtime Details</h1>
        <p className="text-sm text-slate-400 mt-1">
          Session: {session.id.slice(0, 8)} · {session.title || 'Untitled'}
        </p>
      </div>

      {/* Runtime Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Runtime Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className={cn(
              'text-lg font-bold font-mono',
              session.status === 'active' ? 'text-emerald-400' :
              session.status === 'completed' ? 'text-slate-400' :
              session.status === 'failed' ? 'text-rose-400' : 'text-amber-400'
            )}>
              {session.status.toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">STATUS</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-200 font-mono">{session.tokenUsage.totalTokens.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 mt-1">TOTAL TOKENS</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-400 font-mono">${session.tokenUsage.estimatedCostUsd.toFixed(4)}</p>
            <p className="text-[10px] text-slate-500 mt-1">EST. COST</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-200 font-mono">{session.activeCheckpoints?.length || 0}</p>
            <p className="text-[10px] text-slate-500 mt-1">CHECKPOINTS</p>
          </div>
        </div>
      </div>

      {/* Environment */}
      {meta && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Environment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoBlock label="Host Mode" value={meta.hostMode} icon={<Cpu className="w-3 h-3 text-slate-500" />} highlight />
            <InfoBlock label="Working Directory" value={meta.workingDirectory} icon={<HardDrive className="w-3 h-3 text-slate-500" />} mono />
            {meta.hostname && <InfoBlock label="Hostname" value={meta.hostname} icon={<Terminal className="w-3 h-3 text-slate-500" />} mono />}
            {meta.pid && <InfoBlock label="Process ID" value={String(meta.pid)} icon={<Cpu className="w-3 h-3 text-slate-500" />} mono />}
            {meta.nodeVersion && <InfoBlock label="Node.js Version" value={meta.nodeVersion} icon={<Terminal className="w-3 h-3 text-slate-500" />} mono />}
            {meta.osPlatform && <InfoBlock label="OS Platform" value={meta.osPlatform} icon={<HardDrive className="w-3 h-3 text-slate-500" />} />}
            {meta.gitBranch && <InfoBlock label="Git Branch" value={meta.gitBranch} icon={<GitBranch className="w-3 h-3 text-slate-500" />} mono />}
            {meta.gitCommitSha && <InfoBlock label="Git Commit" value={meta.gitCommitSha} icon={<GitBranch className="w-3 h-3 text-slate-500" />} mono />}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Timeline</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
            <span className="text-xs text-slate-500">Created</span>
            <span className="text-xs text-slate-200 font-mono">{new Date(session.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
            <span className="text-xs text-slate-500">Started</span>
            <span className="text-xs text-slate-200 font-mono">{session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
            <span className="text-xs text-slate-500">Last Updated</span>
            <span className="text-xs text-slate-200 font-mono">{new Date(session.updatedAt).toLocaleString()}</span>
          </div>
          {session.endedAt && (
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">Ended</span>
              <span className="text-xs text-slate-200 font-mono">{new Date(session.endedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
