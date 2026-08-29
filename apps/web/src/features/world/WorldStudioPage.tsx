import React, { useState } from 'react';
import { useWorldStudio } from '../../hooks/trust-governance.js';
import { Card, Badge, Button } from '../../components/ui/trust-ui.js';
import { SimulationDrawer } from './SimulationDrawer.js';
import { WorldEntityNode } from '../../types/trust-governance.js';

export function WorldStudioPage() {
  const { entities, relationships, snapshots, loading, error, refresh, runSimulation } = useWorldStudio();

  // Canvas Mode Toolbar State
  const [canvasMode, setCanvasMode] = useState<'LIVE' | 'SIMULATE' | 'SCENARIOS' | 'TIME_TRAVEL' | 'COMPARE'>('LIVE');
  const [isSimulationDrawerOpen, setIsSimulationDrawerOpen] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<WorldEntityNode | null>(null);
  const [timeScrubberIndex, setTimeScrubberIndex] = useState<number>(2);

  const handleNodeClick = (ent: WorldEntityNode) => {
    setSelectedEntity(ent);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">World Studio & Digital Twin</h1>
            <Badge variant={canvasMode === 'LIVE' ? 'success' : canvasMode === 'SIMULATE' ? 'purple' : 'cyan'}>
              {canvasMode === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />}
              {canvasMode} MODE
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Dynamic relational architecture graph, live telemetry sync, time-machine snapshot scrubbing, and what-if outage simulation.
          </p>
        </div>

        {/* Canvas Toolbar */}
        <div className="flex flex-wrap items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
          {(['LIVE', 'SIMULATE', 'SCENARIOS', 'TIME_TRAVEL', 'COMPARE'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setCanvasMode(mode);
                if (mode === 'SIMULATE') setIsSimulationDrawerOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                canvasMode === mode
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSimulationDrawerOpen(true)}
            className="ml-2"
          >
            + What-If Scenario
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Time Travel Historical Scrubber Bar */}
      {(canvasMode === 'TIME_TRAVEL' || canvasMode === 'COMPARE') && (
        <div className="p-4 bg-zinc-950/90 rounded-xl border border-cyan-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400">TIME MACHINE:</span>
            <span className="text-xs text-zinc-300">
              {snapshots[timeScrubberIndex]?.label || 'Current Snapshot'}
            </span>
          </div>
          <div className="flex-1 max-w-xl flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-500">T-45m</span>
            <input
              type="range"
              min={0}
              max={snapshots.length - 1}
              step={1}
              value={timeScrubberIndex}
              onChange={e => setTimeScrubberIndex(Number(e.target.value))}
              className="flex-1 accent-cyan-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-cyan-400 font-bold">NOW</span>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            Checksum: {snapshots[timeScrubberIndex]?.checksumSha256.substring(0, 10)}...
          </div>
        </div>
      )}

      {/* Main Graph Canvas Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
        {/* Interactive ER Graph Canvas (8 or 9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-zinc-950 rounded-2xl border border-zinc-800 relative overflow-hidden flex flex-col shadow-inner">
          {/* Canvas Background Grid Pattern */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Canvas Header info */}
          <div className="p-4 z-10 flex items-center justify-between pointer-events-none">
            <span className="text-xs font-mono text-zinc-500 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800">
              Topology: Production Payment & Order Fabric • {entities.length} Nodes • {relationships.length} Links
            </span>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800">
              Zoom: 100% • Drag to Pan
            </span>
          </div>

          {/* Visual Nodes and Connections */}
          <div className="flex-1 relative p-8">
            {/* SVG Connecting Edges */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#0284c7" />
                </marker>
              </defs>
              {relationships.map((rel) => {
                const srcNode = entities.find(e => e.id === rel.source);
                const tgtNode = entities.find(e => e.id === rel.target);
                if (!srcNode || !tgtNode) return null;

                return (
                  <g key={rel.id}>
                    <line
                      x1={srcNode.x + 80}
                      y1={srcNode.y + 35}
                      x2={tgtNode.x + 80}
                      y2={tgtNode.y + 35}
                      stroke={rel.status === 'ACTIVE' ? '#0284c7' : '#e11d48'}
                      strokeWidth="2"
                      strokeDasharray={canvasMode === 'SIMULATE' ? '4 4' : undefined}
                      markerEnd="url(#arrowhead)"
                      className="transition-all"
                    />
                    <text
                      x={(srcNode.x + tgtNode.x) / 2 + 80}
                      y={(srcNode.y + tgtNode.y) / 2 + 25}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="bg-black px-1"
                    >
                      {rel.type} ({rel.latencyMs}ms)
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Interactive Node Cards */}
            {entities.map((ent) => {
              const isSelected = selectedEntity?.id === ent.id;
              const isSimFail = ent.status === 'SIMULATED_FAIL';

              return (
                <div
                  key={ent.id}
                  onClick={() => handleNodeClick(ent)}
                  style={{ left: `${ent.x}px`, top: `${ent.y}px` }}
                  className={`absolute w-44 p-3 rounded-xl border backdrop-blur-md transition-all cursor-pointer select-none group shadow-lg ${
                    isSelected
                      ? 'bg-zinc-900 border-cyan-400 ring-2 ring-cyan-400/20 scale-105 z-20'
                      : isSimFail
                      ? 'bg-rose-950/80 border-rose-600 animate-pulse z-10'
                      : 'bg-zinc-900/90 border-zinc-700/80 hover:border-zinc-500 hover:scale-102 z-10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase truncate">
                      {ent.type}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSimFail
                          ? 'bg-rose-500'
                          : ent.status === 'HEALTHY'
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <div className="text-xs font-bold text-zinc-100 truncate group-hover:text-cyan-300">
                    {ent.name}
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>{ent.metrics.latencyMs}ms</span>
                    <span>{ent.metrics.throughputRps} rps</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Entity Inspector Side Panel (4 or 3 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card
            title={selectedEntity ? selectedEntity.name : 'Entity Inspector'}
            subtitle={selectedEntity ? `Type: ${selectedEntity.type}` : 'Click any node on the graph to inspect runtime state'}
          >
            {selectedEntity ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-zinc-500 font-mono block text-[11px] uppercase mb-1">Health & Status</span>
                  <Badge variant={selectedEntity.status === 'HEALTHY' ? 'success' : 'danger'}>
                    {selectedEntity.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-zinc-500 font-mono block text-[11px] uppercase">Telemetry Metrics</span>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                      <span className="text-zinc-600 block text-[10px]">LATENCY</span>
                      <span className="text-zinc-200">{selectedEntity.metrics.latencyMs} ms</span>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                      <span className="text-zinc-600 block text-[10px]">ERROR RATE</span>
                      <span className="text-zinc-200">{(selectedEntity.metrics.errorRate * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-zinc-500 font-mono block text-[11px] uppercase">Config Properties</span>
                  <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto">
                    {JSON.stringify(selectedEntity.properties, null, 2)}
                  </pre>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setIsSimulationDrawerOpen(true)}
                >
                  Inject Fault Into {selectedEntity.name}
                </Button>
              </div>
            ) : (
              <div className="py-16 text-center text-zinc-500 text-xs">
                Select an entity in the graph to view live metrics, connections, constraints, and dependencies.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Simulation Drawer Modal */}
      <SimulationDrawer
        isOpen={isSimulationDrawerOpen}
        onClose={() => setIsSimulationDrawerOpen(false)}
        entities={entities}
        onRunSimulation={runSimulation}
      />
    </div>
  );
}
