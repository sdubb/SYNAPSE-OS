import React, { useState } from 'react';
import { InfrastructureNode } from '../../types/run';
import { NetworkIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from '../../components/common/Icons';

interface InfrastructureGraphProps {
  nodes: InfrastructureNode[];
}

export const InfrastructureGraph: React.FC<InfrastructureGraphProps> = ({ nodes }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id || null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon size={14} className="text-emerald-400" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangleIcon size={14} className="text-amber-400" />;
      default:
        return <XCircleIcon size={14} className="text-rose-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NetworkIcon size={16} className="text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">INFRASTRUCTURE TOPOLOGY</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">{nodes.length} Nodes Discovered</span>
      </div>

      {/* Graph Visual Canvas */}
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6 bg-[#090d13]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-[#161b22] border-cyan-500 shadow-lg ring-1 ring-cyan-500/50'
                    : 'bg-[#161b22]/70 border-[#30363d] hover:border-slate-500 hover:bg-[#161b22]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(node.status)}
                    <span className="font-semibold text-white text-xs">{node.name}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#0d1117] text-slate-400 font-mono uppercase">
                    {node.type}
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-[11px] font-mono text-slate-400 pt-2 border-t border-[#30363d]/60">
                  {Object.entries(node.metadata).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-slate-500">{k}:</span>
                      <span className="text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>

                {node.dependencies.length > 0 && (
                  <div className="text-[10px] text-slate-500 pt-1">
                    ↳ Connects to: {node.dependencies.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="mt-auto bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Node Inspector: {selectedNode.name}
              </span>
              <span className="text-emerald-400 font-mono uppercase text-[11px]">
                ● Status: {selectedNode.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-300 font-mono text-[11px] pt-1">
              <div>
                <span className="text-slate-500 block">ID:</span>
                <span>{selectedNode.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Type:</span>
                <span>{selectedNode.type}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Dependencies:</span>
                <span>{selectedNode.dependencies.length} upstream nodes</span>
              </div>
              <div>
                <span className="text-slate-500 block">Live Monitoring:</span>
                <span className="text-cyan-400">Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
