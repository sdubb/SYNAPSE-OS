import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlaySquare,
  Bot,
  CheckSquare,
  Users,
  FolderGit2,
  Globe2,
  FileCheck2,
  ShieldCheck,
  Cpu,
  Settings,
  Sparkles,
  Search,
} from 'lucide-react';
import { CommandPalette, CommandItem } from '../ui/CommandPalette';
import { useAgents } from '@/hooks/useAgents';
import { useRuns } from '@/hooks/useRuns';
import { useTasks } from '@/hooks/useTasks';

export function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { agents } = useAgents();
  const { runs } = useRuns();
  const { tasks } = useTasks();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const staticCommands: CommandItem[] = [
    {
      id: 'cmd-operator',
      label: 'Open Operator Screen',
      category: 'OPERATE',
      description: 'Interact with Cline live in real-time execution mode',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      shortcut: ['G', 'O'],
      onSelect: () => navigate('/operator'),
    },
    {
      id: 'cmd-runs',
      label: 'View All Runs & Sessions',
      category: 'OPERATE',
      description: 'Review active, paused, and completed agent sessions',
      icon: <PlaySquare className="w-4 h-4 text-blue-400" />,
      shortcut: ['G', 'R'],
      onSelect: () => navigate('/runs'),
    },
    {
      id: 'cmd-create-agent',
      label: 'Create New Autonomous Agent',
      category: 'BUILD',
      description: 'Configure a new persona, tools, and system prompt',
      icon: <Bot className="w-4 h-4 text-purple-400" />,
      onSelect: () => navigate('/agents'),
    },
    {
      id: 'cmd-create-task',
      label: 'Create Task Investigation',
      category: 'BUILD',
      description: 'Dispatch a goal to an agent or team',
      icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
      onSelect: () => navigate('/tasks'),
    },
    {
      id: 'cmd-teams',
      label: 'Manage Agent Teams',
      category: 'BUILD',
      description: 'Configure collaborative and hierarchical workflows',
      icon: <Users className="w-4 h-4 text-indigo-400" />,
      onSelect: () => navigate('/teams'),
    },
    {
      id: 'cmd-workspaces',
      label: 'Inspect Workspaces',
      category: 'BUILD',
      description: 'Manage repositories, branches, and sandboxed runtimes',
      icon: <FolderGit2 className="w-4 h-4 text-amber-400" />,
      onSelect: () => navigate('/workspaces'),
    },
    {
      id: 'cmd-world',
      label: 'Open World Studio',
      category: 'WORLD',
      description: 'Explore live topological model and entity relationships',
      icon: <Globe2 className="w-4 h-4 text-cyan-400" />,
      onSelect: () => navigate('/world'),
    },
    {
      id: 'cmd-verification',
      label: 'Open Verification Engine',
      category: 'TRUST',
      description: 'Audit automated AST checks, test assertions, and proof logs',
      icon: <FileCheck2 className="w-4 h-4 text-emerald-400" />,
      onSelect: () => navigate('/verification'),
    },
    {
      id: 'cmd-governance',
      label: 'Governance & Security Policies',
      category: 'TRUST',
      description: 'Manage capability firewalls and human-in-the-loop policies',
      icon: <ShieldCheck className="w-4 h-4 text-rose-400" />,
      onSelect: () => navigate('/governance'),
    },
    {
      id: 'cmd-models',
      label: 'Model Configuration',
      category: 'SYSTEM',
      description: 'Manage LLM models, parameters, context windows, and providers',
      icon: <Cpu className="w-4 h-4 text-blue-400" />,
      onSelect: () => navigate('/models'),
    },
    {
      id: 'cmd-settings',
      label: 'System Settings',
      category: 'SYSTEM',
      description: 'Configure organization, tenants, and API secrets',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      onSelect: () => navigate('/settings'),
    },
  ];

  // Dynamically map active agents into command palette
  const agentCommands: CommandItem[] = (agents || []).map((agt: any) => ({
    id: `agent-${agt.id}`,
    label: `Agent: ${agt.identity?.name || agt.name || agt.id}`,
    category: 'ACTIVE AGENTS',
    description: agt.identity?.role || agt.role || 'Autonomous Worker',
    icon: <Bot className="w-4 h-4 text-purple-400" />,
    badge: agt.healthStatus || agt.status || 'IDLE',
    onSelect: () => navigate('/agents'),
  }));

  // Dynamically map active runs into command palette
  const runCommands: CommandItem[] = (runs || []).slice(0, 5).map((run: any) => ({
    id: `run-${run.id}`,
    label: `Run: ${run.title || run.id?.slice(0, 8)}`,
    category: 'RECENT RUNS',
    description: `Status: ${run.status}`,
    icon: <PlaySquare className="w-4 h-4 text-cyan-400" />,
    badge: run.status,
    onSelect: () => navigate(`/operator/${run.id}`),
  }));

  // Dynamically map tasks
  const taskCommands: CommandItem[] = (tasks || []).slice(0, 5).map((tsk: any) => ({
    id: `task-${tsk.id}`,
    label: `Task: ${tsk.title}`,
    category: 'ACTIVE TASKS',
    description: `Priority: ${tsk.priority || 'MEDIUM'}`,
    icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
    badge: tsk.status,
    onSelect: () => navigate('/tasks'),
  }));

  const allItems: CommandItem[] = [
    ...staticCommands,
    ...agentCommands,
    ...runCommands,
    ...taskCommands,
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 transition-all cursor-pointer select-none"
      >
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <span className="truncate">Search Synapse...</span>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-xs">
          ⌘K
        </kbd>
      </button>

      <CommandPalette
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={allItems}
        placeholder="Type a command, search agents, runs, tasks, or workspaces..."
      />
    </>
  );
}
