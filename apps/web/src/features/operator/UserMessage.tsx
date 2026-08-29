import React from 'react';
import { PaperclipIcon } from '../../components/common/Icons';

interface UserMessageProps {
  content?: string;
  timestamp: string;
  attachments?: Array<{ name: string; size: string; type: string }>;
  mentions?: string[];
}

export const UserMessage: React.FC<UserMessageProps> = ({ content, timestamp, attachments, mentions }) => {
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const textContent = typeof content === 'string'
    ? content
    : Array.isArray(content)
    ? (content as any[]).map((c) => (typeof c === 'string' ? c : c?.text || '')).join('\n')
    : content && typeof content === 'object'
    ? (content as any).text || JSON.stringify(content)
    : '';

  return (
    <div className="flex flex-col gap-1 items-end max-w-2xl ml-auto">
      <div className="flex items-center gap-2 text-xs text-slate-400 mr-1">
        <span className="font-semibold text-slate-300">You</span>
        <span>·</span>
        <span>{formattedTime}</span>
      </div>

      <div className="bg-cyan-950/70 border border-cyan-700/60 rounded-2xl rounded-tr-sm p-4 text-slate-100 shadow-md text-sm leading-relaxed whitespace-pre-wrap">
        {textContent}

        {mentions && mentions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {mentions.map((m, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 font-mono">
                @{m}
              </span>
            ))}
          </div>
        )}

        {attachments && attachments.length > 0 && (
          <div className="mt-3 pt-2 border-t border-cyan-800/40 flex flex-col gap-1.5">
            <span className="text-xs text-cyan-300/80 font-medium">Attachments:</span>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117]/80 border border-cyan-800/50 text-xs text-slate-200">
                  <PaperclipIcon size={12} className="text-cyan-400" />
                  <span className="font-mono">{file.name}</span>
                  <span className="text-slate-500">({file.size})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
