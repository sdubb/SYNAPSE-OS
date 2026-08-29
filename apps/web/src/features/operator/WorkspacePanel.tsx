import React from 'react';
import { RunSession } from '../../types/run';
import { WebPreview } from './WebPreview';
import { FileTree } from './FileTree';
import { DiffViewer } from './DiffViewer';
import { TerminalOutput } from './TerminalOutput';
import { TestResults } from './TestResults';
import { InfrastructureGraph } from './InfrastructureGraph';
import {
  GlobeIcon,
  FolderIcon,
  FileCodeIcon,
  TerminalIcon,
  CheckSquareIcon,
  NetworkIcon,
} from '../../components/common/Icons';

interface WorkspacePanelProps {
  run: RunSession;
  onTabChange: (tab: 'preview' | 'files' | 'diff' | 'terminal' | 'tests' | 'infra') => void;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ run, onTabChange }) => {
  const currentTab = run.activeWorkspaceTab || 'diff';

  const tabs: Array<{ id: 'preview' | 'files' | 'diff' | 'terminal' | 'tests' | 'infra'; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'diff', label: 'Changes', icon: <FileCodeIcon size={14} />, badge: run.diffFiles.length },
    { id: 'preview', label: 'Preview', icon: <GlobeIcon size={14} /> },
    { id: 'files', label: 'Files', icon: <FolderIcon size={14} /> },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon size={14} />, badge: run.terminalLogs.length },
    { id: 'tests', label: 'Tests', icon: <CheckSquareIcon size={14} />, badge: `${run.testResults.filter(t => t.status === 'passed').length}/${run.testResults.length}` },
    { id: 'infra', label: 'Topology', icon: <NetworkIcon size={14} /> },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117] overflow-hidden">
      {/* Workspace Tab Bar */}
      <div className="px-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer select-none whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-[#21262d]/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#21262d]/30'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-cyan-900/80 text-cyan-200' : 'bg-[#0d1117] text-slate-500'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span>Target: {run.environment}</span>
        </div>
      </div>

      {/* Tab Renderers */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentTab === 'diff' && <DiffViewer diffFiles={run.diffFiles} />}
        {currentTab === 'preview' && <WebPreview url={run.previewUrl} />}
        {currentTab === 'files' && <FileTree files={run.workspaceFiles} />}
        {currentTab === 'terminal' && <TerminalOutput logs={run.terminalLogs} />}
        {currentTab === 'tests' && <TestResults testResults={run.testResults} />}
        {currentTab === 'infra' && <InfrastructureGraph nodes={run.infrastructureNodes} />}
      </div>
    </div>
  );
};
