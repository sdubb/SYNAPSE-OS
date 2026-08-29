import React from 'react';
import { useWorkspaceDetail } from '../../hooks/trust-governance.js';
import { Card, Badge, Button } from '../../components/ui/trust-ui.js';

export function WorkspaceDetailPage({
  workspaceId = 'ws-001',
  onBack,
}: {
  workspaceId?: string;
  onBack?: () => void;
}) {
  const { workspace, loading, error, refresh } = useWorkspaceDetail(workspaceId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="secondary" size="sm" onClick={onBack}>
              ← Back to Workspaces
            </Button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-zinc-100">{workspace?.name || 'Workspace Detail'}</h1>
              {workspace && (
                <Badge variant={workspace.environment === 'production' ? 'danger' : 'info'}>
                  {workspace.environment.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Isolation Level: {workspace?.isolationLevel} • Sandbox: {workspace?.sandboxPath}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Sync Worktree
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {workspace && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Git Worktree & Filesystem Mounts */}
          <Card
            title="Git Worktree & Sandbox Isolation"
            subtitle="Isolated worktree branch state and bind mounts"
          >
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div>
                  <span className="text-zinc-500 block text-[10px]">REPOSITORY URL</span>
                  <span className="text-zinc-300 break-all">{workspace.gitWorktree.repositoryUrl}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">CURRENT BRANCH</span>
                    <span className="text-cyan-400 font-bold">{workspace.gitWorktree.branch}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">TREE STATUS</span>
                    <span className={workspace.gitWorktree.cleanStatus ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {workspace.gitWorktree.cleanStatus ? '✓ Clean' : '⚠ Dirty / Uncommitted'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1 text-[11px] uppercase">Mounted Volumes (Sandboxed)</span>
                <div className="space-y-1.5">
                  {workspace.mountedDirectories.map((dir, i) => (
                    <div key={i} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                      {dir}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Environment Variables & Security Profile */}
          <Card
            title="Environment & Security Profile"
            subtitle="Scoped environment tokens and network egress firewalls"
          >
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-zinc-400 block mb-1 text-[11px] font-mono uppercase">Environment Variables (Injected)</span>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto">
                  {JSON.stringify(workspace.environmentVariables, null, 2)}
                </pre>
              </div>

              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Read-Only Root Filesystem:</span>
                  <Badge variant={workspace.securityProfile.readOnlyRoot ? 'success' : 'warning'}>
                    {workspace.securityProfile.readOnlyRoot ? 'ENFORCED' : 'MUTABLE'}
                  </Badge>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase mt-2 mb-1">Network Egress Allow-List</span>
                  <div className="flex flex-wrap gap-1">
                    {workspace.securityProfile.networkEgressAllowList.map((ip, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px]">
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
