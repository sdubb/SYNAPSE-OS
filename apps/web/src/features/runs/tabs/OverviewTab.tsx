import React from 'react';
import { RunItem } from '../../../types/index.js';
import { StatusBadge, MetricCard } from '../../../components/ui/index.js';
import {
  Cpu,
  Clock,
  Coins,
  Bot,
  Layers,
  GitBranch,
  Terminal,
  Server,
  FolderGit2,
  CheckCircle2,
  Activity,
} from 'lucide-react';

export const OverviewTab: React.FC<{ run: RunItem }> = ({ run }) => {
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Execution Status"
          value={<StatusBadge status={run.status} size="sm" />}
          subtitle={`Session ID: ${run.clineSessionId.slice(0, 14)}`}
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Duration"
          value={formatDuration(run.durationSeconds)}
          subtitle={`Started ${new Date(run.startedAt).toLocaleTimeString()}`}
          icon={<Clock className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Tokens"
          value={run.tokenUsage.totalTokens.toLocaleString()}
          subtitle={`Prompt: ${run.tokenUsage.promptTokens.toLocaleString()} | Comp: ${run.tokenUsage.completionTokens.toLocaleString()}`}
          icon={<Cpu className="w-5 h-5" />}
        />
        <MetricCard
          title="Monetary Cost"
          value={`$${run.tokenUsage.estimatedCostUsd.toFixed(4)}`}
          subtitle="Model billing telemetry"
          icon={<Coins className="w-5 h-5" />}
        />
      </div>

      {/* Active Step Banner */}
      {run.activeStep && (
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
          <Activity className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-300 block mb-1">
              Active Control Plane Step
            </span>
            <p className="text-sm text-slate-200">{run.activeStep}</p>
          </div>
        </div>
      )}

      {/* Two Column Metadata Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent & Task Context */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            Agent & Mission Context
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Assigned Agent</span>
              <span className="text-slate-200 font-medium">{run.agentName}</span>
              <span className="text-xs text-slate-400 block mt-0.5">{run.agentRole}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Workspace</span>
              <span className="text-slate-200 font-medium">{run.workspaceName || 'Default Workspace'}</span>
            </div>

            {run.missionTitle && (
              <div className="col-span-2">
                <span className="text-xs text-slate-400 block mb-0.5">Mission Objective</span>
                <span className="text-slate-200">{run.missionTitle}</span>
              </div>
            )}

            {run.taskTitle && (
              <div className="col-span-2">
                <span className="text-xs text-slate-400 block mb-0.5">Task Description</span>
                <span className="text-slate-200">{run.taskTitle}</span>
              </div>
            )}

            <div className="col-span-2 flex flex-wrap gap-1.5 pt-2">
              {run.tags.map((tag) => (
                <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Runtime & Infrastructure Metadata */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Runtime & Environment Metadata
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Host Mode</span>
              <span className="text-slate-200 font-mono capitalize">{run.runtimeMetadata.hostMode}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Node Hostname</span>
              <span className="text-slate-200 font-mono text-xs truncate block">{run.runtimeMetadata.hostname || 'localhost'}</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Runtime Engine / OS</span>
              <span className="text-slate-200 font-mono text-xs">{run.runtimeMetadata.nodeVersion || 'v22.20'} ({run.runtimeMetadata.osPlatform || 'linux'})</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Process PID</span>
              <span className="text-slate-200 font-mono">{run.runtimeMetadata.pid || 4892}</span>
            </div>

            <div className="col-span-2">
              <span className="text-xs text-slate-400 block mb-0.5">Working Directory</span>
              <span className="text-slate-300 font-mono text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800 block truncate">
                {run.runtimeMetadata.workingDirectory}
              </span>
            </div>

            {run.runtimeMetadata.gitBranch && (
              <div className="col-span-2 flex items-center justify-between text-xs font-mono bg-slate-950/80 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                  {run.runtimeMetadata.gitBranch}
                </span>
                <span className="text-slate-400">
                  SHA: <span className="text-cyan-300">{run.runtimeMetadata.gitCommitSha || 'HEAD'}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkpoints Sequence */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Execution Checkpoints ({run.checkpoints.length})
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {run.checkpoints.map((chk, idx) => (
            <div
              key={chk}
              className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border ${
                chk === run.lastCheckpointId
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 font-semibold'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {idx + 1}. {chk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
