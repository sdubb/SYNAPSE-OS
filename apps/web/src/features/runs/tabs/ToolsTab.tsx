import React from 'react';
import { ToolExecution } from '../../../types/index.js';
import { Wrench, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { RiskBadge, StatusBadge } from '../../../components/ui/index.js';

export const ToolsTab: React.FC<{ tools: ToolExecution[] }> = ({ tools }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            Tool Execution Matrix ({tools.length} Calls)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full record of all MCP, builtin, and external connector invocations with risk assessments.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Tool Name</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Parameters / Arguments</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {tools.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-cyan-300">
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">{t.toolName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge risk={t.riskLevel} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs">
                    <pre className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[11px] overflow-x-auto truncate">
                      {JSON.stringify(t.parameters)}
                    </pre>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{t.durationMs}ms</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {t.approvedBy || (t.riskLevel === 'low' ? 'Auto-Policy' : 'Operator')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
