import React, { useEffect, useRef } from 'react';
import { ConversationMessage } from '../../types/run';
import { UserMessage } from './UserMessage';
import { ClineMessage } from './ClineMessage';

interface MessageListProps {
  messages: ConversationMessage[];
  onApproveTool?: (approvalId: string, reason?: string) => void;
  onRejectTool?: (approvalId: string, reason?: string) => void;
  onAnswerQuestion?: (answer: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onApproveTool,
  onRejectTool,
  onAnswerQuestion,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user' || (msg as any).role === 'user';
        const isSystem = msg.sender === 'system' || (msg as any).role === 'system';

        if (isUser) {
          return (
            <UserMessage
              key={msg.id}
              content={msg.content}
              timestamp={msg.timestamp}
              attachments={msg.attachments}
              mentions={msg.mentions}
            />
          );
        }

        if (isSystem) {
          return (
            <div
              key={msg.id}
              className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3.5 text-xs text-rose-300 font-mono my-2 text-center"
            >
              {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
            </div>
          );
        }

        return (
          <ClineMessage
            key={msg.id}
            message={msg}
            onApproveTool={onApproveTool}
            onRejectTool={onRejectTool}
            onAnswerQuestion={onAnswerQuestion}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
