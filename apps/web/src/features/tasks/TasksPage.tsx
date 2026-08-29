import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks, useAgents } from '../../hooks/useApi.js';
import { TaskItem, TaskStatus, TaskPriority } from '../../types/index.js';
import {
  CheckSquare,
  Plus,
  Search,
  LayoutGrid,
  List,
  Bot,
  Clock,
  ChevronRight,
  Filter,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  Button,
  Input,
  StatusBadge,
  PriorityBadge,
  EmptyState,
  MetricCard,
} from '../../components/ui/index.js';
import { CreateTaskModal } from './CreateTaskModal.js';

interface TasksPageProps {
  onSelectTask?: (taskId: string) => void;
  onStartTaskRun?: (taskId: string) => void;
}

const KANBAN_COLUMNS: Array<{ id: TaskStatus; label: string; bg: string }> = [
  { id: 'backlog', label: 'Backlog', bg: 'border-slate-800' },
  { id: 'ready', label: 'Ready', bg: 'border-indigo-500/30' },
  { id: 'running', label: 'Running', bg: 'border-emerald-500/40' },
  { id: 'waiting', label: 'Waiting Approval', bg: 'border-amber-500/40' },
  { id: 'verifying', label: 'Verifying', bg: 'border-cyan-500/40' },
  { id: 'review', label: 'Review', bg: 'border-purple-500/40' },
  { id: 'completed', label: 'Completed', bg: 'border-emerald-500/30' },
  { id: 'failed', label: 'Failed', bg: 'border-rose-500/40' },
];

export const TasksPage: React.FC<TasksPageProps> = ({ onSelectTask, onStartTaskRun }) => {
  const navigate = useNavigate();
  const selectTask = onSelectTask || ((taskId) => navigate(`/tasks/${taskId}`));
  const startTaskRun = onStartTaskRun || ((taskId) => navigate(`/operator?taskId=${taskId}`));

  const { tasks, loading, createTask, updateStatus, refetch } = useTasks();
  const { agents } = useAgents();

  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesObj = t.objective.toLowerCase().includes(q);
        const matchesAgent = t.assignedAgentName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesObj && !matchesAgent) return false;
      }

      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (agentFilter !== 'all' && t.assignedAgentId !== agentFilter) return false;

      return true;
    });
  }, [tasks, searchQuery, priorityFilter, agentFilter]);

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const readyCount = tasks.filter((t) => t.status === 'ready').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-cyan-400" />
            Autonomous Task Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage single-agent and multi-agent tasks with dual-mode List and 8-column Kanban board views.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Dual View Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'board' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Running Tasks"
          value={runningCount}
          subtitle="Actively executing"
          icon={<CheckSquare className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Ready for Execution"
          value={readyCount}
          subtitle="Queued & authorized"
          icon={<Clock className="w-5 h-5 text-indigo-400" />}
        />
        <MetricCard
          title="Completed & Verified"
          value={completedCount}
          subtitle="Ground truth verified"
          icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
        />
        <MetricCard
          title="Total Pipeline Tasks"
          value={tasks.length}
          subtitle="Across all workspaces"
          icon={<CheckSquare className="w-5 h-5" />}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1">
          <Input
            icon={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Search tasks by title, objective, or agent..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-cyan-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical (P0)</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-cyan-500"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.identity.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: 8-COLUMN KANBAN BOARD */}
      {viewMode === 'board' ? (
        <div className="overflow-x-auto pb-4 no-scrollbar">
          <div className="flex gap-4 min-w-[1600px] items-start">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="w-64 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col max-h-[75vh] shadow"
                >
                  {/* Column Header */}
                  <div className={`p-3 border-b ${col.bg} flex items-center justify-between bg-slate-950/80 rounded-t-xl`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        {col.label}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="p-3 space-y-3 overflow-y-auto flex-1">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 hover:bg-slate-850 transition-all shadow-sm space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <PriorityBadge priority={task.priority} />
                          <span className="text-[10px] font-mono text-slate-500">{task.id}</span>
                        </div>

                        <h4
                          onClick={() => selectTask(task.id)}
                          className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-relaxed cursor-pointer"
                        >
                          {task.title}
                        </h4>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className="flex items-center gap-1 truncate text-slate-300">
                            <Bot className="w-3 h-3 text-cyan-400 shrink-0" />
                            {task.assignedAgentName?.split(' ')[0] || 'Autonomous Agent'}
                          </span>
                          <span className="text-cyan-400 font-semibold">{task.progressPercent || 0}%</span>
                        </div>

                        {/* Direct Sub-agent Run Action */}
                        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between gap-2">
                          {col.id === 'ready' || col.id === 'backlog' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startTaskRun(task.id);
                              }}
                              className="w-full py-1.5 px-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>Dispatch Run</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectTask(task.id);
                              }}
                              className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>View Operator</span>
                              <ChevronRight className="w-3 h-3 text-slate-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-600 font-mono">
                        No tasks in {col.label}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: TABLE LIST VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Task Title & Objective</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assigned Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredTasks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTask?.(t.id)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100 font-sans">{t.title}</div>
                    <div className="text-slate-400 text-[11px] font-sans truncate max-w-md">{t.objective}</div>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t.assignedAgentName || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-300">{t.progressPercent}%</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" icon={<ChevronRight className="w-3.5 h-3.5" />}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={async (newTask) => {
          await createTask(newTask);
          refetch();
        }}
      />
    </div>
  );
};
