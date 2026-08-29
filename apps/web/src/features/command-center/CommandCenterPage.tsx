import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRuns } from '../../hooks/useRuns';
import {
  PlayIcon,
  BotIcon,
  UsersIcon,
  CompassIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  SearchIcon,
} from '../../components/common/Icons';
import { RunStatus } from '../../types/run';

interface CommandCenterPageProps {
  onNavigateToOperator?: (runId?: string) => void;
  onNavigateToAgents?: () => void;
  onNavigateToTeams?: () => void;
  onNavigateToWorld?: () => void;
}

export const CommandCenterPage: React.FC<CommandCenterPageProps> = ({
  onNavigateToOperator,
  onNavigateToAgents,
  onNavigateToTeams,
  onNavigateToWorld,
}) => {
  const navigate = useNavigate();
  const navOperator = onNavigateToOperator || ((id) => navigate(id ? `/operator/${id}` : '/operator'));
  const navAgents = onNavigateToAgents || (() => navigate('/agents'));
  const navTeams = onNavigateToTeams || (() => navigate('/teams'));
  const navWorld = onNavigateToWorld || (() => navigate('/world'));

  const { metrics, activeWork, attentionItems, recentWork, isLoading, startTask, createAgent, createTeam, exploreWorld } = useRuns();
  const [goalInput, setGoalInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRunTask = async () => {
    if (!goalInput.trim()) return;
    setIsSubmitting(true);
    try {
      const run = await startTask(goalInput.trim());
      setGoalInput('');
      navOperator(run.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAgent = async () => {
    if (goalInput.trim()) {
      setIsSubmitting(true);
      try {
        const run = await createAgent(goalInput.trim());
        setGoalInput('');
        navOperator(run.id);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      navAgents();
    }
  };

  const handleCreateTeam = async () => {
    if (goalInput.trim()) {
      setIsSubmitting(true);
      try {
        const run = await createTeam(goalInput.trim());
        setGoalInput('');
        navOperator(run.id);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      navTeams();
    }
  };

  const handleExploreWorld = async () => {
    if (goalInput.trim()) {
      setIsSubmitting(true);
      try {
        const run = await exploreWorld(goalInput.trim());
        setGoalInput('');
        navOperator(run.id);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      navWorld();
    }
  };

  const getStatusBadge = (status: RunStatus) => {
    switch (status) {
      case 'EXECUTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Cline working
          </span>
        );
      case 'VERIFYING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Verifying
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Approval required
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            Paused
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/80 text-blue-400 border border-blue-800/60">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto font-sans antialiased">
      {/* 1. High-Level Launchpad */}
      <div className="flex flex-col gap-6 bg-[#161b22] border border-[#30363d] rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-cyan-400 uppercase">SYNAPSE COMMAND CENTER</h2>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mt-1">Good morning</h1>
          <p className="text-slate-400 text-lg mt-1">What would you like Synapse to do?</p>
        </div>

        {/* Goal Input Box */}
        <div className="flex flex-col gap-3">
          <div className="relative group">
            <textarea
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleRunTask();
                }
              }}
              placeholder="Describe a task, investigation or goal... (e.g. 'Investigate the payment gateway timeout and fix retry logic')"
              className="w-full bg-[#0d1117] border border-[#30363d] group-hover:border-cyan-500/50 focus:border-cyan-500 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none shadow-inner min-h-[100px]"
              rows={3}
            />
            <div className="absolute right-3 bottom-3 text-xs text-slate-500 hidden sm:block">
              Press ⌘+Enter to run
            </div>
          </div>

          {/* Quick Action Triggers */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunTask}
              disabled={isSubmitting || !goalInput.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white font-medium text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <PlayIcon size={16} />
              <span>Run Task</span>
            </button>
            <button
              onClick={handleCreateAgent}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-medium text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <BotIcon size={16} />
              <span>Create Agent</span>
            </button>
            <button
              onClick={handleCreateTeam}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-medium text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UsersIcon size={16} />
              <span>Create Team</span>
            </button>
            <button
              onClick={handleExploreWorld}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-medium text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <CompassIcon size={16} />
              <span>Explore World</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Active Metrics Summary Grid */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">ACTIVE SYSTEM METRICS</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Running
            </span>
            <span className="text-3xl font-extrabold text-white">{metrics.running}</span>
            <span className="text-xs text-slate-500">Active autonomous tasks</span>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Waiting
            </span>
            <span className="text-3xl font-extrabold text-white">{metrics.waiting}</span>
            <span className="text-xs text-slate-500">Approvals & user inputs</span>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-medium text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Verifying
            </span>
            <span className="text-3xl font-extrabold text-white">{metrics.verifying}</span>
            <span className="text-xs text-slate-500">Multi-vector checks</span>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
              Today's Total
            </span>
            <span className="text-3xl font-extrabold text-white">{metrics.todayTotal}</span>
            <span className="text-xs text-slate-500">Completed executions</span>
          </div>
        </div>
      </div>

      {/* 3. Split View: Active Work vs. Attention Required */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Active Work */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ACTIVE WORK
            </h3>
            <span className="text-xs text-slate-400">{activeWork.length} live sessions</span>
          </div>

          <div className="flex flex-col gap-3 divide-y divide-[#30363d]/50">
            {activeWork.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <BotIcon size={24} className="text-slate-600" />
                <span>No active autonomous sessions running.</span>
                <span className="text-[11px] text-slate-600">Enter a goal in the prompt above and click [Run Task] to start.</span>
              </div>
            ) : (
              activeWork.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToOperator?.(item.id)}
                  className="pt-3 first:pt-0 flex items-center justify-between group cursor-pointer hover:bg-[#21262d]/50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-100 group-hover:text-cyan-400 transition-colors text-sm">
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-400">· {item.agentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {getStatusBadge(item.status)}
                      <span className="text-slate-500 truncate max-w-xs">{item.currentAction}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{item.duration}</span>
                    <ChevronRightIcon size={16} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Attention Required */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangleIcon size={16} className="text-amber-400" />
              ATTENTION REQUIRED
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {attentionItems.length} items
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {attentionItems.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <CheckCircleIcon size={24} className="text-emerald-600/60" />
                <span>No attention items required.</span>
                <span className="text-[11px] text-slate-600">All agent execution policies and verifications are in a nominal state.</span>
              </div>
            ) : (
              attentionItems.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToOperator?.(item.runId)}
                  className="p-3.5 rounded-lg bg-[#21262d]/60 border border-[#30363d] hover:border-amber-500/50 hover:bg-[#21262d] transition-all cursor-pointer flex items-start gap-3 group"
                >
                  <div className="mt-0.5">
                    {item.type === 'approval' && <AlertTriangleIcon size={16} className="text-amber-400" />}
                    {item.type === 'verification_failure' && <XCircleIcon size={16} className="text-rose-400" />}
                    {item.type === 'question' && <BotIcon size={16} className="text-cyan-400" />}
                  </div>

                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-100 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-500">{item.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                  </div>

                  <ChevronRightIcon size={16} className="text-slate-600 group-hover:text-amber-400 transition-colors self-center" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Recent Work Table */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">RECENT WORK</h3>
            <p className="text-xs text-slate-400">Past executions and verified audit outcomes</p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Filter tasks..."
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {recentWork.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No past executions recorded yet in this workspace. Launch a task above to begin.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-[#21262d]/60 text-slate-400 border-b border-[#30363d]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Task</th>
                  <th className="py-3 px-4 font-semibold">Agent</th>
                  <th className="py-3 px-4 font-semibold">Result</th>
                  <th className="py-3 px-4 font-semibold">Duration</th>
                  <th className="py-3 px-4 font-semibold text-right">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/40">
                {recentWork.map((rw: any) => (
                  <tr
                    key={rw.id}
                    onClick={() => onNavigateToOperator?.(rw.id)}
                    className="hover:bg-[#21262d]/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-medium text-slate-200 group-hover:text-cyan-400 flex items-center gap-2">
                      {rw.taskTitle}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{rw.agentName}</td>
                    <td className="py-3 px-4">
                      {rw.result === 'Verified' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <CheckCircleIcon size={12} />
                          ✓ Verified
                        </span>
                      )}
                      {rw.result === 'Failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60">
                          <XCircleIcon size={12} />
                          ✕ Failed
                        </span>
                      )}
                      {rw.result === 'Completed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-950/80 text-blue-400 border border-blue-800/60">
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{rw.duration}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 text-right">{rw.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
