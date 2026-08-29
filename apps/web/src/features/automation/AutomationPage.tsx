import React, { useState } from 'react';
import { useAutomation } from '../../hooks/trust-governance.js';
import { Card, Button, Badge } from '../../components/ui/trust-ui.js';
import { AutomationWorkflow, AutomationWorkflowStep } from '../../types/trust-governance.js';

export function AutomationPage() {
  const { workflows, loading, error, refresh, triggerWorkflow } = useAutomation();
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(workflows[0]?.id || 'wf-001');

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId) || workflows[0];

  const handleTrigger = async (wf: AutomationWorkflow) => {
    setTriggeringId(wf.id);
    try {
      await triggerWorkflow(wf.id);
    } finally {
      setTriggeringId(null);
    }
  };

  const getStepIcon = (type: AutomationWorkflowStep['type']) => {
    switch (type) {
      case 'TRIGGER': return '⚡';
      case 'AGENT_ACTION': return '🤖';
      case 'POLICY_GATE': return '🛡️';
      case 'VERIFICATION_CHECK': return '✓';
      case 'NOTIFICATION': return '🔔';
      default: return '●';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Automation & Orchestration Workflows</h1>
            <Badge variant="cyan">Multi-Step Autonomous Loops</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Automated schedules, webhook triggers, self-healing agent pipelines, and closed-loop verification policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh
          </Button>
          <Button variant="primary" size="sm">
            + New Automation Routine
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Grid: Workflows list on left, visual pipeline on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Workflows List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Configured Automations</h2>
          {workflows.map((wf) => {
            const isSelected = selectedWorkflow?.id === wf.id;
            return (
              <div
                key={wf.id}
                onClick={() => setSelectedWorkflowId(wf.id)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-zinc-100 truncate">{wf.name}</span>
                  <Badge variant={wf.enabled ? 'success' : 'default'}>
                    {wf.enabled ? 'ACTIVE' : 'PAUSED'}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{wf.description}</p>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                  <span>{wf.triggerType.replace('_', ' ')}</span>
                  <span>{wf.totalRuns} runs</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Visual Pipeline Flow (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedWorkflow ? (
            <Card
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-zinc-100">{selectedWorkflow.name}</span>
                    <Badge variant="cyan">{selectedWorkflow.triggerType}</Badge>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={triggeringId === selectedWorkflow.id}
                    onClick={() => handleTrigger(selectedWorkflow)}
                  >
                    {triggeringId === selectedWorkflow.id ? 'Dispatching...' : '▶ Run Now'}
                  </Button>
                </div>
              }
              subtitle={selectedWorkflow.description}
            >
              <div className="space-y-6">
                {/* Trigger Spec Info */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">TRIGGER CONFIGURATION</span>
                    <span className="text-cyan-400 font-semibold">
                      {selectedWorkflow.cronExpression || selectedWorkflow.webhookUrl || 'Manual dispatch'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">LAST RUN</span>
                    <span className="text-zinc-300">
                      {selectedWorkflow.lastRunAt ? new Date(selectedWorkflow.lastRunAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">STATUS</span>
                    <span className="text-emerald-400 font-bold">{selectedWorkflow.lastRunStatus || 'IDLE'}</span>
                  </div>
                </div>

                {/* Step By Step Visual Flow */}
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-zinc-800">
                  {selectedWorkflow.steps.map((step, idx) => (
                    <div key={step.id} className="relative flex items-center gap-4">
                      {/* Step Number Circle */}
                      <div className="w-12 h-12 rounded-xl bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center text-lg z-10 shadow-md">
                        {getStepIcon(step.type)}
                      </div>

                      {/* Step Details Box */}
                      <div className="flex-1 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-zinc-500">STEP {idx + 1}</span>
                            <Badge variant="purple">{step.type}</Badge>
                          </div>
                          <div className="text-sm font-semibold text-zinc-100 mt-1">{step.name}</div>
                        </div>

                        <div className="text-right">
                          <pre className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
                            {JSON.stringify(step.config)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <div className="py-24 text-center text-zinc-500">
              Select an automation routine on the left to view the visual workflow diagram.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
