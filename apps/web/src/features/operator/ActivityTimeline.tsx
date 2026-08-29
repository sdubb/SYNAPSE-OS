import React from 'react';
import { TechnicalDetails } from '../../types/run';
import { XCircleIcon, TerminalIcon, FileCodeIcon, CheckSquareIcon } from '../../components/common/Icons';

interface ActivityTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  details: TechnicalDetails;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ isOpen, onClose, details }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#161b22] border-l border-[#30363d] shadow-2xl z-50 flex flex-col justify-between text-slate-100 font-mono text-xs overflow-hidden backdrop-blur-lg">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/60">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-cyan-400" />
          <span className="font-bold text-sm uppercase tracking-wider text-white">TECHNICAL DETAILS DRAWER</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
        >
          <XCircleIcon size={18} />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        {/* Cline Session & Telemetry */}
        <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] flex flex-col gap-2">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Runtime Session</span>
          <div className="flex items-center justify-between text-slate-200">
            <span>Session ID:</span>
            <span className="text-cyan-300 font-semibold">{details.clineSessionId}</span>
          </div>
          {details.tokenUsage && (
            <div className="flex items-center justify-between text-slate-400 text-[11px] pt-2 border-t border-[#30363d]/60">
              <span>Tokens: {details.tokenUsage.promptTokens + details.tokenUsage.completionTokens}</span>
              <span className="text-emerald-400 font-bold">Est Cost: ${details.tokenUsage.totalCostUsd.toFixed(3)}</span>
            </div>
          )}
        </div>

        {/* Tools Used */}
        <div className="flex flex-col gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Active Tools Registered</span>
          <div className="flex flex-wrap gap-1.5">
            {details.tools.map((t, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded bg-[#21262d] text-cyan-300 border border-[#30363d]">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Files Read */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Files Read ({details.filesRead.length})</span>
            <FileCodeIcon size={14} className="text-slate-500" />
          </div>
          <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-3 divide-y divide-[#30363d]/50">
            {details.filesRead.length === 0 ? (
              <span className="text-slate-500">No files read yet.</span>
            ) : (
              details.filesRead.map((file, idx) => (
                <div key={idx} className="py-1 text-slate-300 truncate">
                  {file}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Files Modified */}
        <div className="flex flex-col gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Files Modified ({details.filesModified.length})</span>
          <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-3 divide-y divide-[#30363d]/50">
            {details.filesModified.length === 0 ? (
              <span className="text-slate-500">No files modified yet.</span>
            ) : (
              details.filesModified.map((file, idx) => (
                <div key={idx} className="py-1 text-amber-400 font-semibold truncate">
                  {file}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commands Run */}
        <div className="flex flex-col gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Commands Executed</span>
          <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-3 flex flex-col gap-1.5">
            {details.commands.length === 0 ? (
              <span className="text-slate-500">No commands run.</span>
            ) : (
              details.commands.map((cmd, idx) => (
                <div key={idx} className="text-cyan-400 bg-[#161b22] p-2 rounded border border-[#30363d]">
                  {cmd}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tests Summary */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Automated Verification Tests</span>
            <CheckSquareIcon size={14} className="text-emerald-400" />
          </div>
          <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-3 flex items-center justify-between">
            <span className="text-slate-300">Passed: {details.tests.passed} / {details.tests.total}</span>
            {details.tests.durationMs && (
              <span className="text-slate-500">Duration: {(details.tests.durationMs / 1000).toFixed(2)}s</span>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-[#30363d] bg-[#0d1117]/60 flex items-center justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
