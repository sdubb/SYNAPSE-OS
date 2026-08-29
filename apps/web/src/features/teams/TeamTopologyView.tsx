import React, { useState } from 'react';
import { TeamTopologyData, TopologyNode } from '../../types/index.js';
import {
  Users,
  Bot,
  CheckSquare,
  Sparkles,
  Activity,
  Layers,
  Cpu,
  Coins,
  ChevronRight,
  Shield,
  X,
  Play,
  Terminal,
} from 'lucide-react';
import { StatusBadge, Button, MetricCard } from '../../components/ui/index.js';

export const TeamTopologyView: React.FC<{
  topology: TeamTopologyData;
  onSelectRun?: (runId: string) => void;
  onSelectTask?: (taskId: string) => void;
  onSelectAgent?: (agentId: string) => void;
}> = ({ topology, onSelectRun, onSelectTask, onSelectAgent }) => {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  const missionNode = topology.nodes.find((n) => n.type === 'mission');
  const coordinatorNode = topology.nodes.find((n) => n.type === 'coordinator');
  const subagentNodes = topology.nodes.filter((n) => n.type === 'subagent');
  const taskNodes = topology.nodes.filter((n) => n.type === 'task');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Dynamic Multi-Agent Hierarchy & Topology Graph
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any node to inspect real-time agent telemetry, session metrics, and live task activities.
          </p>
        </div>
      </div>

      {/* Interactive Topology Graph Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 relative overflow-hidden shadow-inner min-h-[520px] flex flex-col justify-between">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#06b6d4 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* 1. MISSION LEVEL (ROOT) */}
        <div className="flex justify-center relative z-10">
          {missionNode && (
            <div
              onClick={() => setSelectedNode(missionNode)}
              className={`p-4 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-2 rounded-2xl text-center max-w-md cursor-pointer transition-all shadow-xl ${
                selectedNode?.id === missionNode.id
                  ? 'border-cyan-400 shadow-cyan-950/80 scale-105'
                  : 'border-cyan-500/40 hover:border-cyan-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-cyan-300 font-mono text-xs uppercase font-bold mb-1">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Team Mission Target
              </div>
              <h4 className="text-sm font-bold text-slate-100">{missionNode.label}</h4>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">{topology.mission}</p>
            </div>
          )}
        </div>

        {/* DOWN CONNECTOR 1 */}
        <div className="flex justify-center items-center py-2 relative z-10">
          <div className="h-8 w-0.5 bg-gradient-to-b from-cyan-500 to-indigo-500 animate-pulse" />
        </div>

        {/* 2. COORDINATOR LEVEL */}
        <div className="flex justify-center relative z-10">
          {coordinatorNode && (
            <div
              onClick={() => setSelectedNode(coordinatorNode)}
              className={`p-4 bg-indigo-950/50 border-2 rounded-2xl text-center max-w-sm cursor-pointer transition-all shadow-lg ${
                selectedNode?.id === coordinatorNode.id
                  ? 'border-indigo-400 shadow-indigo-950/80 scale-105'
                  : 'border-indigo-500/40 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-mono text-xs uppercase font-bold mb-1">
                <Bot className="w-4 h-4 text-indigo-400" /> Coordinator Agent
              </div>
              <h4 className="text-sm font-bold text-slate-100">{coordinatorNode.label}</h4>
              <span className="text-xs font-mono text-slate-400 block mt-0.5">{coordinatorNode.subtitle}</span>
              <div className="mt-2 flex justify-center">
                <StatusBadge status="running" size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* DOWN CONNECTOR 2 */}
        <div className="flex justify-center items-center py-2 relative z-10">
          <div className="h-8 w-0.5 bg-gradient-to-b from-indigo-500 to-cyan-500 animate-pulse" />
        </div>

        {/* 3. DYNAMIC SUB-AGENTS LEVEL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center relative z-10">
          {subagentNodes.map((agentNode) => (
            <div
              key={agentNode.id}
              onClick={() => setSelectedNode(agentNode)}
              className={`p-4 bg-slate-900/90 border rounded-xl text-center cursor-pointer transition-all shadow-md ${
                selectedNode?.id === agentNode.id
                  ? 'border-cyan-400 shadow-cyan-950/60 scale-105'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                  Dynamic Subagent
                </span>
                <StatusBadge status={agentNode.health || 'healthy'} size="sm" />
              </div>
              <h5 className="text-xs font-bold text-slate-100">{agentNode.label}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">{agentNode.subtitle}</p>

              <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Tokens: {(agentNode.tokensUsed || 0).toLocaleString()}</span>
                <span className="text-emerald-400 font-semibold">${(agentNode.costUsd || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* DOWN CONNECTOR 3 */}
        <div className="flex justify-center items-center py-2 relative z-10">
          <div className="h-8 w-0.5 bg-slate-800" />
        </div>

        {/* 4. TASK ASSIGNMENTS LEVEL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-center relative z-10">
          {taskNodes.map((taskNode) => (
            <div
              key={taskNode.id}
              onClick={() => setSelectedNode(taskNode)}
              className={`p-3 bg-slate-900 border rounded-xl text-center cursor-pointer transition-all text-xs ${
                selectedNode?.id === taskNode.id
                  ? 'border-cyan-400 shadow-cyan-950/60'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono text-slate-500">{taskNode.taskId || 'Task'}</span>
                <StatusBadge status={taskNode.status} size="sm" />
              </div>
              <span className="font-semibold text-slate-200 block truncate">{taskNode.label}</span>
              <span className="text-[10px] text-slate-400 block truncate mt-0.5">{taskNode.subtitle}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Node Drawer / Inspector Modal */}
      {selectedNode && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                {selectedNode.type === 'mission' ? (
                  <Sparkles className="w-5 h-5" />
                ) : selectedNode.type === 'coordinator' || selectedNode.type === 'subagent' ? (
                  <Bot className="w-5 h-5" />
                ) : (
                  <CheckSquare className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">{selectedNode.label}</h4>
                <span className="text-xs font-mono text-cyan-400 uppercase">{selectedNode.type} Node</span>
              </div>
            </div>

            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-200 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block mb-0.5">ACTIVE STATUS:</span>
              <StatusBadge status={selectedNode.status} size="sm" />
            </div>

            {selectedNode.tokensUsed !== undefined && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">TOKENS USED:</span>
                <span className="text-slate-200 font-bold">{selectedNode.tokensUsed.toLocaleString()}</span>
              </div>
            )}

            {selectedNode.costUsd !== undefined && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block mb-0.5">ACCUMULATED COST:</span>
                <span className="text-emerald-400 font-bold">${selectedNode.costUsd.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {selectedNode.activeRunId && onSelectRun && (
              <Button
                size="sm"
                variant="primary"
                icon={<Terminal className="w-3.5 h-3.5" />}
                onClick={() => onSelectRun(selectedNode.activeRunId!)}
              >
                Inspect Live Run
              </Button>
            )}

            {selectedNode.agentId && onSelectAgent && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Bot className="w-3.5 h-3.5" />}
                onClick={() => onSelectAgent(selectedNode.agentId!)}
              >
                View Agent Profile
              </Button>
            )}

            {selectedNode.taskId && onSelectTask && (
              <Button
                size="sm"
                variant="secondary"
                icon={<CheckSquare className="w-3.5 h-3.5" />}
                onClick={() => onSelectTask(selectedNode.taskId!)}
              >
                View Task Details
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
