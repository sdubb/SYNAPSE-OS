import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  GitBranch,
  Users,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  Cpu,
  Search,
} from 'lucide-react';
import { CommandPalette, CommandItem } from '../ui/CommandPalette';
import { useAgents } from '@/hooks/useAgents';
import { useSessions } from '@/hooks/useSessions';
import { useTasks } from '@/hooks/useTasks';

export function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: agents } = useAgents();
  const { data: sessions } = useSessions();
  const { data: tasks } = useTasks();

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
      id: 'cmd-missions',
      label: 'Mission Command Center',
      category: 'NAVIGATE',
      description: 'View all sessions and missions',
      icon: <Activity className="w-4 h-4 text-cyan-400" />,
      onSelect: () => navigate('/missions'),
    },
    {
      id: 'cmd-graph',
      label: 'Execution Graph',
      category: 'NAVIGATE',
      description: 'View execution graph visualization',
      icon: <GitBranch className="w-4 h-4 text-blue-400" />,
      onSelect: () => navigate('/graph'),
    },
    {
      id: 'cmd-workforce',
      label: 'Workforce',
      category: 'NAVIGATE',
      description: 'View agent workforce',
      icon: <Users className="w-4 h-4 text-purple-400" />,
      onSelect: () => navigate('/workforce'),
    },
    {
      id: 'cmd-simulation',
      label: 'Simulation',
      category: 'NAVIGATE',
      description: 'View simulation results',
      icon: <FlaskConical className="w-4 h-4 text-emerald-400" />,
      onSelect: () => navigate('/simulation'),
    },
    {
      id: 'cmd-approvals',
      label: 'Approvals',
      category: 'NAVIGATE',
      description: 'Review pending approvals',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
      onSelect: () => navigate('/approvals'),
    },
    {
      id: 'cmd-escalations',
      label: 'Escalations',
      category: 'NAVIGATE',
      description: 'View escalation events',
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      onSelect: () => navigate('/escalations'),
    },
    {
      id: 'cmd-audit',
      label: 'Audit Trail',
      category: 'NAVIGATE',
      description: 'View tamper-proof audit log',
      icon: <ScrollText className="w-4 h-4 text-slate-400" />,
      onSelect: () => navigate('/audit'),
    },
  ];

  const agentCommands: CommandItem[] = (agents || []).slice(0, 5).map((agt: any) => ({
    id: `agent-${agt.id}`,
    label: `Agent: ${agt.identity?.name || agt.name || agt.id}`,
    category: 'AGENTS',
    description: agt.identity?.role || agt.role || 'Autonomous Worker',
    icon: <Cpu className="w-4 h-4 text-purple-400" />,
    onSelect: () => navigate('/workforce'),
  }));

  const sessionCommands: CommandItem[] = (sessions || []).slice(0, 5).map((s: any) => ({
    id: `session-${s.id}`,
    label: `Session: ${s.title || s.id?.slice(0, 8)}`,
    category: 'SESSIONS',
    description: `Status: ${s.status}`,
    icon: <Activity className="w-4 h-4 text-cyan-400" />,
    onSelect: () => navigate(`/runtime/${s.id}`),
  }));

  const allItems: CommandItem[] = [...staticCommands, ...agentCommands, ...sessionCommands];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 transition-all cursor-pointer select-none"
      >
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <span className="truncate">Search Synapse...</span>
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
          ⌘K
        </kbd>
      </button>
      <CommandPalette
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={allItems}
        placeholder="Search agents, sessions, or navigate..."
      />
    </>
  );
}
