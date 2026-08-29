import React, { useState } from 'react';
import { ConversationMessage } from '../../types/run';
import { ActivityCard } from './ActivityCard';
import { QuestionCard } from './QuestionCard';
import { ApprovalCard } from './ApprovalCard';
import { EvidenceCard } from './EvidenceCard';
import { PlanCard } from './PlanCard';
import { BotIcon, CheckCircleIcon, ChevronDownIcon, ChevronRightIcon } from '../../components/common/Icons';

interface ClineMessageProps {
  message: ConversationMessage;
  onApproveTool?: (approvalId: string, reason?: string) => void;
  onRejectTool?: (approvalId: string, reason?: string) => void;
  onAnswerQuestion?: (answer: string) => void;
}

export const ClineMessage: React.FC<ClineMessageProps> = ({
  message,
  onApproveTool,
  onRejectTool,
  onAnswerQuestion,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-3 max-w-3xl mr-auto w-full">
      {/* Header Info */}
      <div className="flex items-center gap-2 text-xs text-slate-400 ml-1">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
          <BotIcon size={14} />
          <span>Cline</span>
        </div>
        <span>·</span>
        <span>{formattedTime}</span>
      </div>

      {/* Main Message Container */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl rounded-tl-sm p-5 shadow-lg flex flex-col gap-4">
        {/* Title & Summary */}
        {message.title && (
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            {message.title}
          </h3>
        )}

        {(message.summary || message.content) && (
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {message.summary || (typeof message.content === 'string' ? message.content : Array.isArray(message.content) ? (message.content as any[]).map((c) => typeof c === 'string' ? c : c?.text || '').join('\n') : '')}
          </p>
        )}

        {/* Human-readable Reason */}
        {message.reason && (
          <div className="text-xs text-slate-400 bg-[#0d1117] p-3 rounded-lg border border-[#30363d] leading-relaxed">
            <strong className="text-slate-300">Why: </strong>
            {message.reason}
          </div>
        )}

        {/* Action Checklist */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            {message.actions.map((act) => (
              <div key={act.id} className="flex items-center gap-2.5 text-xs text-slate-300">
                {act.status === 'completed' && <CheckCircleIcon size={14} className="text-emerald-400 shrink-0" />}
                {act.status === 'running' && (
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                )}
                {act.status === 'pending' && <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-600 shrink-0" />}
                <span className={act.status === 'completed' ? 'text-slate-300 font-medium' : 'text-slate-400'}>
                  {act.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Embedded Activities */}
        {message.activities && message.activities.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {message.activities.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}

        {/* Embedded Question */}
        {message.question && (
          <QuestionCard question={message.question} onAnswer={onAnswerQuestion} />
        )}

        {/* Embedded Approval */}
        {message.approval && (
          <ApprovalCard
            approval={message.approval}
            onApprove={onApproveTool}
            onReject={onRejectTool}
          />
        )}

        {/* Embedded Evidence */}
        {message.evidence && <EvidenceCard evidence={message.evidence} />}

        {/* Embedded Plan */}
        {message.plan && <PlanCard plan={message.plan} />}

        {/* Technical Details Drawer */}
        {message.technicalDetails && (
          <div className="pt-2 border-t border-[#30363d]/60">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              {showTechnicalDetails ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
              <span>Technical details</span>
            </button>

            {showTechnicalDetails && (
              <div className="mt-3 bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-4 text-xs font-mono">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] pb-1 border-b border-[#30363d]">
                  TECHNICAL EVIDENCE
                </span>

                {/* Files Read */}
                {message.technicalDetails.filesRead.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 font-semibold">Files read</span>
                    <div className="text-slate-300 divide-y divide-[#30363d]/40">
                      {message.technicalDetails.filesRead.map((f, idx) => (
                        <div key={idx} className="py-0.5">{f}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commands */}
                {message.technicalDetails.commands.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 font-semibold">Commands</span>
                    <div className="text-cyan-400 bg-[#161b22] p-2 rounded border border-[#30363d]">
                      {message.technicalDetails.commands.join('\n')}
                    </div>
                  </div>
                )}

                {/* Tests */}
                {message.technicalDetails.tests && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 font-semibold">Tests</span>
                    <span className="text-emerald-400">
                      {message.technicalDetails.tests.passed} passed / {message.technicalDetails.tests.total} total
                    </span>
                  </div>
                )}

                {/* Modified Files */}
                {message.technicalDetails.filesModified.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 font-semibold">Changes</span>
                    <span className="text-amber-400">
                      {message.technicalDetails.filesModified.length} files modified
                    </span>
                  </div>
                )}

                {/* Cline session & tools */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#30363d]/60 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Cline session</span>
                    <span className="text-slate-300">{message.technicalDetails.clineSessionId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tools used</span>
                    <span className="text-slate-300">{message.technicalDetails.tools.join(', ')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
