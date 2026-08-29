import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '../../hooks/useApi.js';
import { AgentItem } from '../../types/index.js';
import {
  Bot,
  Plus,
  Search,
  Wrench,
  Play,
  Activity,
  Layers,
  Cpu,
  Coins,
  Shield,
  Tag,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button, Input, StatusBadge, EmptyState, MetricCard } from '../../components/ui/index.js';

interface AgentsPageProps {
  onSelectAgent?: (agentId: string) => void;
  onRunAgent?: (agentId: string) => void;
}

export const AgentsPage: React.FC<AgentsPageProps> = ({ onSelectAgent, onRunAgent }) => {
  const navigate = useNavigate();
  const selectAgent = onSelectAgent || ((agentId) => navigate(`/agents/${agentId}`));
  const runAgent = onRunAgent || ((agentId) => navigate(`/operator?agentId=${agentId}`));

  const { agents, loading, createAgent, refetch } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleConversationalCreate = async () => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    try {
      const titleWords = promptInput.trim().split(' ');
      const agentName = titleWords.slice(0, 3).join(' ') + ' Agent';
      const newAgent: Partial<AgentItem> = {
        identity: {
          name: agentName,
          role: 'Autonomous Specialist',
          description: promptInput.trim(),
          tags: ['autonomous', 'conversational', 'openrouter'],
        },
        instructions: {
          systemPrompt: `You are an autonomous specialist agent created for: ${promptInput.trim()}`,
          objectives: [promptInput.trim()],
          behavioralRules: [
            'Inspect context and codebase before modifying files',
            'Require human approval for destructive database or terminal actions',
            'Run automated verification tests before completing tasks',
          ],
        },
        model: {
          provider: 'openrouter',
          modelId: 'nvidia/nemotron-3.5-lightning:free',
          temperature: 0.2,
        },
        capabilities: {
          tools: ['read_file', 'write_to_file', 'run_commands', 'search_files', 'list_dir'] as any,
          mcpServers: ['postgres-mcp', 'github-mcp'],
          connectors: [],
          customCapabilities: [],
          filesystem: { read: true, write: true, restrictedPaths: [], allowedPaths: ['*'] },
          terminal: { allowedCommands: ['*'], deniedCommands: [], requireSudo: false, maxExecutionTimeMs: 60000 },
          network: { allowedHosts: ['*'], deniedHosts: [], allowHttp: true, allowMcp: true },
          subagents: { canSpawn: true, maxDepth: 2, maxChildren: 4 },
        },
        resourceLimits: {
          maxRuntimeSeconds: 3600,
          maxCostUsd: 25,
          maxConcurrency: 2,
        },
      };

      await createAgent(newAgent);
      setPromptInput('');
      refetch();
    } finally {
      setIsGenerating(false);
    }
  };

  // Extract all distinct tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => a.identity.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [agents]);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.identity.name.toLowerCase().includes(q);
        const matchesRole = a.identity.role.toLowerCase().includes(q);
        const matchesDesc = a.identity.description.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesDesc) return false;
      }

      if (tagFilter !== 'all') {
        if (!a.identity.tags?.includes(tagFilter)) return false;
      }

      if (healthFilter !== 'all') {
        if (a.healthStatus !== healthFilter) return false;
      }

      return true;
    });
  }, [agents, searchQuery, tagFilter, healthFilter]);

  const healthyCount = agents.filter((a) => a.healthStatus === 'healthy' || a.healthStatus === 'idle').length;
  const activeCount = agents.filter((a) => a.healthStatus === 'busy').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            Dynamic Agent Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous agent personas synthesized conversationally with sub-agent hierarchies and .clinerules governance.
          </p>
        </div>
      </div>

      {/* Conversational Agent Creator Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Conversational Agent Architect (CLI)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Prompt-driven synthesis via @cline/core & OpenRouter</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConversationalCreate();
            }}
            placeholder="Describe the agent you want to create (e.g. Senior Security Auditor with Nemotron that auto-spawns 3 subagents)..."
            className="w-full sm:flex-1 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 focus:border-cyan-500 focus:outline-none font-mono"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleConversationalCreate}
            disabled={isGenerating || !promptInput.trim()}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            {isGenerating ? 'Synthesizing Agent...' : 'Deploy Agent'}
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Configured Agents"
          value={agents.length}
          subtitle="Dynamic catalog"
          icon={<Bot className="w-5 h-5" />}
        />
        <MetricCard
          title="Active in Task Runs"
          value={activeCount}
          subtitle="Currently executing"
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Ready / Healthy"
          value={healthyCount}
          subtitle="Standby status"
          icon={<CheckCircle2 className="w-5 h-5 text-cyan-400" />}
        />
        <MetricCard
          title="Total Lifetime Cost"
          value={`$${agents.reduce((acc, a) => acc + (a.totalCostUsd || 0), 0).toFixed(2)}`}
          subtitle="Token accounting"
          icon={<Coins className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:flex-1">
            <Input
              icon={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Search agents by name, role, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-cyan-500"
            >
              <option value="all">All Health Statuses</option>
              <option value="healthy">Healthy</option>
              <option value="busy">Busy / Running</option>
              <option value="idle">Idle</option>
            </select>
          </div>
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Tags:
            </span>
            <button
              onClick={() => setTagFilter('all')}
              className={`px-2.5 py-0.5 text-xs font-mono rounded transition-colors ${
                tagFilter === 'all'
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                className={`px-2.5 py-0.5 text-xs font-mono rounded capitalize transition-colors ${
                  tagFilter === t
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <EmptyState
          title="No agents found"
          description="Create a new dynamic agent or adjust your search filter."
          action={
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[placeholder*="Describe the agent"]');
                el?.focus();
              }}
            >
              Create Dynamic Agent
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => onSelectAgent?.(agent.id)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer shadow-md flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {agent.identity.name}
                    </h3>
                    <span className="text-xs font-mono text-cyan-400 font-medium block mt-0.5">
                      {agent.identity.role}
                    </span>
                  </div>
                  <StatusBadge status={agent.healthStatus} size="sm" />
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {agent.identity.description || 'Autonomous agent configured with dynamic tool capabilities.'}
                </p>

                {/* Capabilities list */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities?.tools?.slice(0, 3).map((tool) => (
                      <span
                        key={tool.name}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {tool.name}
                      </span>
                    ))}
                    {agent.capabilities?.mcpServers?.map((mcp) => (
                      <span
                        key={mcp}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30"
                      >
                        {mcp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Model & Limits info */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    {agent.model?.modelId || 'claude-3-7'}
                  </span>
                  <span>{agent.assignedTasksCount} tasks assigned</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-slate-800/80">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAgent(agent.id);
                  }}
                >
                  Configure
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Play className="w-3 h-3" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    runAgent(agent.id);
                  }}
                >
                  Run Agent
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
