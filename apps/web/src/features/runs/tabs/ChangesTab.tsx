import React, { useState } from 'react';
import { CodeDiff } from '../../../types/index.js';
import { GitPullRequest, Code, CheckCircle, Split, AlignJustify } from 'lucide-react';
import { Button } from '../../../components/ui/index.js';

export const ChangesTab: React.FC<{ changes: CodeDiff[] }> = ({ changes }) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-cyan-400" />
            Code Diffs & AST Modifications ({changes.length} Files)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Semantic code patches and AST syntax tree transforms proposed and applied by the agent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            icon={<Split className="w-3.5 h-3.5" />}
            onClick={() => setViewMode('split')}
          >
            Side-by-Side
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
            icon={<AlignJustify className="w-3.5 h-3.5" />}
            onClick={() => setViewMode('unified')}
          >
            Unified
          </Button>
        </div>
      </div>

      {changes.map((diff) => (
        <div key={diff.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-semibold text-slate-200">{diff.file}</span>
              <span className="text-emerald-400">+{diff.additions}</span>
              <span className="text-rose-400">-{diff.deletions}</span>
            </div>
            <span className="text-xs font-mono text-slate-500 uppercase">{diff.language}</span>
          </div>

          {/* AST Modifications Breakdown */}
          {diff.astModifications && diff.astModifications.length > 0 && (
            <div className="px-5 py-3 bg-cyan-950/20 border-b border-cyan-500/20 text-xs">
              <span className="font-semibold text-cyan-300 uppercase tracking-wider block mb-1">
                AST Structural Changes:
              </span>
              <div className="space-y-1">
                {diff.astModifications.map((ast, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-500/30 text-[10px]">
                      {ast.type}
                    </span>
                    <span className="font-mono text-slate-200">{ast.name}:</span>
                    <span className="text-slate-400">{ast.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diff View */}
          {viewMode === 'split' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 font-mono text-xs">
              {/* Original */}
              <div className="p-4 bg-slate-950/60 overflow-x-auto">
                <div className="text-[11px] font-semibold uppercase text-rose-400 mb-2 border-b border-slate-800/80 pb-1">
                  Original Code
                </div>
                <pre className="text-rose-300/90 leading-relaxed whitespace-pre-wrap">{diff.oldContent}</pre>
              </div>

              {/* Modified */}
              <div className="p-4 bg-slate-950/90 overflow-x-auto">
                <div className="text-[11px] font-semibold uppercase text-emerald-400 mb-2 border-b border-slate-800/80 pb-1">
                  Agent Modified Code
                </div>
                <pre className="text-emerald-300/90 leading-relaxed whitespace-pre-wrap">{diff.newContent}</pre>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto space-y-1">
              <div className="text-rose-400 bg-rose-950/20 px-2 py-1 rounded">
                <pre className="whitespace-pre-wrap">{`- ${diff.oldContent}`}</pre>
              </div>
              <div className="text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded">
                <pre className="whitespace-pre-wrap">{`+ ${diff.newContent}`}</pre>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
