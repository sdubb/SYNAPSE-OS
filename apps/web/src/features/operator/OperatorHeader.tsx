import React, { useState } from 'react';
import { RunStatus, Environment } from '../../types/run';
import { ShieldAlertIcon, PauseIcon, PlayIcon } from '../../components/common/Icons';

interface OperatorHeaderProps {
  runId: string;
  taskTitle: string;
  agentName: string;
  environment: Environment;
  status: RunStatus;
  onPause?: () => void;
  onResume?: () => void;
  onEmergencyHalt?: () => void;
  onOpenDetails?: () => void;
}

export const OperatorHeader: React.FC<OperatorHeaderProps> = ({
  taskTitle,
  agentName,
  environment,
  status,
  onPause,
  onResume,
  onEmergencyHalt,
  onOpenDetails,
}) => {
  const [showHaltConfirm, setShowHaltConfirm] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case 'EXECUTING':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-700 shadow-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            RUNNING
          </span>
        );
      case 'PAUSED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            PAUSED
          </span>
        );
      case 'VERIFYING':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            VERIFYING
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-950 text-orange-400 border border-orange-700 animate-pulse">
            AWAITING APPROVAL
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900 text-emerald-300 border border-emerald-700">
            COMPLETED
          </span>
        );
      case 'CANCELLED':
      case 'FAILED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-700">
            HALTED / FAILED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-700">
            {status}
          </span>
        );
    }
  };

  const getEnvBadge = () => {
    switch (environment) {
      case 'Production':
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800">
            PROD
          </span>
        );
      case 'Staging':
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800">
            STAGING
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            DEV
          </span>
        );
    }
  };

  return (
    <header className="bg-[#161b22] border-b border-[#30363d] px-6 py-3.5 flex items-center justify-between shadow-md">
      {/* Left: Status & Identity */}
      <div className="flex items-center gap-4">
        {getStatusBadge()}
        {getEnvBadge()}

        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-mono">
            {agentName}
          </span>
          <span className="text-slate-600 font-bold">/</span>
          <h1 className="text-sm font-semibold text-white truncate max-w-md md:max-w-xl" title={taskTitle}>
            {taskTitle}
          </h1>
        </div>
      </div>

      {/* Right: Actions & Emergency Halt */}
      <div className="flex items-center gap-3">
        {status === 'EXECUTING' && (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] text-xs font-medium transition-all cursor-pointer"
            title="Pause execution"
          >
            <PauseIcon size={14} />
            <span>Pause</span>
          </button>
        )}

        {status === 'PAUSED' && (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-all cursor-pointer"
            title="Resume execution"
          >
            <PlayIcon size={14} />
            <span>Resume</span>
          </button>
        )}

        <button
          onClick={onOpenDetails}
          className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 border border-[#30363d] text-xs font-medium transition-all cursor-pointer"
        >
          Technical Details ▾
        </button>

        {/* Emergency Halt Button */}
        {showHaltConfirm ? (
          <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-700 p-1 rounded-lg">
            <span className="text-xs text-rose-200 px-1 font-bold">Confirm Halt?</span>
            <button
              onClick={() => {
                setShowHaltConfirm(false);
                onEmergencyHalt?.();
              }}
              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow"
            >
              YES, STOP
            </button>
            <button
              onClick={() => setShowHaltConfirm(false)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowHaltConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-semibold transition-all shadow-sm cursor-pointer"
            title="Emergency Halt: Instantly kill all agent execution"
          >
            <ShieldAlertIcon size={14} className="text-rose-400" />
            <span>Emergency Halt</span>
          </button>
        )}
      </div>
    </header>
  );
};
