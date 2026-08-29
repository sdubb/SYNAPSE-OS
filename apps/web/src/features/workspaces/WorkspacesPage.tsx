import React from 'react';
import { useWorkspaces } from '../../hooks/trust-governance.js';
import { Card, Badge, Button } from '../../components/ui/trust-ui.js';
import { WorkspaceConfig } from '../../types/trust-governance.js';

export function WorkspacesPage({ onSelectWorkspace }: { onSelectWorkspace?: (id: string) => void }) {
  const { workspaces, loading, error, refresh } = useWorkspaces();

  const getEnvBadge = (env: WorkspaceConfig['environment']) => {
    switch (env) {
      case 'production': return <Badge variant="danger">PRODUCTION</Badge>;
      case 'staging': return <Badge variant="warning">STAGING</Badge>;
      case 'development': return <Badge variant="info">DEVELOPMENT</Badge>;
      case 'research': return <Badge variant="purple">RESEARCH</Badge>;
      default: return <Badge variant="default">{env}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Workspaces & Isolated Sandboxes</h1>
            <Badge variant="cyan">Zero-Escape Isolation</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Isolated execution environments, directory sandboxes, git worktree checkouts, and environment-scoped security policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh
          </Button>
          <Button variant="primary" size="sm">
            + Provision Workspace
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((ws: WorkspaceConfig) => (
          <Card
            key={ws.id}
            className="flex flex-col justify-between hover:border-cyan-500/50 transition cursor-pointer"
            title={
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-100 truncate">{ws.name}</span>
                {getEnvBadge(ws.environment)}
              </div>
            }
            subtitle={
              <span className="font-mono text-[11px] text-zinc-500">{ws.isolationLevel}</span>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-2 font-mono">
                <div>
                  <span className="text-zinc-600 block text-[10px]">GIT WORKTREE BRANCH</span>
                  <span className="text-cyan-400 font-semibold truncate block">
                    {ws.gitWorktree.branch} ({ws.gitWorktree.cleanStatus ? 'clean' : 'dirty'})
                  </span>
                </div>
                <div>
                  <span className="text-zinc-600 block text-[10px]">SANDBOX ROOT</span>
                  <span className="text-zinc-400 truncate block text-[11px]">{ws.sandboxPath}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">AGENTS ACTIVE</span>
                  <span className="text-sm font-bold text-zinc-200">{ws.activeAgentsCount}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">POLICIES ATTACHED</span>
                  <span className="text-sm font-bold text-cyan-400">{ws.policiesAttachedCount}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/60">
                <span className="text-[10px] font-mono text-zinc-600">
                  Active: {new Date(ws.lastActive).toLocaleTimeString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectWorkspace && onSelectWorkspace(ws.id)}
                >
                  Manage Sandbox →
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
