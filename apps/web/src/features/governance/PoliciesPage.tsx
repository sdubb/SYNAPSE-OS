import React, { useState } from 'react';
import { useGovernance } from '../../hooks/trust-governance.js';
import { Card, RiskBadge, Button, Badge, Modal } from '../../components/ui/trust-ui.js';
import { PolicyDefinition, PolicyDecision, ApprovalRiskLevel } from '../../types/trust-governance.js';

export function PoliciesPage() {
  const { policies, loading, error, refresh, handleSavePolicy } = useGovernance();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDefinition | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('*');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development' | '*'>('production');
  const [operation, setOperation] = useState('database.write');
  const [target, setTarget] = useState('production-db');
  const [decision, setDecision] = useState<PolicyDecision>('REQUIRE_APPROVAL');
  const [riskLevel, setRiskLevel] = useState<ApprovalRiskLevel>('CRITICAL');
  const [rawYaml, setRawYaml] = useState('');

  const openCreateModal = () => {
    setSelectedPolicy(null);
    setName('');
    setDescription('');
    setSubject('*');
    setEnvironment('production');
    setOperation('database.write');
    setTarget('production-db');
    setDecision('REQUIRE_APPROVAL');
    setRiskLevel('CRITICAL');
    setRawYaml(
`name: Production Database Guardrail
subject: "*"
environment: production
operation: database.write
target: production-db
decision: REQUIRE_APPROVAL
riskLevel: CRITICAL`
    );
    setIsCreateModalOpen(true);
  };

  const openEditModal = (p: PolicyDefinition) => {
    setSelectedPolicy(p);
    setName(p.name);
    setDescription(p.description);
    setSubject(p.subject);
    setEnvironment(p.environment);
    setOperation(p.operation);
    setTarget(p.target);
    setDecision(p.decision);
    setRiskLevel(p.riskLevel);
    setRawYaml(
`name: ${p.name}
subject: "${p.subject}"
environment: ${p.environment}
operation: ${p.operation}
target: ${p.target}
decision: ${p.decision}
riskLevel: ${p.riskLevel}`
    );
    setIsCreateModalOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSavePolicy({
      id: selectedPolicy?.id,
      name,
      description,
      subject,
      environment,
      operation,
      target,
      decision,
      riskLevel,
      enabled: true,
      conditions: [
        { field: 'environment', operator: 'EQUALS', value: environment },
        { field: 'operation', operator: 'CONTAINS', value: operation },
      ],
    });
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Security & Execution Policies</h1>
            <Badge variant="cyan">Policy Engine Active</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Deterministic WHEN-THEN guardrails governing tool execution, filesystem access, and environment boundaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            + Create Policy Guardrail
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Policy List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {policies.map((p) => {
          const decisionBadgeVariant = p.decision === 'ALLOW' ? 'success' : p.decision === 'BLOCK' ? 'danger' : 'warning';
          return (
            <Card
              key={p.id}
              className="flex flex-col justify-between hover:border-cyan-500/50 transition cursor-pointer"
              title={
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-100 truncate">{p.name}</span>
                  <RiskBadge level={p.riskLevel} />
                </div>
              }
              subtitle={`Scope: ${p.environment.toUpperCase()}`}
            >
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 min-h-[36px] line-clamp-2">{p.description || 'Deterministic rule enforcement.'}</p>

                {/* Visual WHEN-THEN Box */}
                <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-zinc-500 text-[10px]">WHEN</span>
                    <span className="text-zinc-300">agent = <span className="text-cyan-400">{p.subject}</span></span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-zinc-500 text-[10px]">AND</span>
                    <span className="text-zinc-300">env = <span className="text-purple-400">{p.environment}</span></span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-zinc-500 text-[10px]">AND</span>
                    <span className="text-zinc-300">op = <span className="text-amber-400">{p.operation}</span></span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px] font-bold">THEN</span>
                    <Badge variant={decisionBadgeVariant}>{p.decision.replace('_', ' ')}</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                  <span className="text-[11px] font-mono text-zinc-500">
                    Target: {p.target}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(p)}>
                    Edit Policy →
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Visual Policy Builder */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          <div className="flex items-center justify-between w-full pr-6">
            <span>{selectedPolicy ? 'Edit Policy Guardrail' : 'Create Visual Policy Guardrail'}</span>
            <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setEditorMode('visual')}
                className={`px-3 py-1 rounded transition ${editorMode === 'visual' ? 'bg-cyan-500 text-black font-bold' : 'text-zinc-400'}`}
              >
                Visual Builder
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('code')}
                className={`px-3 py-1 rounded transition ${editorMode === 'code' ? 'bg-cyan-500 text-black font-bold' : 'text-zinc-400'}`}
              >
                YAML / JSON
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          {editorMode === 'visual' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Policy Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Database Guardrail"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Explain why this security guardrail exists..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Visual WHEN Builder */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">WHEN Condition Filters</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Subject (Agent Pattern / Role)</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="* or agent:developer-*"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Environment</label>
                    <select
                      value={environment}
                      onChange={e => setEnvironment(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                      <option value="*">All Environments (*)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Operation / Tool Action</label>
                    <input
                      type="text"
                      value={operation}
                      onChange={e => setOperation(e.target.value)}
                      placeholder="e.g. database.write, fs.delete"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Target Resource Scope</label>
                    <input
                      type="text"
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      placeholder="e.g. production-db, /etc/*"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* Visual THEN Builder */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">THEN Enforcement Decision</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Policy Decision</label>
                    <select
                      value={decision}
                      onChange={e => setDecision(e.target.value as PolicyDecision)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200"
                    >
                      <option value="REQUIRE_APPROVAL">Require Human Approval</option>
                      <option value="BLOCK">Block Immediately (Deny)</option>
                      <option value="ALLOW">Allow (Autonomous Pass)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1 font-mono">Risk Level</label>
                    <select
                      value={riskLevel}
                      onChange={e => setRiskLevel(e.target.value as ApprovalRiskLevel)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Raw YAML Policy Spec</label>
              <textarea
                rows={12}
                value={rawYaml}
                onChange={e => setRawYaml(e.target.value)}
                className="w-full p-3 bg-black border border-zinc-800 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Policy Definition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
