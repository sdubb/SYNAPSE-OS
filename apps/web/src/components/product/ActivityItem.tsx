import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock, Wrench, Shield, Terminal } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { EvidenceBlock } from './EvidenceBlock';

export interface ActivityItemProps {
  id: string;
  summary: string;
  reason?: string;
  actor?: string;
  timestamp?: string;
  durationMs?: number;
  status?: 'SUCCESS' | 'RUNNING' | 'FAILED' | 'PENDING' | 'BLOCKED';
  toolName?: string;
  technicalDetails?: {
    filesRead?: string[];
    filesModified?: string[];
    commandsRun?: string[];
    testsOutput?: string;
    rawPayload?: Record<string, unknown>;
  };
  className?: string;
}

export function ActivityItem({
  summary,
  reason,
  actor = 'Cline',
  timestamp,
  durationMs,
  status = 'SUCCESS',
  toolName,
  technicalDetails,
  className,
}: ActivityItemProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    switch (status) {
      case 'RUNNING':
        return <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
        </span>;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'BLOCKED':
        return <Shield className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'SUCCESS':
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
  };

  const hasTechnicalData = Boolean(
    technicalDetails &&
      (technicalDetails.filesRead?.length ||
        technicalDetails.filesModified?.length ||
        technicalDetails.commandsRun?.length ||
        technicalDetails.testsOutput ||
        technicalDetails.rawPayload)
  );

  return (
    <div
      className={cn(
        'p-3.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900/90 transition-all text-xs',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5">{getStatusIcon()}</div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-100">{summary}</span>
              {toolName && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 font-mono text-[10px] border border-slate-700">
                  <Wrench className="w-2.5 h-2.5" />
                  {toolName}
                </span>
              )}
            </div>

            {reason && (
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {reason}
              </p>
            )}

            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pt-1">
              <span>{actor}</span>
              {timestamp && <span>{formatRelativeTime(timestamp)}</span>}
              {durationMs && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {durationMs}ms
                </span>
              )}
            </div>
          </div>
        </div>

        {hasTechnicalData && (
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium shrink-0 pt-0.5"
          >
            <span>{showDetails ? 'Hide' : 'Details'}</span>
            {showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {showDetails && technicalDetails && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 animate-fade-in">
          {technicalDetails.commandsRun && technicalDetails.commandsRun.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 font-mono">
                <Terminal className="w-3 h-3" /> Commands Executed:
              </span>
              <div className="space-y-1">
                {technicalDetails.commandsRun.map((cmd, idx) => (
                  <div key={idx} className="bg-slate-950 p-2 rounded text-cyan-300 font-mono text-[11px]">
                    $ {cmd}
                  </div>
                ))}
              </div>
            </div>
          )}

          {technicalDetails.filesModified && technicalDetails.filesModified.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono">
                Files Modified:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {technicalDetails.filesModified.map((f, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-emerald-300 rounded font-mono text-[10px]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {technicalDetails.testsOutput && (
            <EvidenceBlock
              title="Test Results & Verification Logs"
              type="test"
              content={technicalDetails.testsOutput}
              defaultOpen
            />
          )}

          {technicalDetails.rawPayload && (
            <EvidenceBlock
              title="Full Trace Payload"
              type="json"
              content={technicalDetails.rawPayload}
            />
          )}
        </div>
      )}
    </div>
  );
}
