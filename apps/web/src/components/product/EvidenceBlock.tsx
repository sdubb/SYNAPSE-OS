import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode, Terminal, CheckCircle2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EvidenceBlockProps {
  title: string;
  type?: 'diff' | 'logs' | 'ast' | 'test' | 'command' | 'json';
  summary?: string;
  badge?: string;
  content: string | Record<string, unknown>;
  defaultOpen?: boolean;
  className?: string;
}

export function EvidenceBlock({
  title,
  type = 'logs',
  summary,
  badge,
  content,
  defaultOpen = false,
  className,
}: EvidenceBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const formattedContent =
    typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = () => {
    switch (type) {
      case 'diff':
      case 'ast':
        return <FileCode className="w-4 h-4 text-cyan-400" />;
      case 'test':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'command':
      case 'logs':
      default:
        return <Terminal className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden transition-all text-xs font-mono',
        isOpen && 'border-slate-700/80 shadow-md',
        className
      )}
    >
      {/* Header bar / accordion trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-850 cursor-pointer select-none border-b border-transparent transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-slate-400 shrink-0">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          {getIcon()}
          <span className="font-medium text-slate-200 truncate">{title}</span>
          {summary && <span className="text-slate-500 text-[11px] truncate">{summary}</span>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300 border border-slate-700">
              {badge}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy technical evidence"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Progressive disclosure code block */}
      {isOpen && (
        <div className="p-3 bg-slate-950/90 text-slate-300 border-t border-slate-800 overflow-x-auto max-h-80 select-text leading-relaxed">
          <pre className="text-[11px] whitespace-pre-wrap">{formattedContent}</pre>
        </div>
      )}
    </div>
  );
}
