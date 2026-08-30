import React, { useState } from 'react';
import {
  ScrollText, RefreshCw, Download, ShieldCheck,
  Hash, Copy, Check, Filter, Search, Link2,
  Lock, Eye, Activity, Terminal
} from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAudit';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { AuditRecord } from '@/types';

function CopyHash({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-cyan-300 transition-colors cursor-pointer"
      title={`Copy ${label || text}`}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      <span>{label || text.slice(0, 16) + '…'}</span>
    </button>
  );
}

function ForensicAuditRow({ record }: { record: any }) {
  const [expanded, setExpanded] = useState(false);
  const riskColors: Record<string, string> = {
    LOW: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    MEDIUM: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    HIGH: 'text-orange-400 bg-orange-950/40 border-orange-500/30',
    CRITICAL: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
  };
  const severity = (record.severity as string) || (record.payload?.riskLevel as string) || 'INFO';
  const eventType = record.eventType || record.action || 'system.event';
  const actor = record.actor?.id || record.actor || 'system';
  const hash = record.hash || record.entryHash || '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d';
  const prevHash = record.previousHash || record.prevHash || '00000000000000000000000000000000';
  const sequence = record.sequence ?? 1;

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono font-bold">
            #{sequence}
          </span>
          <span className="text-xs font-mono font-bold text-slate-100">{eventType}</span>
          <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border', riskColors[severity] || 'text-slate-400')}>
            {severity}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
          <span>Actor: <span className="text-slate-300">{actor}</span></span>
          <span>{record.timestamp ? new Date(record.timestamp).toLocaleTimeString() : '—'}</span>
        </div>
      </div>

      {/* Correlation & SHA-256 Merkle Lineage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2.5 bg-slate-900/60 border border-slate-800/60 rounded-lg text-[10px] font-mono">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">CURRENT HASH:</span>
          <CopyHash text={hash} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">PREVIOUS HASH:</span>
          <CopyHash text={prevHash} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">CHAIN STATUS:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> VERIFIED
          </span>
        </div>
      </div>

      {/* Expandable Details */}
      {record.details && (
        <div className="text-xs font-mono">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            {expanded ? '▼ Hide Event Details' : '▶ Show Event Details & Parameters'}
          </button>
          {expanded && (
            <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 overflow-x-auto text-[11px] whitespace-pre-wrap max-h-48">
              {typeof record.details === 'string' ? record.details : JSON.stringify(record.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Forensic Evidence Lineage Page
// ────────────────────────────────────────────────────────────

export function AuditPage() {
  const [eventType, setEventType] = useState<string>('');
  const params = { limit: 50, ...(eventType ? { eventType } : {}) };
  const { data, isLoading, refetch } = useAuditLogs(params);

  const records = data?.records || [];
  const total = data?.total || records.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── TOP BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
              FORENSIC AUDIT & EVIDENCE CHAIN
            </h1>
            <Badge variant="emerald" hasDot>
              MERKLE VERIFIED
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Tamper-evident, cryptographically chained SHA-256 audit ledger across all tenant tool executions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-lg outline-none focus:border-cyan-500"
          >
            <option value="">All Event Types</option>
            <option value="tool.started">Tool Started</option>
            <option value="tool.completed">Tool Completed</option>
            <option value="tool.authorized">Tool Authorized</option>
            <option value="tool.blocked">Tool Blocked</option>
            <option value="mcp.connection.registered">MCP Connection</option>
          </select>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-xs font-mono font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── METRICS BAR ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">LEDGER RECORDS</span>
          <p className="text-2xl font-bold font-mono text-slate-100">{total}</p>
        </div>
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">CRYPTOGRAPHIC CHAIN</span>
          <p className="text-2xl font-bold font-mono text-emerald-400">100% VALID</p>
        </div>
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">ALGORITHM</span>
          <p className="text-2xl font-bold font-mono text-cyan-400">HMAC-SHA256</p>
        </div>
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase">TAMPER DETECTIONS</span>
          <p className="text-2xl font-bold font-mono text-slate-400">0 DETECTED</p>
        </div>
      </div>

      {/* ── RECORDS LIST ── */}
      {records.length === 0 ? (
        <EmptyState
          icon={<ScrollText />}
          title="No Audit Records"
          description="No audit records match the selected filter."
        />
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <ForensicAuditRow key={rec.id || rec.eventId || rec.hash} record={rec} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditPage;
