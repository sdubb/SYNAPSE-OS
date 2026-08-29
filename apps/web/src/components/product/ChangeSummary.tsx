import React from 'react';
import { FileCode, Plus, Minus, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status?: 'modified' | 'added' | 'deleted';
}

export interface ChangeSummaryProps {
  filesCount: number;
  additionsCount: number;
  deletionsCount: number;
  safetyStatus?: 'SAFE' | 'NEEDS_APPROVAL' | 'VIOLATION';
  testStatus?: 'PASSED' | 'FAILED' | 'PENDING';
  files?: FileChange[];
  className?: string;
}

export function ChangeSummary({
  filesCount,
  additionsCount,
  deletionsCount,
  safetyStatus = 'SAFE',
  testStatus = 'PASSED',
  files = [],
  className,
}: ChangeSummaryProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3.5',
        className
      )}
    >
      {/* Metric headers */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>{filesCount} {filesCount === 1 ? 'file' : 'files'} changed</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
              <Plus className="w-3 h-3 mr-0.5" />
              {additionsCount}
            </span>
            <span className="flex items-center text-rose-400 font-semibold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-500/30">
              <Minus className="w-3 h-3 mr-0.5" />
              {deletionsCount}
            </span>
          </div>
        </div>

        {/* Safety & test statuses */}
        <div className="flex items-center gap-2 flex-wrap">
          {safetyStatus === 'SAFE' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shadow-glow-emerald">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Policy Safe
            </span>
          )}
          {safetyStatus === 'NEEDS_APPROVAL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-500/30 shadow-glow-amber">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Requires Approval
            </span>
          )}
          {testStatus === 'PASSED' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Tests Passed
            </span>
          )}
        </div>
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950/50 hover:bg-slate-950 transition-colors font-mono"
            >
              <span className="text-slate-300 truncate max-w-sm">{file.path}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-emerald-400">+{file.additions}</span>
                <span className="text-rose-400">-{file.deletions}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
