import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRun } from '../../hooks/useRun';
import { useRunEvents } from '../../hooks/useRunEvents';
import { OperatorHeader } from './OperatorHeader';
import { ConversationPanel } from './ConversationPanel';
import { WorkspacePanel } from './WorkspacePanel';
import { RunProgress } from './RunProgress';
import { OperatorComposer } from './OperatorComposer';
import { ActivityTimeline } from './ActivityTimeline';

interface OperatorPageProps {
  runId?: string;
  onNavigateHome?: () => void;
}

export const OperatorPage: React.FC<OperatorPageProps> = ({
  runId: propRunId,
  onNavigateHome,
}) => {
  const { id: routeRunId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const queryRunId = searchParams.get('runId');
  const targetRunId = propRunId || routeRunId || queryRunId || undefined;

  const { runId: activeRunId, run, setRun, isLoading, error, reload, setWorkspaceTab } = useRun(targetRunId);
  const {
    sendInstruction,
    pauseRun,
    resumeRun,
    emergencyHalt,
    approveTool,
    rejectTool,
    answerQuestion,
  } = useRunEvents(activeRunId || run?.id, reload, setRun);

  const [isTimelineOpen, setIsTimelineOpen] = useState<boolean>(false);

  if (isLoading && !run) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
          </span>
          <span>Loading Synapse Operator session...</span>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="min-h-screen bg-[#0d1117] p-8 flex flex-col items-center justify-center gap-4 text-center">
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 font-mono text-sm max-w-md">
          {error || 'Run session not found.'}
        </div>
        <button
          onClick={onNavigateHome}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          Return to Command Center
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117] text-slate-100 font-sans overflow-hidden antialiased select-none">
      {/* 1. Operator Header */}
      <OperatorHeader
        runId={run.id}
        taskTitle={run.taskTitle}
        agentName={run.agentName}
        environment={run.environment}
        status={run.status}
        onPause={pauseRun}
        onResume={resumeRun}
        onEmergencyHalt={emergencyHalt}
        onOpenDetails={() => setIsTimelineOpen(true)}
      />

      {/* 2. Main Two-Column View: Conversation Panel vs. Dynamic Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: Conversation */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 border-r border-[#30363d]">
          <ConversationPanel
            messages={run.messages}
            onApproveTool={approveTool}
            onRejectTool={rejectTool}
            onAnswerQuestion={(answer) => {
              const activeQuestion = run.messages.find((m) => m.question && !m.question.answered)?.question;
              if (activeQuestion) {
                answerQuestion(activeQuestion.id, answer);
              }
            }}
          />
        </div>

        {/* Right Column: Dynamic Workspace */}
        <div className="hidden lg:flex lg:w-1/2 flex-col min-h-0">
          <WorkspacePanel
            run={run}
            onTabChange={setWorkspaceTab}
          />
        </div>
      </div>

      {/* 3. Run Status & Linear Plan Progression */}
      <RunProgress
        plan={run.activePlan}
        currentPhase={run.currentPhase}
        onStepClick={(step) => {
          if (step.phase === 'Fix') setWorkspaceTab('diff');
          if (step.phase === 'Test') setWorkspaceTab('tests');
          if (step.phase === 'Investigate') setWorkspaceTab('files');
        }}
      />

      {/* 4. Operator Composer */}
      <OperatorComposer
        status={run.status}
        onSendInstruction={sendInstruction}
        onPause={pauseRun}
        onResume={resumeRun}
        onStop={emergencyHalt}
      />

      {/* 5. Technical Details Drawer */}
      <ActivityTimeline
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        details={run.technicalDetails}
      />
    </div>
  );
};
