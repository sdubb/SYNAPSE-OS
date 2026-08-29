import React, { useState } from 'react';
import { TimelineEvent } from '../../../types/index.js';
import {
  Activity,
  Layers,
  Wrench,
  HelpCircle,
  ShieldCheck,
  CheckCircle,
  FileCode,
  FlaskConical,
  AlertOctagon,
  Filter,
  Clock,
} from 'lucide-react';
import { Button } from '../../../components/ui/index.js';

export const TimelineTab: React.FC<{ timeline: TimelineEvent[] }> = ({ timeline }) => {
  const [selectedType, setSelectedType] = useState<string>('all');

  const eventTypeIcons: Record<string, React.ReactNode> = {
    lifecycle: <Activity className="w-4 h-4 text-blue-400" />,
    plan: <Layers className="w-4 h-4 text-indigo-400" />,
    activity: <Activity className="w-4 h-4 text-cyan-400" />,
    tool: <Wrench className="w-4 h-4 text-amber-400" />,
    question: <HelpCircle className="w-4 h-4 text-purple-400" />,
    approval: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
    verification: <CheckCircle className="w-4 h-4 text-cyan-400" />,
    file: <FileCode className="w-4 h-4 text-teal-400" />,
    test: <FlaskConical className="w-4 h-4 text-emerald-400" />,
    error: <AlertOctagon className="w-4 h-4 text-rose-400" />,
  };

  const types = ['all', 'lifecycle', 'plan', 'activity', 'tool', 'approval', 'file', 'test', 'verification'];

  const filtered = timeline.filter((ev) => (selectedType === 'all' ? true : ev.type === selectedType));

  return (
    <div className="space-y-4">
      {/* Event Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 pl-1 pr-2 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Filter Type:
        </span>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1 text-xs font-medium rounded-lg border capitalize whitespace-nowrap transition-colors ${
              selectedType === t
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 font-semibold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Chronological Event Tree */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {filtered.map((ev, index) => {
          return (
            <div key={ev.id || index} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 top-1.5 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow">
                {eventTypeIcons[ev.type] || <Activity className="w-3.5 h-3.5 text-slate-400" />}
              </div>

              {/* Event Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase font-bold text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded">
                      {ev.type}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100">{ev.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    {ev.durationMs && <span className="text-slate-400">{ev.durationMs}ms</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{ev.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
