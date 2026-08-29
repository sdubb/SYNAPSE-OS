import React, { useState } from 'react';
import { TaskItem, TaskPriority, AgentItem } from '../../types/index.js';
import { useAgents } from '../../hooks/useApi.js';
import {
  CheckSquare,
  Sparkles,
  Bot,
  Layers,
  FolderGit2,
  Shield,
  FlaskConical,
  Play,
  ArrowRight,
} from 'lucide-react';
import { Button, Input, Textarea, Select, Modal, RiskBadge } from '../../components/ui/index.js';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (task: Partial<TaskItem>) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { agents } = useAgents();
  const [showProposal, setShowProposal] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [instructions, setInstructions] = useState('');
  const [workspaceId, setWorkspaceId] = useState('ws-dev-01');
  const [executionMode, setExecutionMode] = useState<'single' | 'team' | 'auto'>('auto');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  // Compute selected agent
  const selectedAgent = agents.find((a) => a.id === assignedAgentId) || agents[0];

  const handlePreviewPlan = () => {
    if (!title.trim() && !objective.trim()) return;
    setShowProposal(true);
  };

  const handleFinalSubmit = () => {
    const newTask: Partial<TaskItem> = {
      title: title || objective.slice(0, 50),
      objective: objective || title,
      instructions: instructions || objective,
      workspaceId,
      workspaceName: workspaceId === 'ws-prod-01' ? 'Production Workspace' : 'Development Workspace',
      assignedAgentId: assignedAgentId || selectedAgent?.id,
      assignedAgentName: selectedAgent?.identity.name,
      assignedAgentRole: selectedAgent?.identity.role,
      priority,
      status: 'ready',
      tags: ['task', priority],
    };

    onCreated(newTask);
    setShowProposal(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-cyan-400" />
          <span>{showProposal ? 'Proposed Execution Plan' : 'Create Autonomous Task'}</span>
        </div>
      }
      description={
        showProposal
          ? 'Review the Synapse OS execution proposal and risk assessment before dispatch.'
          : 'Define a task objective, select workspace, and configure autonomous execution.'
      }
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>

          {showProposal ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowProposal(false)}>
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Play className="w-3.5 h-3.5" />}
                onClick={handleFinalSubmit}
              >
                Approve & Launch Task
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handlePreviewPlan}
              disabled={!title.trim() && !objective.trim()}
            >
              Review Proposed Plan
            </Button>
          )}
        </div>
      }
    >
      {!showProposal ? (
        <div className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Fix checkout service gateway timeout under heavy concurrency"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="Objective & Goals"
            rows={3}
            placeholder="What exact outcome needs to be achieved?"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />

          <Textarea
            label="Specific Step-by-Step Instructions (Optional)"
            rows={3}
            placeholder="1. Read payment service\n2. Add retry logic\n3. Verify test suite"
            value={instructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Target Workspace"
              value={workspaceId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWorkspaceId(e.target.value)}
              options={[
                { value: 'ws-dev-01', label: 'Development Workspace' },
                { value: 'ws-stage-01', label: 'Staging Environment' },
                { value: 'ws-prod-01', label: 'Production Workspace (Strict Policy)' },
              ]}
            />

            <Select
              label="Priority Level"
              value={priority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as TaskPriority)}
              options={[
                { value: 'low', label: 'Low Priority' },
                { value: 'medium', label: 'Medium Priority' },
                { value: 'high', label: 'High Priority' },
                { value: 'critical', label: 'Critical (P0)' },
                { value: 'emergency', label: 'Emergency (Immediate)' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Execution Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'single', label: 'Single Agent', desc: 'Direct assignment' },
                { id: 'team', label: 'Dynamic Team', desc: 'Multi-agent squad' },
                { id: 'auto', label: 'Auto Dispatch', desc: 'Synapse matches agent' },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setExecutionMode(m.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    executionMode === m.id
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs">{m.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {executionMode === 'single' && (
            <Select
              label="Assign Specific Agent"
              value={assignedAgentId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignedAgentId(e.target.value)}
              options={agents.map((a) => ({ value: a.id, label: `${a.identity.name} (${a.identity.role})` }))}
            />
          )}
        </div>
      ) : (
        /* Plan proposal preview */
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-sans">Matched Agent:</span>
              <span className="text-cyan-300 font-bold flex items-center gap-1.5 font-mono">
                <Bot className="w-3.5 h-3.5" />
                {selectedAgent?.identity.name || 'Full-Stack Developer Agent'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-sans">Required Capabilities:</span>
              <span className="text-slate-200">read_files, write_files, run_commands</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-sans">Target Environment:</span>
              <span className="text-slate-200">{workspaceId === 'ws-prod-01' ? 'Production' : 'Development'}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400 font-sans">Assessed Policy Risk:</span>
              <RiskBadge risk="medium" size="sm" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Verification Strategy:</span>
              <span className="text-emerald-400">Unit Tests + AST Diff + Policy Audit</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
