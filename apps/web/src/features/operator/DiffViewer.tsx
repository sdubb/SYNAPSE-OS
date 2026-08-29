import React, { useState } from 'react';
import { DiffFile } from '../../types/run';
import { FileCodeIcon } from '../../components/common/Icons';

interface DiffViewerProps {
  diffFiles: DiffFile[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffFiles }) => {
  const [selectedDiffId, setSelectedDiffId] = useState<string>(diffFiles[0]?.id || '');
  const [mode, setMode] = useState<'unified' | 'split'>('unified');

  const currentDiff = diffFiles.find((d) => d.id === selectedDiffId) || diffFiles[0];

  if (!currentDiff) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
        No code differences available.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      {/* Top Diff Header */}
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileCodeIcon size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold text-white font-mono">{currentDiff.filename}</span>
          <span className="text-xs text-emerald-400 font-mono">+{currentDiff.additions}</span>
          <span className="text-xs text-rose-400 font-mono">-{currentDiff.deletions}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-0.5 text-xs flex items-center">
            <button
              onClick={() => setMode('unified')}
              className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                mode === 'unified' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setMode('split')}
              className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                mode === 'split' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side
            </button>
          </div>
        </div>
      </div>

      {/* File Selector Tabs if multiple */}
      {diffFiles.length > 1 && (
        <div className="px-4 py-1.5 bg-[#161b22]/60 border-b border-[#30363d] flex items-center gap-2 overflow-x-auto">
          {diffFiles.map((df) => (
            <button
              key={df.id}
              onClick={() => setSelectedDiffId(df.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                df.id === currentDiff.id ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {df.filename}
            </button>
          ))}
        </div>
      )}

      {/* Diff Code Lines */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed bg-[#0d1117]">
        <table className="w-full border-collapse">
          <tbody>
            {currentDiff.lines.map((line, idx) => {
              const isAdd = line.type === 'add';
              const isDel = line.type === 'delete';

              const rowBg = isAdd
                ? 'bg-emerald-950/30 text-emerald-300'
                : isDel
                ? 'bg-rose-950/30 text-rose-300'
                : 'text-slate-300';

              const sign = isAdd ? '+' : isDel ? '-' : ' ';

              return (
                <tr key={idx} className={`${rowBg} hover:bg-slate-800/40 transition-colors`}>
                  <td className="w-10 select-none text-right pr-2 py-0.5 text-slate-600 text-[11px] font-mono border-r border-[#30363d]/40">
                    {line.oldLineNumber || ''}
                  </td>
                  <td className="w-10 select-none text-right pr-2 py-0.5 text-slate-600 text-[11px] font-mono border-r border-[#30363d]/40">
                    {line.newLineNumber || ''}
                  </td>
                  <td className="w-6 select-none text-center font-bold font-mono py-0.5">
                    {sign}
                  </td>
                  <td className="pl-2 py-0.5 whitespace-pre font-mono">
                    {line.content}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
