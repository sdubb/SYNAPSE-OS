import React, { useState } from 'react';
import { GitCompare, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// This page requires graph version data from the backend.
// Since there's no REST endpoint for graph versions yet,
// this page shows the empty state.

export function VersionComparisonPage() {
  const navigate = useNavigate();
  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <EmptyState
        icon={<GitCompare />}
        title="Graph version comparison unavailable"
        description="Graph version comparison requires a backend endpoint to serve immutable graph versions. Graphs are stored in .synapse_data/graphs/ but no REST API exposes them yet."
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Backend Capability Required</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The SYNAPSE backend stores immutable graph versions in <code className="text-cyan-300 font-mono">.synapse_data/graphs/</code> via
          the <code className="text-cyan-300 font-mono">FileGraphStore</code>. Each version is saved as{' '}
          <code className="text-cyan-300 font-mono">{'{graphId}_v{version}.json'}</code>.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed mt-2">
          To enable version comparison in the frontend, the backend needs:
        </p>
        <ul className="text-xs text-slate-500 font-mono mt-2 space-y-1 list-disc list-inside">
          <li><code className="text-cyan-300">GET /missions/:missionId/graph</code> — Current graph</li>
          <li><code className="text-cyan-300">GET /missions/:missionId/graph/versions</code> — Version list</li>
          <li><code className="text-cyan-300">GET /missions/:missionId/graph/versions/:version</code> — Specific version</li>
        </ul>
      </div>
    </div>
  );
}
