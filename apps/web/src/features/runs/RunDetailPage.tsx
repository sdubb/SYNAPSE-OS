import React, { useState } from 'react';
import { useRun, useRunDetails } from '../../hooks/useApi.js';
import {
  ArrowLeft,
  Activity,
  Terminal,
  Clock,
  MessageSquare,
  Wrench,
  FileCode,
  GitPullRequest,
  ShieldAlert,
  Cpu,
  FlaskConical,
  ShieldCheck,
  Pause,
  Play,
  RotateCw,
  XCircle,
} from 'lucide-react';
import { Button, StatusBadge, Tabs } from '../../components/ui/index.js';
import { OverviewTab } from './tabs/OverviewTab.js';
import { LiveTab } from './tabs/LiveTab.js';
import { TimelineTab } from './tabs/TimelineTab.js';
import { ConversationTab } from './tabs/ConversationTab.js';
import { ToolsTab } from './tabs/ToolsTab.js';
import { FilesTab } from './tabs/FilesTab.js';
import { ChangesTab } from './tabs/ChangesTab.js';
import { ApprovalsTab } from './tabs/ApprovalsTab.js';
import { UsageTab } from './tabs/UsageTab.js';
import { VerificationTab } from './tabs/VerificationTab.js';
import { AuditTab } from './tabs/AuditTab.js';

interface RunDetailPageProps {
  runId?: string;
  onBack?: () => void;
}

export const RunDetailPage: React.FC<RunDetailPageProps> = ({ runId = 'run-8821-chk', onBack }) => {
  const { run, loading: runLoading, refetch: refetchRun } = useRun(runId);
  const {
    timeline,
    conversation,
    tools,
    files,
    changes,
    approvals,
    usage,
    verification,
    auditTrail,
    loading: detailsLoading,
  } = useRunDetails(runId);

  const [activeTab, setActiveTab] = useState<string>('overview');

  if (runLoading || !run) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading Forensic Deep-Dive Session...</span>
        </div>
      </div>
    );
  }

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  const tabList = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'live', label: 'Live Stream', icon: <Terminal className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" />, badge: timeline.length },
    { id: 'conversation', label: 'Conversation', icon: <MessageSquare className="w-4 h-4" />, badge: conversation.length },
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-4 h-4" />, badge: tools.length },
    { id: 'files', label: 'Files', icon: <FileCode className="w-4 h-4" />, badge: files.length },
    { id: 'changes', label: 'Changes', icon: <GitPullRequest className="w-4 h-4" />, badge: changes.length },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : approvals.length,
    },
    { id: 'usage', label: 'Usage & Cost', icon: <Cpu className="w-4 h-4" /> },
    {
      id: 'verification',
      label: 'Verification',
      icon: <FlaskConical className="w-4 h-4" />,
      badge: verification?.verdict,
    },
    { id: 'audit', label: 'Audit Trail', icon: <ShieldCheck className="w-4 h-4" />, badge: auditTrail.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Forensic Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <StatusBadge status={run.status} />
              <span className="text-xs font-mono text-slate-400">
                Run ID: <strong className="text-slate-200">{run.id}</strong> · Session:{' '}
                <strong className="text-cyan-300">{run.clineSessionId}</strong>
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-100">{run.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
              <span>Agent: <strong className="text-slate-200">{run.agentName}</strong></span>
              <span>Workspace: <strong className="text-slate-300">{run.workspaceName || 'Default'}</strong></span>
              <span>Duration: <strong className="text-slate-200">{Math.floor(run.durationSeconds / 60)}m {run.durationSeconds % 60}s</strong></span>
              <span>Cost: <strong className="text-emerald-400">${run.tokenUsage.estimatedCostUsd.toFixed(4)}</strong></span>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {run.status === 'running' ? (
              <Button size="sm" variant="secondary" icon={<Pause className="w-3.5 h-3.5" />}>
                Pause Execution
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={<Play className="w-3.5 h-3.5" />}>
                Resume Run
              </Button>
            )}

            <Button size="sm" variant="danger" icon={<XCircle className="w-3.5 h-3.5" />}>
              Abort Run
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === 'overview' && <OverviewTab run={run} />}
        {activeTab === 'live' && <LiveTab run={run} />}
        {activeTab === 'timeline' && <TimelineTab timeline={timeline} />}
        {activeTab === 'conversation' && <ConversationTab conversation={conversation} />}
        {activeTab === 'tools' && <ToolsTab tools={tools} />}
        {activeTab === 'files' && <FilesTab files={files} />}
        {activeTab === 'changes' && <ChangesTab changes={changes} />}
        {activeTab === 'approvals' && <ApprovalsTab approvals={approvals} />}
        {activeTab === 'usage' && <UsageTab usage={usage} />}
        {activeTab === 'verification' && <VerificationTab verification={verification} />}
        {activeTab === 'audit' && <AuditTab auditTrail={auditTrail} />}
      </div>
    </div>
  );
};
