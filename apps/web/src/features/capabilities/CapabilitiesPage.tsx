import React, { useState } from 'react';
import { useCapabilities } from '../../hooks/trust-governance.js';
import { Card, Badge, RiskBadge, Button } from '../../components/ui/trust-ui.js';
import { ConnectedCapability } from '../../types/trust-governance.js';

export function CapabilitiesPage() {
  const { capabilities, loading, error, refresh } = useCapabilities();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filtered = capabilities.filter(c => {
    if (selectedCategory === 'ALL') return true;
    return c.category === selectedCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Dynamic Capabilities & MCP Registry</h1>
            <Badge variant="cyan">Model Context Protocol (MCP)</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Connected execution tools, Model Context Protocol servers, database adapters, and enterprise messaging connectors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Check Health
          </Button>
          <Button variant="primary" size="sm">
            + Connect MCP Server / Tool
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs">
        {[
          { label: 'All Capabilities', key: 'ALL' },
          { label: 'MCP Servers', key: 'MCP_SERVER' },
          { label: 'Tools & Sandboxes', key: 'TOOL' },
          { label: 'Messaging Connectors', key: 'MESSAGING_CONNECTOR' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedCategory(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition ${
              selectedCategory === tab.key
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Capabilities Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((cap: ConnectedCapability) => (
          <Card
            key={cap.id}
            title={
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-100 truncate">{cap.name}</span>
                <Badge variant={cap.status === 'CONNECTED' ? 'success' : 'danger'}>
                  {cap.status}
                </Badge>
              </div>
            }
            subtitle={
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[11px] text-zinc-500">{cap.category}</span>
                <span className="text-zinc-600">•</span>
                <span className="font-mono text-[11px] text-zinc-500">{cap.version}</span>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-400 font-mono">Tools Exposed:</span>
                <span className="font-mono font-bold text-cyan-400">{cap.toolsCount} registered tools</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-mono">Heartbeat Latency:</span>
                <span className="font-mono text-emerald-400 font-bold">{cap.healthLatencyMs} ms</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-mono">Risk Profile:</span>
                <RiskBadge level={cap.riskLevel} />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-mono text-zinc-500 block uppercase">Granted Permissions</span>
                <div className="flex flex-wrap gap-1">
                  {cap.permissions.map((perm, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 font-mono text-[10px] border border-zinc-800">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-mono text-zinc-500 block uppercase">Connector Config</span>
                <pre className="p-2 bg-zinc-950 rounded border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-x-auto">
                  {JSON.stringify(cap.configuration, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/60">
                <span className="text-[10px] font-mono text-zinc-600">
                  Last: {new Date(cap.lastHeartbeat).toLocaleTimeString()}
                </span>
                <Button variant="ghost" size="sm">
                  Configure →
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
