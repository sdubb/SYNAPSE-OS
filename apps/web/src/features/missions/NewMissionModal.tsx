import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Shield, Bug, Zap, Cpu, Sparkles, CheckCircle2,
  ArrowRight, AlertTriangle, Play, HelpCircle, Layers, Plus, Trash2
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api/client';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

export interface CapabilityTemplate {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  prompt: string;
  suggestedPlan: string[];
}

export const CAPABILITY_TEMPLATES: CapabilityTemplate[] = [
  {
    id: 'security_audit',
    title: 'Security & Vulnerability Audit',
    category: 'Security & Governance',
    icon: <Shield className="w-4 h-4 text-emerald-400" />,
    riskLevel: 'MEDIUM',
    description: 'Scan repository for secrets, unauthenticated endpoints, and RBAC policy violations.',
    prompt: 'Perform a comprehensive security audit of all API endpoints and middleware. Identify unauthenticated paths and generate targeted security patches.',
    suggestedPlan: [
      'Inspect routes and middleware for authentication coverage',
      'Scan configuration and code for unredacted secret patterns',
      'Generate patch diffs for unhandled security boundaries',
      'Execute security regression verification suite',
    ],
  },
  {
    id: 'bug_diagnosis',
    title: 'Bug Diagnosis & Targeted Repair',
    category: 'Code Quality',
    icon: <Bug className="w-4 h-4 text-rose-400" />,
    riskLevel: 'LOW',
    description: 'Trace runtime exceptions, reproduce failing test assertions, and formulate targeted fixes.',
    prompt: 'Diagnose failing tests across the test suites, pinpoint root causes, apply minimal surgical fixes, and verify full green build.',
    suggestedPlan: [
      'Execute test suite to capture error stack traces',
      'Analyze code path and locate root cause in source files',
      'Apply minimal surgical patch preserving existing behavior',
      'Re-run tests to verify complete resolution with zero regressions',
    ],
  },
  {
    id: 'db_optimization',
    title: 'Database & SQL Performance',
    category: 'Infrastructure',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    riskLevel: 'HIGH',
    description: 'Analyze query execution plans, identify missing indexes, and generate migration scripts.',
    prompt: 'Inspect database queries and schema definitions. Identify table scans, missing indexes, and generate optimized migration scripts.',
    suggestedPlan: [
      'Analyze schema definitions and slow query patterns',
      'Identify unindexed foreign keys and join bottlenecks',
      'Generate versioned database migration scripts',
      'Run digital twin simulation to measure query latency improvements',
    ],
  },
  {
    id: 'feature_scaffold',
    title: 'Feature Implementation & API Design',
    category: 'Development',
    icon: <Cpu className="w-4 h-4 text-cyan-400" />,
    riskLevel: 'MEDIUM',
    description: 'Design new REST API endpoints, implement business logic, write tests, and document contract.',
    prompt: 'Implement a new feature with structured TypeScript types, controller routes, input validation, and unit tests.',
    suggestedPlan: [
      'Define type schemas and domain contracts',
      'Implement business logic service layer',
      'Register controller endpoints and error handling middleware',
      'Write unit and integration acceptance tests',
    ],
  },
  {
    id: 'test_suite_gen',
    title: 'Autonomous Test Suite Generator',
    category: 'Verification',
    icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    riskLevel: 'LOW',
    description: 'Generate complete unit and integration test coverage with zero mock illusions.',
    prompt: 'Analyze uncovered code modules and generate high-confidence acceptance test suites with strict cryptographic assertions.',
    suggestedPlan: [
      'Analyze module exports and uncover untested boundary cases',
      'Construct isolated test harnesses with realistic inputs',
      'Execute new tests against real runtime engine',
      'Record SHA-256 evidence hashes in audit ledger',
    ],
  },
  {
    id: 'code_refactor',
    title: 'Code Refactoring & Typing Hardening',
    category: 'Maintenance',
    icon: <Layers className="w-4 h-4 text-blue-400" />,
    riskLevel: 'LOW',
    description: 'Clean up code duplication, strengthen TypeScript types, and enforce clean architecture.',
    prompt: 'Refactor duplicated utility code, replace any types with strict interfaces, and verify zero compilation errors.',
    suggestedPlan: [
      'Inspect codebase for any types and duplicate logic',
      'Extract reusable helper utilities and strict interface definitions',
      'Verify zero TypeScript compiler diagnostics',
      'Run full test suite to guarantee zero regression',
    ],
  },
];

