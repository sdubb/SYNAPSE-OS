import React, { useState } from 'react';
import { useAgent, useTasks, useRuns } from '../../hooks/useApi.js';
import {
  ArrowLeft,
  Bot,
  Settings,
  Wrench,
  CheckSquare,
  Activity,
  Shield,
  Cpu,
  Coins,
  Play,
  RotateCw,
  FolderGit2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Button, StatusBadge, Tabs, MetricCard, RiskBadge, PriorityBadge } from '../../components/ui/index.js';

interface AgentDetailPageProps {
  agentId?: string;
  onBack?: () => void;
  onRunAgent?: (agentId: string) => void;
}

export const AgentDetailPage: React.FC<AgentDetailPageProps> = ({ agentId = 'agt-dev-01', onBack, onRunAgent }) => {
  const { agent, loading } = useAgent(agentId);
  const { tasks } = useTasks();
  const { runs } = useRuns();
  const [activeTab, setActiveTab] = useState<string>('overview');

  if (loading || !agent) {
    return (
      <div className="flex items-center justify-center py-24">
        <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const assignedTasks = tasks.filter((t) => t.assignedAgentId === agent.id);
  const agentRuns = runs.filter((r) => r.agentId === agent.id);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Bot className="w-4 h-4" /> },
    { id: 'configuration', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
    { id: 'capabilities', label: 'Capabilities', icon: <Wrench className="w-4 h-4" />, badge: agent.capabilities?.tools?.length },
    { id: 'tasks', label: 'Assigned Tasks', icon: <CheckSquare className="w-4 h-4" />, badge: assignedTasks.length },
    { id: 'runs', label: 'Past Runs', icon: <Activity className="w-4 h-4" />, badge: agentRuns.length },
    { id: 'policies', label: 'Policy Rules', icon: <Shield className="w-4 h-4" />, badge: agent.policies?.length },
    { id: 'usage', label: 'Usage & Cost', icon: <Cpu className="w-4 h-4" /> },
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
              <StatusBadge status={agent.healthStatus} />
              <span className="text-xs font-mono text-slate-500">ID: {agent.id}</span>
            </div>

            <h1 className="text-xl font-bold text-slate-100">{agent.identity.name}</h1>
            <p className="text-xs font-mono text-cyan-300">{agent.identity.role}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => onRunAgent?.(agent.id)}
            >
              Start Agent Run
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Contents */}
      <div className="pt-2">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Assigned Tasks"
                value={assignedTasks.length}
                subtitle="In current workspace"
                icon={<CheckSquare className="w-5 h-5 text-cyan-400" />}
              />
              <MetricCard
                title="Lifetime Runs"
                value={agentRuns.length}
                subtitle="Historical executions"
                icon={<Activity className="w-5 h-5 text-emerald-400" />}
              />
              <MetricCard
                title="Tokens Consumed"
                value={(agent.totalTokensUsed || 1245000).toLocaleString()}
                subtitle="Prompt + completion"
                icon={<Cpu className="w-5 h-5" />}
              />
              <MetricCard
                title="Accumulated Cost"
                value={`$${(agent.totalCostUsd || 18.64).toFixed(2)}`}
                subtitle="Model provider billing"
                icon={<Coins className="w-5 h-5 text-amber-400" />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Identity & Instructions */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  Agent Description & Instructions
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {agent.identity.description || 'No description provided.'}
                </p>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    System Prompt:
                  </span>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {agent.instructions.systemPrompt || 'No system prompt defined.'}
                  </pre>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Behavioral Safety Rules:
                  </span>
                  <div className="space-y-1">
                    {agent.instructions.behavioralRules.map((rule, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-emerald-400">✓</span> {rule}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Workspace & Model Details */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Model Configuration & Workspace
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block mb-0.5">PROVIDER:</span>
                    <span className="text-slate-200 capitalize">{agent.model.provider}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">MODEL ID:</span>
                    <span className="text-cyan-300 font-bold">{agent.model.modelId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">TEMPERATURE:</span>
                    <span className="text-slate-200">{agent.model.temperature}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">MAX CONCURRENCY:</span>
                    <span className="text-slate-200">{agent.resourceLimits.maxConcurrency} runs</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">MAX RUNTIME:</span>
                    <span className="text-slate-200">{agent.resourceLimits.maxRuntimeSeconds}s</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">BUDGET CEILING:</span>
                    <span className="text-emerald-400 font-bold">${agent.resourceLimits.maxCostUsd || 15.0}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Bound Repositories:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {agent.workspace.repositories.map((repo) => (
                      <span key={repo} className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {repo}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONFIGURATION TAB */}
        {activeTab === 'configuration' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-slate-100">Agent Configuration Editor</h4>
            <div className="space-y-3 font-mono text-xs">
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto">
                {JSON.stringify(agent, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* CAPABILITIES TAB */}
        {activeTab === 'capabilities' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Registered Tool Primitives
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                {agent.capabilities.tools.map((t) => (
                  <div key={t.name} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-cyan-300">{t.name}</span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">Provider: {t.provider || 'builtin'}</span>
                    </div>
                    <RiskBadge risk={t.riskLevel} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Model Context Protocol (MCP) Servers
              </h4>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.mcpServers.map((mcp) => (
                  <span key={mcp} className="px-3 py-1.5 rounded-lg bg-slate-950 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold">
                    {mcp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ASSIGNED TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {assignedTasks.map((t) => (
              <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">{t.title}</h4>
                </div>
                <div className="text-xs font-mono text-slate-400">{t.progressPercent}% progress</div>
              </div>
            ))}
          </div>
        )}

        {/* PAST RUNS TAB */}
        {activeTab === 'runs' && (
          <div className="space-y-3">
            {agentRuns.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={r.status} size="sm" />
                    <span className="text-xs font-mono text-slate-500">{r.id}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">{r.title}</h4>
                </div>
                <div className="text-xs font-mono text-emerald-400 font-semibold">
                  ${r.tokenUsage.estimatedCostUsd.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* POLICIES TAB */}
        {activeTab === 'policies' && (
          <div className="space-y-3">
            {agent.policies.map((p) => (
              <div key={p.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <RiskBadge risk={p.riskLevel} size="sm" />
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-bold border border-slate-800">
                      {p.action}
                    </span>
                  </div>
                  <h5 className="text-sm font-semibold text-slate-200">{p.name}</h5>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Condition: {p.condition}</p>
                </div>
                <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
              </div>
            ))}
          </div>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-slate-100">Cumulative Resource Consumption</h4>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">TOTAL TOKENS:</span>
                <span className="text-xl font-bold text-slate-100">{agent.totalTokensUsed.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-1">TOTAL COST (USD):</span>
                <span className="text-xl font-bold text-emerald-400">${agent.totalCostUsd.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
