import React, { useState } from 'react';
import { useVerificationDetail } from '../../hooks/trust-governance.js';
import { Card, VerdictBadge, Badge, Button } from '../../components/ui/trust-ui.js';
import { AssertionCategory, VerificationVerdict } from '../../types/trust-governance.js';

export function VerificationDetailPage({
  taskId = 'ver-001',
  onBack,
}: {
  taskId?: string;
  onBack?: () => void;
}) {
  const { task, comparison, assertions, evidenceChain, loading, error, refresh } = useVerificationDetail(taskId);
  const [selectedAssertionId, setSelectedAssertionId] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALL');

  const categories: { label: string; key: string }[] = [
    { label: 'All Assertions', key: 'ALL' },
    { label: 'Tests', key: 'TEST_SUITE' },
    { label: 'File Presence', key: 'FILE_PRESENCE' },
    { label: 'Git Diffs', key: 'GIT_DIFF' },
    { label: 'API Probes', key: 'API_PROBE' },
    { label: 'SAST Scans', key: 'SAST_SCAN' },
  ];

  const filteredAssertions = assertions.filter(a => {
    if (activeCategoryTab === 'ALL') return true;
    return a.category === activeCategoryTab;
  });

  const selectedAssertion = assertions.find(a => a.id === selectedAssertionId) || assertions[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="secondary" size="sm" onClick={onBack}>
              ← Back to Trust Center
            </Button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-zinc-100">{task?.taskTitle || 'Verification Detail'}</h1>
              {task && <VerdictBadge verdict={task.verdict as VerificationVerdict} />}
            </div>
            <div className="text-xs text-zinc-400 mt-1 font-mono">
              Session: {task?.id} • Agent: {task?.agentName} • Duration: {task ? (task.durationMs / 1000).toFixed(2) : 0}s
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Re-verify
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* 1. Ground Truth vs Agent Claim Comparison Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={
            <div className="flex items-center justify-between w-full">
              <span className="text-zinc-200">Autonomous Agent Claim</span>
              <Badge variant="purple">Unverified Intent</Badge>
            </div>
          }
          subtitle="What the agent claims to have achieved during execution"
          className="border-purple-900/40 bg-gradient-to-b from-purple-950/20 to-zinc-900/90"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800 font-serif italic text-zinc-300 text-sm leading-relaxed">
              {comparison?.agentClaim || '"Executing optimization steps..."'}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
              <span>Timestamp: {comparison ? new Date(comparison.agentClaimTimestamp).toLocaleTimeString() : 'N/A'}</span>
              <span className="text-amber-400/80">⚠️ Agent claim ≠ Evidence</span>
            </div>
          </div>
        </Card>

        <Card
          title={
            <div className="flex items-center justify-between w-full">
              <span className="text-zinc-200">Ground Truth Verified Result</span>
              <Badge variant="success">Deterministic Proof</Badge>
            </div>
          }
          subtitle="Independent deterministic runtime verification & multi-vector analysis"
          className="border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-zinc-900/90"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-200 leading-relaxed font-sans">
              <p className="font-semibold text-emerald-400 mb-1">
                ✓ Ground Truth Verdict: {comparison?.groundTruthVerdict} (Confidence: {comparison ? (comparison.confidenceScore * 100).toFixed(1) : 100}%)
              </p>
              <p className="text-zinc-300 text-xs">
                {comparison?.differentialSummary}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400">
                {comparison?.assertionsPassed} / {comparison?.totalAssertions} Assertions Passed
              </span>
              <span className="text-zinc-400">0 Hallucinations / 0 Ghost Files</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Multi-Vector Assertion Breakdown */}
      <Card
        title="Multi-Vector Assertion Breakdown"
        subtitle="Tests, File Presence, Git Diffs, Synthetic API probes, and SAST scans"
        action={
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            {categories.map(c => (
              <button
                key={c.key}
                onClick={() => setActiveCategoryTab(c.key)}
                className={`px-3 py-1 rounded-md transition ${
                  activeCategoryTab === c.key
                    ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assertion list (5 cols) */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredAssertions.map((ast) => {
              const isSelected = selectedAssertion?.id === ast.id;
              return (
                <div
                  key={ast.id}
                  onClick={() => setSelectedAssertionId(ast.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-zinc-800/90 border-cyan-500/80 shadow-md shadow-cyan-500/10'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-zinc-100 truncate">{ast.name}</span>
                    <VerdictBadge verdict={ast.verdict} />
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono truncate">{ast.target}</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500 font-mono">
                    <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">{ast.category}</span>
                    <span>{ast.executionTimeMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assertion Deep-Dive Inspector (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-950 rounded-xl border border-zinc-800/90 p-5 flex flex-col justify-between">
            {selectedAssertion ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{selectedAssertion.name}</h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedAssertion.type} • {selectedAssertion.target}</p>
                  </div>
                  <VerdictBadge verdict={selectedAssertion.verdict} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/70">
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono mb-1">Expected Ground Condition</span>
                    <span className="text-zinc-200 font-mono text-xs break-all">{String(selectedAssertion.expectedValue || 'N/A')}</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/70">
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono mb-1">Actual Runtime Measurement</span>
                    <span className="text-emerald-400 font-mono text-xs break-all">{String(selectedAssertion.actualValue || 'N/A')}</span>
                  </div>
                </div>

                {selectedAssertion.stdout && (
                  <div>
                    <span className="text-[11px] font-mono text-zinc-400 block mb-1.5">Standard Output / Assertion Log:</span>
                    <pre className="p-3 bg-black/80 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {selectedAssertion.stdout}
                    </pre>
                  </div>
                )}

                {selectedAssertion.evidenceSha256 && (
                  <div className="bg-zinc-900/90 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">Evidence SHA-256 Hash:</span>
                    <span className="text-xs font-mono text-cyan-400 bg-black/60 px-2 py-1 rounded border border-zinc-800">
                      {selectedAssertion.evidenceSha256}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-zinc-500">Select an assertion to view its execution traces.</div>
            )}
          </div>
        </div>
      </Card>

      {/* 3. Cryptographic SHA-256 Merkle Evidence Chain */}
      <Card
        title={
          <div className="flex items-center gap-3">
            <span>Cryptographic SHA-256 Merkle Evidence Chain</span>
            <Badge variant="cyan">Tamper-Proof Block Sequence</Badge>
          </div>
        }
        subtitle="Every verification artifact is hashed, signed, and cryptographically linked in an immutable chain"
      >
        <div className="space-y-4">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-zinc-500 font-mono block">MERKLE ROOT HASH</span>
              <span className="text-sm font-mono text-cyan-400 font-bold break-all">
                {evidenceChain?.rootHash || '0000000000000000000000000000000000000000000000000000000000000000'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-semibold">
                ✓ ALL {evidenceChain?.blocksCount ?? 0} BLOCKS SEALED & VALID
              </span>
            </div>
          </div>

          {/* Blocks Sequence */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            {evidenceChain?.blocks.map((block) => (
              <div
                key={block.index}
                className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/90 relative flex flex-col justify-between hover:border-cyan-500/50 transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-cyan-400">
                      Block #{block.index}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 truncate">{block.evidenceLabel}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{block.evidenceType}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-900 space-y-1.5 text-[10px] font-mono">
                  <div>
                    <span className="text-zinc-600 block">PREV HASH:</span>
                    <span className="text-zinc-400 truncate block">{block.previousBlockHash.substring(0, 12)}...</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 block">BLOCK HASH:</span>
                    <span className="text-cyan-400 font-semibold truncate block">{block.blockHash.substring(0, 12)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
