import React, { useState } from 'react';
import { useGovernance } from '../../hooks/trust-governance.js';
import { Card, RiskBadge, Button, Badge } from '../../components/ui/trust-ui.js';
import { SIEMExportFormat, AuditLogEntry } from '../../types/trust-governance.js';

export function AuditPage() {
  const { auditLogs, loading, error, refresh } = useGovernance();
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<SIEMExportFormat>('JSONL');
  const [showExportModal, setShowExportModal] = useState(false);

  const filteredLogs = auditLogs.filter(log => {
    const matchesRisk = filterRisk === 'ALL' || log.riskLevel === filterRisk;
    const matchesAction = !filterAction || log.action.toLowerCase().includes(filterAction.toLowerCase());
    const matchesAgent = !filterAgent || (log.agentName && log.agentName.toLowerCase().includes(filterAgent.toLowerCase()));
    return matchesRisk && matchesAction && matchesAgent;
  });

  const exportPayload = () => {
    if (exportFormat === 'JSONL') {
      return filteredLogs.map(l => JSON.stringify(l)).join('\n');
    } else if (exportFormat === 'CEF') {
      return filteredLogs.map(l => 
        `CEF:0|SynapseOS|ControlPlane|1.0|${l.action}|${l.action}|${l.riskLevel === 'CRITICAL' ? 10 : l.riskLevel === 'HIGH' ? 7 : 3}|msg=${l.resource} agent=${l.agentName || 'system'} hash=${l.tamperProofHash}`
      ).join('\n');
    } else {
      // Syslog RFC 5424
      return filteredLogs.map(l =>
        `<134>1 ${l.timestamp} synapse-os agent-runner - ${l.action} [synapse@12345 hash="${l.tamperProofHash}" risk="${l.riskLevel}"] ${l.resource}`
      ).join('\n');
    }
  };

  const handleDownload = () => {
    const data = exportPayload();
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse-audit-export-${exportFormat.toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Immutable Audit Trail</h1>
            <Badge variant="purple">Tamper-Evident SHA-256 Chain</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Chronological, verifiable timeline of all agent activities, human approvals, security blocks, and policy decisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowExportModal(true)}>
            Export to SIEM (CEF / Syslog / JSONL)
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Multi-Dimensional Filter Bar */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-mono mb-1">Filter by Risk Level</label>
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">CRITICAL only</option>
              <option value="HIGH">HIGH only</option>
              <option value="MEDIUM">MEDIUM only</option>
              <option value="LOW">LOW only</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">Filter Action Type</label>
            <input
              type="text"
              placeholder="e.g. APPROVAL, POLICY, VERIFICATION"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">Filter Agent / Actor</label>
            <input
              type="text"
              placeholder="e.g. Database Schema Agent"
              value={filterAgent}
              onChange={e => setFilterAgent(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setFilterRisk('ALL');
                setFilterAction('');
                setFilterAgent('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Timeline Stream */}
      <Card
        title={
          <div className="flex items-center justify-between w-full">
            <span>Audit Events ({filteredLogs.length})</span>
            <span className="text-xs font-mono text-zinc-400">Append-Only Cryptographic Log</span>
          </div>
        }
      >
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-zinc-800">
          {filteredLogs.map((entry: AuditLogEntry) => (
            <div key={entry.id} className="relative flex items-start gap-4 group">
              {/* Dot */}
              <div className="w-7 h-7 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-400 z-10 group-hover:border-cyan-400 group-hover:text-cyan-300 transition">
                ●
              </div>

              {/* Event Content */}
              <div className="flex-1 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-zinc-100">{entry.action}</span>
                    <RiskBadge level={entry.riskLevel} />
                    {entry.decision && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-300">
                        {entry.decision}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="text-xs text-zinc-300 flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-zinc-500 font-mono">Actor:</span>{' '}
                    <span className="text-zinc-200 font-medium">{entry.agentName || entry.userName || 'System'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-mono">Target:</span>{' '}
                    <span className="text-cyan-400 font-mono">{entry.resource}</span>
                  </div>
                </div>

                {entry.details && Object.keys(entry.details).length > 0 && (
                  <pre className="p-2.5 bg-black/60 border border-zinc-900 rounded text-[11px] font-mono text-zinc-400 overflow-x-auto">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                )}

                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-600">
                  <span className="truncate max-w-xs">SHA-256: {entry.tamperProofHash}</span>
                  <span>Prev: {entry.previousHash.substring(0, 10)}...</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* SIEM Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">Export Audit Log to Enterprise SIEM</h3>
              <button onClick={() => setShowExportModal(false)} className="text-zinc-400 hover:text-zinc-100">✕</button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono text-zinc-400">Target Standard Format</label>
              <div className="flex gap-3">
                {(['JSONL', 'CEF', 'Syslog'] as SIEMExportFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition ${
                      exportFormat === fmt
                        ? 'bg-cyan-500 text-black border-cyan-400'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-mono text-zinc-400 mb-1">Payload Preview</label>
                <textarea
                  readOnly
                  rows={8}
                  value={exportPayload()}
                  className="w-full p-3 bg-black border border-zinc-800 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setShowExportModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={handleDownload}>
                Download SIEM Export File
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
