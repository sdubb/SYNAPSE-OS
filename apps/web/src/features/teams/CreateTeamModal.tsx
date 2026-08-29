import React, { useState } from 'react';
import { TeamItem, AgentItem } from '../../types/index.js';
import { useAgents } from '../../hooks/useApi.js';
import { Users, Bot, Sparkles, Shield, DollarSign, Plus, Check } from 'lucide-react';
import { Button, Input, Textarea, Select, Modal } from '../../components/ui/index.js';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (team: Partial<TeamItem>) => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { agents } = useAgents();

  const [mode, setMode] = useState<'explicit' | 'autonomous'>('autonomous');
  const [name, setName] = useState('');
  const [mission, setMission] = useState('');
  const [description, setDescription] = useState('');
  const [coordinatorId, setCoordinatorId] = useState(agents[0]?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [allowDynamicTeammates, setAllowDynamicTeammates] = useState(true);
  const [maxTeammates, setMaxTeammates] = useState(6);
  const [requireApprovalForTeammates, setRequireApprovalForTeammates] = useState(true);
  const [budgetUsd, setBudgetUsd] = useState(100);

  const coordinator = agents.find((a) => a.id === coordinatorId) || agents[0];

  const handleToggleMember = (agentId: string) => {
    if (selectedMemberIds.includes(agentId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== agentId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, agentId]);
    }
  };

  const handleFinalSubmit = () => {
    const membersList = [
      {
        agentId: coordinator?.id || 'agt-coord',
        agentName: coordinator?.identity.name || 'Coordinator Agent',
        agentRole: coordinator?.identity.role || 'Coordinator Lead',
        isCoordinator: true,
        status: 'healthy' as const,
        tokensUsed: 0,
        costUsd: 0,
      },
      ...selectedMemberIds
        .filter((id) => id !== coordinator?.id)
        .map((id) => {
          const agt = agents.find((a) => a.id === id);
          return {
            agentId: id,
            agentName: agt?.identity.name || 'Member Agent',
            agentRole: agt?.identity.role || 'Member Specialist',
            isCoordinator: false,
            status: 'healthy' as const,
            tokensUsed: 0,
            costUsd: 0,
          };
        }),
    ];

    const newTeam: Partial<TeamItem> = {
      name: name || 'Autonomous Squad',
      mission,
      description,
      mode,
      coordinatorAgentId: coordinator?.id,
      coordinatorAgentName: coordinator?.identity.name,
      members: membersList,
      maxTeammates,
      requireApprovalForTeammates,
      budgetUsd,
      status: 'active',
    };

    onCreated(newTeam);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <span>Create Multi-Agent Dynamic Team</span>
        </div>
      }
      description="Configure an explicit squad or an autonomous coordinator team capable of spawning dynamic sub-agents."
      maxWidth="3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleFinalSubmit}
            disabled={!name.trim() && !mission.trim()}
          >
            Create Dynamic Team
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setMode('autonomous')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'autonomous'
                ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100 shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold">Autonomous Coordinator Mode</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Coordinator agent autonomously creates and dispatches dynamic sub-agents within budget and policy limits.
            </p>
          </div>

          <div
            onClick={() => setMode('explicit')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'explicit'
                ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100 shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold">Explicit Member Mode</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manually assemble a fixed team roster from the existing dynamic agent catalog.
            </p>
          </div>
        </div>

        {/* Basic Fields */}
        <div className="space-y-4">
          <Input
            label="Team Name"
            placeholder="e.g. Payment Platform Engineering Squad"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />

          <Textarea
            label="Team Mission Objective"
            rows={3}
            placeholder="What high-level multi-task objective is this team accountable for?"
            value={mission}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMission(e.target.value)}
          />

          <Select
            label="Designate Lead Coordinator Agent"
            value={coordinatorId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCoordinatorId(e.target.value)}
            options={agents.map((a) => ({ value: a.id, label: `${a.identity.name} (${a.identity.role})` }))}
          />
        </div>

        {/* Mode Specific Controls */}
        {mode === 'autonomous' ? (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Autonomous Coordinator Controls
            </h4>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={allowDynamicTeammates}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllowDynamicTeammates(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Allow coordinator to create dynamic teammate agents on-the-fly</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={requireApprovalForTeammates}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequireApprovalForTeammates(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Require human operator approval before coordinator spawns new teammate</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="Maximum Teammates Cap"
                type="number"
                value={maxTeammates}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxTeammates(Number(e.target.value))}
              />
              <Input
                label="Team Budget Ceiling ($ USD)"
                type="number"
                value={budgetUsd}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBudgetUsd(Number(e.target.value))}
              />
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Team Member Agents
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {agents.map((a) => {
                const isSelected = selectedMemberIds.includes(a.id);
                return (
                  <div
                    key={a.id}
                    onClick={() => handleToggleMember(a.id)}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/50 text-slate-100 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{a.identity.name}</div>
                      <div className="text-[11px] text-slate-400">{a.identity.role}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
