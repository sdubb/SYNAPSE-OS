import React, { useState } from 'react';
import { Button, Badge, RiskBadge } from '../../components/ui/trust-ui.js';
import {
  WorldEntityNode,
  SimulationFaultInjection,
  MonteCarloSweepConfig,
  SimulationImpactAnalysis,
} from '../../types/trust-governance.js';

export function SimulationDrawer({
  isOpen,
  onClose,
  entities,
  onRunSimulation,
}: {
  isOpen: boolean;
  onClose: () => void;
  entities: WorldEntityNode[];
  onRunSimulation: (fault: SimulationFaultInjection, monteCarlo: MonteCarloSweepConfig) => Promise<SimulationImpactAnalysis>;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string>(entities[0]?.id || '');
  const [faultType, setFaultType] = useState<SimulationFaultInjection['faultType']>('OFFLINE');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [iterations, setIterations] = useState<number>(1000);
  const [concurrency, setConcurrency] = useState<number>(50);
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationImpactAnalysis | null>(null);

  if (!isOpen) return null;

  const targetEntity = entities.find(e => e.id === selectedEntityId) || entities[0];

  const handleExecute = async () => {
    if (!targetEntity) return;
    setRunning(true);
    try {
      const res = await onRunSimulation(
        {
          targetEntityId: targetEntity.id,
          targetEntityName: targetEntity.name,
          faultType,
          durationMinutes,
        },
        {
          iterations,
          concurrencyLevel: concurrency,
          failureRateVariations: [0.1, 0.25, 0.5, 0.8],
          trafficSpikeMultipliers: [1.0, 1.5, 2.0, 3.5],
        }
      );
      setResult(res);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-zinc-900 border-l border-zinc-700/80 shadow-2xl flex flex-col backdrop-blur-xl animate-slideLeft">
      {/* Drawer Header */}
      <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100">Digital Twin Simulation & What-If</h2>
            <Badge variant="purple">Monte Carlo Engine</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Inject synthetic outages, evaluate blast radius, and compute revenue/operational impacts.
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition"
        >
          ✕
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 1. Scenario Configuration */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">1. Fault Injection Setup</span>
          
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Target Entity / System</label>
            <select
              value={selectedEntityId}
              onChange={e => setSelectedEntityId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:border-cyan-500"
            >
              {entities.map(ent => (
                <option key={ent.id} value={ent.id}>
                  {ent.name} ({ent.type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Fault Mode</label>
              <select
                value={faultType}
                onChange={e => setFaultType(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-100 focus:border-cyan-500"
              >
                <option value="OFFLINE">Complete Outage (OFFLINE)</option>
                <option value="HIGH_LATENCY">High Latency Spike (+5000ms)</option>
                <option value="RATE_LIMIT_EXHAUSTION">HTTP 429 Rate Limit Exhaustion</option>
                <option value="DATA_CORRUPTION">Checksum Mismatch / Corruption</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Simulated Duration</label>
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-100 focus:border-cyan-500"
              >
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Monte Carlo Sweep Parameters */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">2. Monte Carlo Stochastic Sweep</span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-mono text-zinc-400 mb-1">Iterations (Runs)</label>
              <input
                type="number"
                value={iterations}
                onChange={e => setIterations(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-zinc-200"
              />
            </div>
            <div>
              <label className="block font-mono text-zinc-400 mb-1">Concurrency Multiplier</label>
              <input
                type="number"
                value={concurrency}
                onChange={e => setConcurrency(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-zinc-200"
              />
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full mt-2"
            disabled={running}
            onClick={handleExecute}
          >
            {running ? 'Running Stochastic Simulation...' : '▶ Run Digital Twin Simulation'}
          </Button>
        </div>

        {/* 3. Impact Analysis Result Box */}
        {result && (
          <div className="space-y-4 pt-4 border-t border-zinc-800 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Simulation Impact Analysis</span>
              <RiskBadge level={result.riskLevel} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Expected Payment Failures</span>
                <span className="text-xl font-bold font-mono text-rose-400">+{result.expectedFailedPaymentsPercent}%</span>
              </div>
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Orders Disrupted</span>
                <span className="text-xl font-bold font-mono text-amber-400">{result.ordersAffected.toLocaleString()}</span>
              </div>
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Est. Revenue Impact</span>
                <span className="text-xl font-bold font-mono text-rose-300">${result.estimatedRevenueImpactUsd.toLocaleString()}</span>
              </div>
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Confidence Level</span>
                <span className="text-xl font-bold font-mono text-cyan-400">{result.monteCarloConfidence}%</span>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Downstream Cascading Services:</span>
                <span className="text-rose-400 font-mono font-bold">{result.downstreamServicesAffectedCount} affected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.affectedServiceNames.map((svc, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono text-[11px]">
                    {svc}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
              <span className="font-semibold text-zinc-200 block mb-1">Autonomous Recommendation:</span>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={result.recommendation === 'ABORT' ? 'danger' : result.recommendation === 'REVISE' ? 'warning' : 'success'}>
                  {result.recommendation}
                </Badge>
              </div>
              <p>{result.summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
