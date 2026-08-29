import React from 'react';
import { ConversationMessage } from '../../types/run';
import { MessageList } from './MessageList';

interface ConversationPanelProps {
  messages: ConversationMessage[];
  onApproveTool?: (approvalId: string, reason?: string) => void;
  onRejectTool?: (approvalId: string, reason?: string) => void;
  onAnswerQuestion?: (answer: string) => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  onApproveTool,
  onRejectTool,
  onAnswerQuestion,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117] border-r border-[#30363d] overflow-hidden">
      <div className="px-6 py-3 border-b border-[#30363d] bg-[#161b22]/50 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">OPERATOR CONVERSATION</span>
        <span className="text-xs text-slate-500">{messages.length} messages</span>
      </div>

      <MessageList
        messages={messages}
        onApproveTool={onApproveTool}
        onRejectTool={onRejectTool}
        onAnswerQuestion={onAnswerQuestion}
      />
    </div>
  );
};
