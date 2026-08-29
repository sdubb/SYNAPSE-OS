import React, { useState } from 'react';
import { FileRecord } from '../../../types/index.js';
import { FileCode, FileText, Eye, Clock, ArrowRight } from 'lucide-react';
import { Button, StatusBadge } from '../../../components/ui/index.js';

export const FilesTab: React.FC<{ files: FileRecord[] }> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(files[0] || null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          Workspace Files Accessed ({files.length})
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Audited log of all workspace repositories and filesystem assets touched by the agent.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
            Touched Files
          </div>
          <div className="divide-y divide-slate-800/60 max-h-[440px] overflow-y-auto">
            {files.map((file) => {
              const isSelected = selectedFile?.id === file.id;
              let actionBadge = 'bg-slate-800 text-slate-400';
              if (file.action === 'modified') actionBadge = 'bg-amber-950/60 text-amber-300 border border-amber-500/30';
              if (file.action === 'created') actionBadge = 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30';
              if (file.action === 'deleted') actionBadge = 'bg-rose-950/60 text-rose-300 border border-rose-500/30';

              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1 text-xs ${
                    isSelected ? 'bg-cyan-950/30 border-l-2 border-cyan-400' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${actionBadge}`}>
                      {file.action}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {(file.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <span className="font-mono text-slate-200 truncate">{file.path}</span>
                  {(file.linesAdded || file.linesRemoved) && (
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      {file.linesAdded ? <span className="text-emerald-400">+{file.linesAdded}</span> : null}
                      {file.linesRemoved ? <span className="text-rose-400">-{file.linesRemoved}</span> : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* File Preview */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[440px]">
          {selectedFile ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs font-semibold text-slate-200">{selectedFile.path}</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Timestamp: {new Date(selectedFile.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex-1 font-mono text-xs text-slate-300 bg-slate-900/60 p-4 rounded-lg border border-slate-800 overflow-x-auto">
                <pre className="leading-relaxed">
                  {selectedFile.contentPreview ||
                    `// File preview for: ${selectedFile.path}\n// Action: ${selectedFile.action.toUpperCase()}\n// Size: ${selectedFile.sizeBytes} bytes\n\n// Content audited and verified by Synapse OS`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono">
              Select a file on the left to inspect content preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
