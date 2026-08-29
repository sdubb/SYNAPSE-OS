import React, { useState } from 'react';
import { TestResultItem } from '../../types/run';
import { CheckCircleIcon, XCircleIcon, CheckSquareIcon } from '../../components/common/Icons';

interface TestResultsProps {
  testResults: TestResultItem[];
}

export const TestResults: React.FC<TestResultsProps> = ({ testResults }) => {
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  const passedCount = testResults.filter((t) => t.status === 'passed').length;
  const failedCount = testResults.filter((t) => t.status === 'failed').length;
  const totalDuration = testResults.reduce((acc, curr) => acc + curr.durationMs, 0);

  const filtered = testResults.filter((t) => {
    if (filter === 'passed') return t.status === 'passed';
    if (filter === 'failed') return t.status === 'failed';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] overflow-hidden">
      {/* Header & Metrics */}
      <div className="p-4 bg-[#161b22] border-b border-[#30363d] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquareIcon size={16} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">TEST RUNNER EXECUTION</span>
          </div>

          <span className="text-xs text-slate-400 font-mono">Total Duration: {(totalDuration / 1000).toFixed(2)}s</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">
              ✓ {passedCount} Passed
            </span>
            {failedCount > 0 && (
              <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800 text-xs font-bold">
                ✕ {failedCount} Failed
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-0.5 rounded cursor-pointer ${filter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              All ({testResults.length})
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-2.5 py-0.5 rounded cursor-pointer ${filter === 'passed' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              Passed ({passedCount})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-2.5 py-0.5 rounded cursor-pointer ${filter === 'failed' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              Failed ({failedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Tests Breakdown List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {filtered.map((test) => (
          <div
            key={test.id}
            className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-start justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">
                {test.status === 'passed' ? (
                  <CheckCircleIcon size={16} className="text-emerald-400" />
                ) : (
                  <XCircleIcon size={16} className="text-rose-400" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-200">{test.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">{test.suite}</span>
                {test.errorMessage && (
                  <pre className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-[11px]">
                    {test.errorMessage}
                  </pre>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 text-[11px] font-mono text-slate-400 shrink-0">
              <span>{test.durationMs}ms</span>
              <span className="text-slate-500">{test.assertionCount} assertions</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
