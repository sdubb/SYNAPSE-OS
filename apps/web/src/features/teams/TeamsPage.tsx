import React, { useState } from 'react';
import { useTeams } from '../../hooks/useApi.js';
import { TeamItem } from '../../types/index.js';
import { Users, Plus, Bot, CheckSquare, Activity, DollarSign, Sparkles, ChevronRight } from 'lucide-react';
import { Button, StatusBadge, EmptyState, MetricCard } from '../../components/ui/index.js';
import { CreateTeamModal } from './CreateTeamModal.js';

interface TeamsPageProps {
  onSelectTeam?: (teamId: string) => void;
}

export const TeamsPage: React.FC<TeamsPageProps> = ({ onSelectTeam }) => {
  const { teams, loading, createTeam, refetch } = useTeams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeTeamsCount = teams.filter((t) => t.status === 'active').length;
  const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
  const totalTasks = teams.reduce((acc, t) => acc + (t.activeTasksCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Dynamic Multi-Agent Teams
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous squads with lead coordinators capable of recruiting and delegating to dynamic sub-agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Dynamic Team
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Teams"
          value={activeTeamsCount}
          subtitle="Currently executing missions"
          icon={<Users className="w-5 h-5 text-cyan-400" />}
        />
        <MetricCard
          title="Dynamic Teammates"
          value={totalMembers}
          subtitle="Assigned agent instances"
          icon={<Bot className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Active Team Tasks"
          value={totalTasks}
          subtitle="In flight"
          icon={<CheckSquare className="w-5 h-5 text-indigo-400" />}
        />
        <MetricCard
          title="Total Team Expenditure"
          value={`$${teams.reduce((acc, t) => acc + (t.totalCostUsd || 0), 0).toFixed(2)}`}
          subtitle="Aggregate token cost"
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Team Cards Grid */}
      {teams.length === 0 ? (
        <EmptyState
          title="No dynamic teams created yet"
          description="Assemble an autonomous multi-agent squad to tackle complex distributed objectives."
          action={
            <Button size="sm" variant="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsCreateOpen(true)}>
              Create First Team
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => onSelectTeam?.(team.id)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer shadow-md flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {team.name}
                    </h3>
                    <span className="text-xs font-mono text-cyan-400 font-medium block mt-0.5 capitalize">
                      {team.mode} Mode Squad
                    </span>
                  </div>
                  <StatusBadge status={team.status} size="sm" />
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{team.mission}</p>

                {/* Coordinator & Members Info */}
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>COORDINATOR LEAD:</span>
                    <strong className="text-cyan-300 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" />
                      {team.coordinatorAgentName || 'Coordinator Agent'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>MEMBERS & SUBAGENTS:</span>
                    <strong className="text-slate-200">{team.members.length} Agents</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">ACTIVE TASKS</span>
                    <span className="font-bold text-slate-200">{team.activeTasksCount}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">COMPLETED</span>
                    <span className="font-bold text-emerald-400">{team.completedTasksCount}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">BUDGET</span>
                    <span className="font-bold text-amber-400">${team.budgetUsd || 100}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  {team.requireApprovalForTeammates ? 'Human Sign-off Required' : 'Autonomous Spawning Enabled'}
                </span>
                <Button size="sm" variant="secondary" icon={<ChevronRight className="w-3.5 h-3.5" />}>
                  Inspect Topology
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateTeamModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={async (newTeam) => {
          await createTeam(newTeam);
          refetch();
        }}
      />
    </div>
  );
};
