import React, { useState } from 'react';
import { useGovernance } from '../../hooks/trust-governance.js';
import { Card, RiskBadge, Button, Badge } from '../../components/ui/trust-ui.js';
import { ApprovalRequestItem } from '../../types/trust-governance.js';

export function ApprovalsPage() {
  const { approvals, loading, error, refresh, handleDecision } = useGovernance();
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [actionReason, setActionReason] = useState<string>('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequestItem | null>(null);

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const resolvedApprovals = approvals.filter(a => a.status !== 'pending');

  const currentList = activeTab === 'pending' ? pendingApprovals : resolvedApprovals;

  const onApprove = async (appr: ApprovalRequestItem) => {
    await handleDecision(appr.id, 'APPROVED', actionReason || 'Approved by human operator in trust console');
    setSelectedApproval(null);
    setActionReason('');
  };

  const onReject = async (appr: ApprovalRequestItem) => {
    await handleDecision(appr.id, 'REJECTED', actionReason || 'Rejected by human operator in trust console');
    setSelectedApproval(null);
    setActionReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Governance & Approval Inbox</h1>
            {pendingApprovals.length > 0 && (
              <Badge variant="danger">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping mr-1" />
                {pendingApprovals.length} Pending Actions
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time human-in-the-loop control for high-risk autonomous agent tool executions and schema mutations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh Inbox
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            activeTab === 'pending'
              ? 'bg-zinc-800 text-zinc-100 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Pending Approvals ({pendingApprovals.length})
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            activeTab === 'resolved'
              ? 'bg-zinc-800 text-zinc-100 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Resolved Archive ({resolvedApprovals.length})
        </button>
      </div>

      {/* Approval Items List */}
      {currentList.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
          <p className="text-base font-semibold text-zinc-400">All clear!</p>
          <p className="text-xs text-zinc-500 mt-1">No pending agent approval requests requiring human intervention.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((appr) => {
            const isCritical = appr.riskLevel === 'CRITICAL';
            return (
              <Card
                key={appr.id}
                className={`transition ${isCritical ? 'border-rose-900/60 bg-gradient-to-r from-rose-950/20 to-zinc-900/90' : ''}`}
                headerClassName={isCritical ? 'bg-rose-950/30' : ''}
                title={
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-zinc-100 text-sm font-bold">{appr.agentName}</span>
                    <span className="text-zinc-500 font-normal">wants to execute</span>
                    <span className="font-mono text-cyan-400 text-xs px-2 py-0.5 bg-zinc-950 rounded border border-zinc-800 font-semibold">
                      {appr.toolName}
                    </span>
                  </div>
                }
                action={
                  <div className="flex items-center gap-2">
                    <RiskBadge level={appr.riskLevel} />
                    {appr.requiresTwoPersonApproval && (
                      <Badge variant="purple">2-Person Rule Required</Badge>
                    )}
                  </div>
                }
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Main Details (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 block mb-1">Stated Reason / Intent</span>
                      <p className="text-sm text-zinc-200 bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80">
                        {appr.reason}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-zinc-400 block mb-1">Sanitized Tool Arguments</span>
                      <pre className="p-3 bg-black/90 border border-zinc-800 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto max-h-40 whitespace-pre-wrap">
                        {JSON.stringify(appr.toolParameters, null, 2)}
                      </pre>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono text-zinc-400">
                      <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/60">
                        <span className="text-zinc-600 block text-[10px]">WORKSPACE</span>
                        <span className="text-zinc-300 truncate block">{appr.workspaceName || 'Global'}</span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/60">
                        <span className="text-zinc-600 block text-[10px]">TIMEOUT</span>
                        <span className="text-zinc-300 block">{appr.timeoutSeconds}s</span>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800/60">
                        <span className="text-zinc-600 block text-[10px]">TASK CONTEXT</span>
                        <span className="text-zinc-300 truncate block">{appr.taskName || 'Ad-hoc session'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Blast Radius & Action Box (5 cols) */}
                  <div className="lg:col-span-5 bg-zinc-950/90 rounded-xl border border-zinc-800/90 p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="text-xs font-bold text-zinc-200 tracking-tight">BLAST RADIUS & RISK SCOPE</span>
                        <span className="text-xs font-mono text-rose-400 font-bold">
                          Risk Score: {appr.blastRadius.riskScore}/100
                        </span>
                      </div>

                      <div className="text-xs space-y-2">
                        <div>
                          <span className="text-zinc-500 block text-[11px]">AFFECTED TARGET RESOURCES:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {appr.blastRadius.affectedEntities.map((res, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[11px] border border-zinc-800">
                                {res}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-zinc-500 block text-[11px]">DOWNTIME / DISRUPTION RISK:</span>
                          <span className="text-amber-300 font-mono text-xs">{appr.blastRadius.estimatedDowntimeRisk}</span>
                        </div>

                        {appr.firstApprover && (
                          <div className="p-2.5 rounded bg-purple-950/50 border border-purple-800/60 text-[11px] text-purple-300">
                            ✓ 1st Approver Signed: {appr.firstApprover.userName} at {new Date(appr.firstApprover.approvedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    {appr.status === 'pending' && (
                      <div className="pt-3 border-t border-zinc-800 space-y-3">
                        <input
                          type="text"
                          placeholder="Optional decision remark / reason..."
                          value={selectedApproval?.id === appr.id ? actionReason : ''}
                          onFocus={() => setSelectedApproval(appr)}
                          onChange={e => {
                            setSelectedApproval(appr);
                            setActionReason(e.target.value);
                          }}
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            className="flex-1"
                            onClick={() => onReject(appr)}
                          >
                            ✕ Reject Action
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onApprove(appr)}
                          >
                            1-Click Allow Once
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            className="flex-1"
                            onClick={() => onApprove(appr)}
                          >
                            ✓ Approve Execution
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