interface NewMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewMissionModal({ isOpen, onClose }: NewMissionModalProps) {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [customSteps, setCustomSteps] = useState<string[]>([]);
  const [newStepText, setNewStepText] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);

  // When a template is clicked
  const handleSelectTemplate = (tmpl: CapabilityTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setCustomPrompt(tmpl.prompt);
    setRiskLevel(tmpl.riskLevel);
    setCustomSteps([...tmpl.suggestedPlan]);
  };

  // Derive active plan steps
  const activePlanSteps = useMemo(() => {
    if (customSteps.length > 0) return customSteps;
    if (customPrompt.trim().length > 0) {
      return [
        '1. Inspect relevant codebase files and understand context',
        '2. Formulate execution strategy & propose DAG milestones',
        '3. Execute governed tool actions through ToolGateway',
        '4. Run verification tests & seal SHA-256 evidence record',
      ];
    }
    return [];
  }, [customSteps, customPrompt]);

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    setCustomSteps((prev) => [...prev, newStepText.trim()]);
    setNewStepText('');
  };

  const handleRemoveStep = (index: number) => {
    setCustomSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLaunch = async () => {
    const objective = customPrompt.trim();
    if (!objective) {
      error('Objective Required', 'Please enter what you want Synapse and Cline to achieve.');
      return;
    }

    setIsLaunching(true);
    try {
      const session = await apiClient.createSession({
        title: objective.slice(0, 60),
        objective,
        riskLevel,
        status: 'active',
      } as any);

      success('Mission Launched', `Cline Primary Brain initialized for: ${objective.slice(0, 45)}...`);
      onClose();
      navigate(`/missions/${session.id}`);
    } catch (err: any) {
      error('Launch Failed', err.message || 'Failed to create autonomous mission.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Launch Autonomous Mission</h2>
            <p className="text-xs text-slate-400 font-normal">
              State your desired outcome in plain English. Cline will break it down into governed DAG tasks.
            </p>
          </div>
        </div>
      }
      maxWidth="3xl"
    >
      <div className="space-y-5 p-1">
        {/* ── 1. CAPABILITY DISCOVERY PRESETS ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-semibold uppercase text-slate-400 tracking-wider">
              1. What do you want to accomplish? (Quick Presets)
            </span>
            {selectedTemplateId && (
              <button
                onClick={() => { setSelectedTemplateId(null); setCustomPrompt(''); setCustomSteps([]); }}
                className="text-[11px] font-mono text-cyan-400 hover:underline"
              >
                Clear Preset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {CAPABILITY_TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group',
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-400'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="p-1 rounded bg-slate-800 border border-slate-700">{tmpl.icon}</span>
                      <span className={cn(
                        'px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border',
                        tmpl.riskLevel === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                        tmpl.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      )}>
                        {tmpl.riskLevel} RISK
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {tmpl.title}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. NATURAL LANGUAGE INTENT INPUT ── */}
        <div>
          <label className="block text-[11px] font-mono font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
            2. Describe Desired Outcome or Custom Goal
          </label>
          <textarea
            rows={3}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Audit authentication middleware in apps/backend, add rate-limiting to login route, and write unit tests."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono transition-colors resize-none placeholder:text-slate-600"
          />
        </div>

        {/* ── 3. CLINE PROPOSED PLAN DECOMPOSITION (HUMAN ADVISOR) ── */}
        {activePlanSteps.length > 0 && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Cline Proposed Plan Decomposition ({activePlanSteps.length} Steps)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                You can review or customize before launch
              </span>
            </div>

            <div className="space-y-2">
              {activePlanSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono text-slate-300"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{step}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="Remove step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Custom Step Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom requirement or step..."
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); } }}
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 text-xs font-mono text-cyan-300 bg-cyan-950 border border-cyan-800 rounded-lg hover:bg-cyan-900 transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
          </div>
        )}

        {/* ── 4. FOOTER CONTROLS ── */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Primary Brain: <strong className="text-cyan-300">Cline</strong></span>
            <span>·</span>
            <span>Governance: <strong className="text-emerald-400">Synapse ToolGateway</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isLaunching}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleLaunch}
              disabled={isLaunching || !customPrompt.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4"
            >
              {isLaunching ? (
                'Initializing Cline...'
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Launch Mission
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
