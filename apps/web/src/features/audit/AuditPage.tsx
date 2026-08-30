import React, { useState } from 'react';
import { ScrollText, RefreshCw, Download } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAudit';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

function AuditRow({ record }: { record: any }) {
  const riskColors: Record<string, string> = {
    LOW: 'text-emerald-400',
    MEDIUM: 'text-amber-400',
    HIGH: 'text-orange-400',
    CRITICAL: 'text-rose-400',
  };
  const riskLevel = (record.payload?.riskLevel as string) || 'LOW';

  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn('text-[10px] font-mono font-bold', riskColors[riskLevel] || 'text-slate-400')}>
            {riskLevel}
          </span>
          <span className="text-xs font-mono text-slate-200">{record.eventType || record.action || 'unknown'}</span>
          <span className="text-[10px] text-slate-500">by {record.actor || record.actorId || 'system'}</span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">
          {record.timestamp ? new Date(record.timestamp).toLocaleString() : '—'}
        </span>
      </div>
      {record.hash && (
        <div className="mt-2 text-[10px] text-slate-600 font-mono flex items-center gap-4">
          <span>Hash: {record.hash.slice(0, 16)}…</span>
          {record.previousHash && <span>Prev: {record.previousHash.slice(0, 16)}…</span>}
          {record.sequence !== undefined && <span>Seq: #{record.sequence}</span>}
        </div>
      )}
    </div>
  );
}

export function AuditPage() {
  const [eventType, setEventType] = useState<string>('');
  const params = { limit: 50, ...(eventType ? { eventType } : {}) };
  const { data, isLoading, refetch } = useAuditLogs(params);

  const records = data?.records || [];
  const total = data?.total || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} event{total !== 1 ? 's' : ''} · SHA-256 tamper-proof chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none"
          >
            <option value="">All Events</option>
            <option value="tool.started">Tool Started</option>
            <option value="tool.completed">Tool Completed</option>
            <option value="approval.required">Approval Required</option>
            <option value="verification.passed">Verification Passed</option>
            <option value="verification.failed">Verification Failed</option>
            <option value="audit.entry_recorded">Audit Entry</option>
          </select>
          <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<ScrollText />}
          title="No audit events"
          description="No audit records found. Events are recorded as agents execute tools, make decisions, and complete tasks."
        />
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <AuditRow key={record.id || record.eventId} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
