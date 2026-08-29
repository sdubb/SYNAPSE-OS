import React, { useState } from 'react';
import { useTeam, useTasks } from '../../hooks/useApi.js';
import {
  ArrowLeft,
  Users,
  Bot,
  Layers,
  CheckSquare,
  Activity,
  DollarSign,
  Play,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { Button, StatusBadge, Tabs, MetricCard } from '../../components/ui/index.js';
import { TeamTopologyView } from './TeamTopologyView.js';

interface TeamDetailPageProps {
  teamId?: string;
  onBack?: () => void;
  onSelectRun?: (runId: string) => void;
  onSelectTask?: (taskId: string) => void;
  onSelectAgent?: (agentId: string) => void;
}

export const TeamDetailPage: React.FC<TeamDetailPageProps> = ({
  teamId = 'team-pay-01',
  onBack,
  onSelectRun,
  onSelectTask,
  onSelectAgent,
}) => {
  const { team, topology, loading } = useTeam(teamId);
  const { tasks } = useTasks();
  const [activeTab, setActiveTab] = useState<string>('topology');

  if (loading || !team) {
    return (
      <div className="flex items-center justify-center py-24">
        <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const teamTasks = tasks.filter((t) => t.teamId === team.id);

  const tabs = [
    { id: 'topology', label: 'Hierarchy & Topology Graph', icon: <Layers className="w-4 h-4" /> },
    { id: 'members', label: 'Agent Members & Subagents', icon: <Bot className="w-4 h-4" />, badge: team.members.length },
    { id: 'tasks', label: 'Assigned Team Tasks', icon: <CheckSquare className="w-4 h-4" />, badge: teamTasks.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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
              <StatusBadge status={team.status} />
              <span className="text-xs font-mono text-cyan-400 uppercase font-bold">
                {team.mode} Mode Squad
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-100">{team.name}</h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{team.mission}</p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs font-mono">
            <span className="text-slate-400">
              Coordinator: <strong className="text-cyan-300">{team.coordinatorAgentName}</strong>
            </span>
            <span className="text-slate-400">
              Budget: <strong className="text-emerald-400">${team.budgetUsd || 100} USD</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'topology' && topology && (
          <TeamTopologyView
            topology={topology}
            onSelectRun={onSelectRun}
            onSelectTask={onSelectTask}
            onSelectAgent={onSelectAgent}
          />
        )}

        {activeTab === 'members' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.members.map((member) => (
              <div
                key={member.agentId}
                onClick={() => onSelectAgent?.(member.agentId)}
                className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer shadow flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                      member.isCoordinator
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}>
                      {member.isCoordinator ? 'Team Coordinator' : 'Sub-Agent'}
                    </span>
                    <StatusBadge status={member.status} size="sm" />
                  </div>

                  <h4 className="text-sm font-bold text-slate-100">{member.agentName}</h4>
                  <span className="text-xs font-mono text-cyan-400">{member.agentRole}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Tokens: {member.tokensUsed.toLocaleString()}</span>
                  <span className="text-emerald-400 font-semibold">${member.costUsd.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {teamTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task.id)}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={task.status} size="sm" />
                    <span className="text-xs font-mono text-slate-500">{task.id}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">{task.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{task.objective}</p>
                </div>
                <div className="text-xs font-mono text-slate-300">{task.progressPercent}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
