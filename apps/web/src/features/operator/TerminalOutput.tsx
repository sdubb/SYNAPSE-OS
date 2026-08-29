import React, { useEffect, useRef, useState } from 'react';
import { TerminalIcon } from '../../components/common/Icons';

interface TerminalLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'cmd';
  text: string;
}

interface TerminalOutputProps {
  logs?: TerminalLog[];
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ logs = [] }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoscroll, setAutoscroll] = useState(true);

  useEffect(() => {
    if (autoscroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoscroll]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'cmd':
        return 'text-cyan-400 font-bold';
      case 'warn':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400 font-bold';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">CLINE TERMINAL SESSION</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoscroll}
              onChange={(e) => setAutoscroll(e.target.checked)}
              className="rounded border-[#30363d] bg-[#0d1117] text-cyan-600 focus:ring-0"
            />
            <span>Autoscroll</span>
          </label>
          <span className="text-slate-500 font-mono">{logs.length} lines</span>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed flex flex-col gap-1 bg-[#090d13]">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/60 p-0.5 rounded">
            <span className="text-slate-600 select-none text-[11px] shrink-0 font-mono">{log.timestamp}</span>
            <span className={`${getLogColor(log.level)} whitespace-pre-wrap break-all`}>{log.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
