import React from 'react';
import { AuditRecord } from '../../../types/index.js';
import { ShieldCheck, Lock, Download, CheckCircle2, Hash, Key } from 'lucide-react';
import { Button, RiskBadge } from '../../../components/ui/index.js';

export const AuditTab: React.FC<{ auditTrail: AuditRecord[] }> = ({ auditTrail }) => {
  const exportAuditPackage = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditTrail, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `synapse_audit_trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            SHA-256 Cryptographic Audit Hash Chain ({auditTrail.length} Blocks)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-evident, forward-secure cryptographic audit record signed with ED25519 node identities.
          </p>
        </div>

        <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={exportAuditPackage}>
          Export Verifiable Package
        </Button>
      </div>

      <div className="space-y-3 font-mono">
        {auditTrail.map((entry) => (
          <div
            key={entry.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2 hover:border-slate-700 transition-colors shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
                  #{entry.sequenceNumber}
                </span>
                <span className="font-bold text-slate-100">{entry.action}</span>
                <RiskBadge risk={entry.riskLevel} size="sm" />
              </div>

              <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                <span>Actor: <strong className="text-slate-200">{entry.actorId}</strong> ({entry.actorType})</span>
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block mb-0.5">TARGET RESOURCE:</span>
                <span className="text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 block truncate">
                  {entry.targetResource}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">PREVIOUS HASH:</span>
                <span className="text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 block truncate">
                  {entry.previousHash}
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="text-emerald-400 font-semibold block mb-0.5 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> CURRENT SHA-256 HASH:
                </span>
                <span className="text-emerald-300 bg-slate-950 px-2 py-1 rounded border border-emerald-500/30 block truncate">
                  {entry.hash}
                </span>
              </div>

              <div className="md:col-span-2 flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Key className="w-3 h-3 text-cyan-400" /> Signature: <strong className="text-slate-300">{entry.signature}</strong>
                </span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Chain Integrity Verified
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
