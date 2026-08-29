import React from 'react';
import { ActivityItem } from '../../types/run';
import { CheckCircleIcon, XCircleIcon } from '../../components/common/Icons';

interface ActivityCardProps {
  activity: ActivityItem;
  onShowEvidence?: (activityId: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onShowEvidence }) => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5">
            {activity.status === 'running' && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            )}
            {activity.status === 'completed' && <CheckCircleIcon size={16} className="text-emerald-400" />}
            {activity.status === 'failed' && <XCircleIcon size={16} className="text-rose-400" />}
            {activity.status === 'pending' && <span className="inline-block w-3 h-3 rounded-full border border-slate-600" />}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-100">{activity.title}</span>
            <p className="text-xs text-slate-400 leading-relaxed">{activity.reason}</p>
          </div>
        </div>

        {activity.toolName && (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#21262d] text-slate-300 border border-[#30363d] shrink-0">
            {activity.toolName}
          </span>
        )}
      </div>

      {activity.filesModified && activity.filesModified.length > 0 && (
        <div className="text-xs text-slate-400 bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/60 font-mono">
          <span className="text-slate-500">Modified: </span>
          {activity.filesModified.join(', ')}
        </div>
      )}

      {activity.evidence && (
        <button
          onClick={() => onShowEvidence?.(activity.id)}
          className="self-start text-xs font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors cursor-pointer mt-1"
        >
          [Show technical evidence]
        </button>
      )}
    </div>
  );
};
