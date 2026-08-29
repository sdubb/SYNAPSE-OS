import React from 'react';
import { useTask, useRuns } from '../../hooks/useApi.js';
import {
  ArrowLeft,
  CheckSquare,
  Bot,
  Play,
  Clock,
  RotateCw,
  GitBranch,
  Layers,
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Button, StatusBadge, PriorityBadge, MetricCard } from '../../components/ui/index.js';

interface TaskDetailPageProps {
  taskId?: string;
  onBack?: () => void;
  onStartRun?: (taskId: string) => void;
  onSelectRun?: (runId: string) => void;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({
  taskId = 'tsk-chk-101',
  onBack,
  onStartRun,
  onSelectRun,
}) => {
  const { task, loading } = useTask(taskId);
  const { runs } = useRuns();

  if (loading || !task) {
    return (
      <div className="flex items-center justify-center py-24">
        <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const relatedRuns = runs.filter((r) => r.taskId === task.id || r.id === task.currentRunId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              <span className="text-xs font-mono text-slate-500">Task ID: {task.id}</span>
            </div>

            <h1 className="text-xl font-bold text-slate-100">{task.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
              <span>
                Assigned: <strong className="text-cyan-300">{task.assignedAgentName || 'Unassigned'}</strong>
              </span>
              <span>
                Workspace: <strong className="text-slate-300">{task.workspaceName || 'Default'}</strong>
              </span>
              <span>
                Progress: <strong className="text-slate-200">{task.progressPercent}%</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => onStartRun?.(task.id)}
            >
              Start Execution Run
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Objective & Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Objective & Instructions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              Objective & Scope
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">{task.objective}</p>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Execution Instructions:
              </span>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {task.instructions || 'No explicit instructions provided.'}
              </pre>
            </div>

            {/* Success Criteria */}
            {task.successCriteria && task.successCriteria.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Success Criteria:
                </span>
                <div className="space-y-1">
                  {task.successCriteria.map((sc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{sc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dependency DAG Visualization */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Task Dependency DAG Graph
            </h3>

            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-around gap-4 font-mono text-xs">
              {/* Upstream blocker */}
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-center space-y-1">
                <span className="text-[10px] text-slate-500 block">UPSTREAM TASK</span>
                <span className="text-slate-200 font-semibold block">Checkout Diagnostic</span>
                <span className="text-[10px] text-emerald-400">✓ COMPLETED</span>
              </div>

              <div className="flex items-center gap-1 text-cyan-400 font-bold">
                <span>────────▶</span>
              </div>

              {/* Current Task */}
              <div className="p-4 bg-cyan-950/40 border-2 border-cyan-500 rounded-xl text-center space-y-1 shadow-lg shadow-cyan-950/40">
                <span className="text-[10px] text-cyan-300 font-bold block">CURRENT TASK</span>
                <span className="text-slate-100 font-bold block truncate max-w-xs">{task.title}</span>
                <StatusBadge status={task.status} size="sm" />
              </div>

              <div className="flex items-center gap-1 text-slate-600 font-bold">
                <span>────────▶</span>
              </div>

              {/* Downstream Task */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1 opacity-60">
                <span className="text-[10px] text-slate-500 block">DEPENDENT TASK</span>
                <span className="text-slate-300 font-semibold block">Deploy Canary Release</span>
                <span className="text-[10px] text-slate-500">BLOCKED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Execution History */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Task Execution History ({relatedRuns.length})
            </h3>

            {relatedRuns.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono py-4 text-center">
                No executions recorded yet.
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                {relatedRuns.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onSelectRun?.(r.id)}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge status={r.status} size="sm" />
                      <span className="text-emerald-400 font-bold">${r.tokenUsage.estimatedCostUsd.toFixed(3)}</span>
                    </div>
                    <h5 className="font-sans font-semibold text-slate-200 text-xs">{r.title}</h5>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{r.agentName}</span>
                      <span>{Math.floor(r.durationSeconds / 60)}m {r.durationSeconds % 60}s</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
