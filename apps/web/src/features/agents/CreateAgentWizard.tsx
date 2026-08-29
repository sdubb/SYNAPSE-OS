import React, { useState } from 'react';
import { AgentItem } from '../../types/index.js';
import {
  Sparkles,
  Bot,
  Wrench,
  Shield,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Cpu,
  Workflow,
  DollarSign,
  Terminal,
  Globe,
  Database,
  GitBranch,
} from 'lucide-react';
import { Button, Input, Textarea, Select, Modal } from '../../components/ui/index.js';

interface CreateAgentWizardProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCreated?: (agent: Partial<AgentItem>) => void;
}

export const CreateAgentWizard: React.FC<CreateAgentWizardProps> = ({
  isOpen = true,
  onClose = () => {},
  onCreated = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'identity' | 'autonomy' | 'tools' | 'guardrails'>('identity');

  // Form State
  const [name, setName] = useState('Senior Autonomous Engineer');
  const [role, setRole] = useState('Full Stack & Systems Specialist');
  const [description, setDescription] = useState('Autonomous agent capable of decomposing tasks, spawning sub-agents, and running 24/7 verification.');
  const [provider, setProvider] = useState('openrouter');
  const [modelId, setModelId] = useState('nvidia/nemotron-3.5-lightning:free');
  const [temperature, setTemperature] = useState(0.2);

  // Autonomy & Sub-agents
  const [canSpawnSubagents, setCanSpawnSubagents] = useState(true);
  const [maxSubagents, setMaxSubagents] = useState(4);
  const [autoDecomposeTasks, setAutoDecomposeTasks] = useState(true);
  const [continuous24x7, setContinuous24x7] = useState(true);
  const [concurrencyLimit, setConcurrencyLimit] = useState(2);

  // Tools & MCPs
  const [selectedTools, setSelectedTools] = useState<string[]>([
    'read_file',
    'write_to_file',
    'run_commands',
    'search_files',
    'list_dir',
    'browser_action',
  ]);
  const [selectedMcps, setSelectedMcps] = useState<string[]>(['postgres-mcp', 'github-mcp']);
  const [newMcp, setNewMcp] = useState('');

  // Guardrails & Rules
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a high-autonomy software engineer. You break down complex goals into sub-tasks, execute tools with precision, enforce security standards, and verify all changes before completion.'
  );
  const [rules, setRules] = useState<string[]>([
    'Always inspect files and understand repository context before modifying code.',
    'Require human approval before running destructive SQL queries or dropping tables.',
    'Run automated verification and regression tests before marking tasks completed.',
    'Enforce tenant isolation on all database and workspace operations.',
  ]);
  const [newRule, setNewRule] = useState('');
  const [dailyBudgetUsd, setDailyBudgetUsd] = useState(25.0);

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const toggleMcp = (mcp: string) => {
    setSelectedMcps((prev) =>
      prev.includes(mcp) ? prev.filter((m) => m !== mcp) : [...prev, mcp]
    );
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleAddMcp = () => {
    if (newMcp.trim() && !selectedMcps.includes(newMcp.trim())) {
      setSelectedMcps([...selectedMcps, newMcp.trim()]);
      setNewMcp('');
    }
  };

  const handleSubmit = () => {
    const payload: Partial<AgentItem> = {
      identity: {
        name,
        role,
        description,
        tags: ['autonomous', provider, modelId.split('/')[0] || 'openrouter'],
      },
      instructions: {
        systemPrompt,
        objectives: [description],
        behavioralRules: rules,
      },
      model: {
        provider: provider as any,
        modelId,
        temperature,
      },
      capabilities: {
        tools: selectedTools as any,
        mcpServers: selectedMcps,
        connectors: [],
        customCapabilities: [],
        filesystem: { read: true, write: true, restrictedPaths: [], allowedPaths: ['*'] },
        terminal: { allowedCommands: ['*'], deniedCommands: [], requireSudo: false, maxExecutionTimeMs: 60000 },
        network: { allowedHosts: ['*'], deniedHosts: [], allowHttp: true, allowMcp: true },
        subagents: { canSpawn: canSpawnSubagents, maxDepth: 2, maxChildren: maxSubagents },
      },
      resourceLimits: {
        maxRuntimeSeconds: 3600,
        maxCostUsd: dailyBudgetUsd,
        maxConcurrency: concurrencyLimit,
      },
    };
    onCreated(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Autonomous Agent Studio"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'identity'
                ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>1. Identity & Model</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('autonomy')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'autonomy'
                ? 'bg-indigo-950/70 border border-indigo-500/40 text-indigo-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Workflow className="w-4 h-4 text-indigo-400" />
            <span>2. Sub-Agents & 24/7 Autonomy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'tools'
                ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-emerald-400" />
            <span>3. Tools & MCP Integrations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guardrails')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'guardrails'
                ? 'bg-purple-950/70 border border-purple-500/40 text-purple-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>4. Company Rules & Budgets</span>
          </button>
        </div>

        {/* Tab 1: Identity & Model */}
        {activeTab === 'identity' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Agent Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lead Backend Engineer" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Specialized Role</label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Distributed Systems Specialist" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Mission Description</label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What company objectives and services does this agent manage?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">LLM Provider</label>
                <Select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  options={[
                    { value: 'openrouter', label: 'OpenRouter (Multi-Provider)' },
                    { value: 'anthropic', label: 'Anthropic Claude' },
                    { value: 'openai', label: 'OpenAI GPT-4o' },
                    { value: 'gemini', label: 'Google Gemini' },
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Model ID</label>
                <Input
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="e.g. nvidia/nemotron-3.5-lightning:free"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Temperature ({temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full mt-2 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Autonomy & Sub-Agents */}
        {activeTab === 'autonomy' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-cyan-400" />
                    Autonomous Sub-Agent Spawning
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Allows this agent to dynamically decompose high-level company goals and spawn specialized sub-agents in parallel (Research, Code, QA, Security).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={canSpawnSubagents}
                  onChange={(e) => setCanSpawnSubagents(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 rounded cursor-pointer mt-1"
                />
              </div>

              {canSpawnSubagents && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Max Concurrent Sub-Agents</label>
                    <Input
                      type="number"
                      value={maxSubagents}
                      onChange={(e) => setMaxSubagents(parseInt(e.target.value) || 1)}
                      min="1"
                      max="16"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Sub-Agent Workspace Mode</label>
                    <Select
                      options={[
                        { value: 'inherit', label: 'Inherit Workspace (Fast)' },
                        { value: 'branch', label: 'Dedicated Git Worktree Branch (Isolated)' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">24/7 Autonomous Task Queue</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Auto-pull from READY task backlog</div>
                </div>
                <input
                  type="checkbox"
                  checked={continuous24x7}
                  onChange={(e) => setContinuous24x7(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Multi-Step Auto-Decomposition</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Generate step plans before executing</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoDecomposeTasks}
                  onChange={(e) => setAutoDecomposeTasks(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Tools & MCP Integrations */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Native Cline Core Tools</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'read_file', label: 'read_file', desc: 'Inspect source code' },
                  { id: 'write_to_file', label: 'write_to_file', desc: 'Create & edit files' },
                  { id: 'run_commands', label: 'run_commands', desc: 'Execute shell commands' },
                  { id: 'search_files', label: 'search_files', desc: 'Ripgrep regex search' },
                  { id: 'list_dir', label: 'list_dir', desc: 'Explore directory trees' },
                  { id: 'browser_action', label: 'browser_action', desc: 'Web browsing & test' },
                ].map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTools.includes(tool.id)
                        ? 'bg-cyan-950/50 border-cyan-500/50 text-slate-100 shadow'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs font-bold text-cyan-300">
                      <span>{tool.label}</span>
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(tool.id)}
                        onChange={() => {}}
                        className="accent-cyan-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{tool.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 block mb-2">Connected Model Context Protocol (MCP) Servers</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedMcps.map((mcp) => (
                  <span
                    key={mcp}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-mono"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    {mcp}
                    <button
                      type="button"
                      onClick={() => toggleMcp(mcp)}
                      className="hover:text-rose-400 ml-1 text-slate-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={newMcp}
                  onChange={(e) => setNewMcp(e.target.value)}
                  placeholder="e.g. postgres-mcp, slack-mcp, kubernetes-mcp"
                  className="text-xs"
                />
                <Button size="sm" variant="secondary" onClick={handleAddMcp}>
                  Attach MCP
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Guardrails & Rules */}
        {activeTab === 'guardrails' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">System Prompt & Persona</label>
              <Textarea
                rows={3}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Core behavioral system prompt..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  Company Rules (.clinerules Constraints)
                </label>
                <span className="text-[10px] text-slate-500 font-mono">{rules.length} rules active</span>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
                  >
                    <span className="truncate mr-2">• {rule}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="Add custom rule (e.g. Require approval before mutating payments table)..."
                  className="text-xs"
                />
                <Button size="sm" variant="secondary" onClick={handleAddRule}>
                  Add Rule
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Daily Token Budget ($ USD)</label>
                <Input
                  type="number"
                  value={dailyBudgetUsd}
                  onChange={(e) => setDailyBudgetUsd(parseFloat(e.target.value) || 0)}
                  step="5"
                  min="1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">High-Risk Tool Approvals</label>
                <Select
                  options={[
                    { value: 'strict', label: 'Strict (Require Human Approval for Writes)' },
                    { value: 'automated', label: 'Automated (Pre-Approved with Rollback)' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {activeTab !== 'guardrails' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (activeTab === 'identity') setActiveTab('autonomy');
                  else if (activeTab === 'autonomy') setActiveTab('tools');
                  else if (activeTab === 'tools') setActiveTab('guardrails');
                }}
              >
                Next Step →
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSubmit} icon={<Sparkles className="w-3.5 h-3.5" />}>
                Create & Deploy Agent
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
