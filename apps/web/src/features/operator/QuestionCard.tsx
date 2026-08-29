import React, { useState } from 'react';
import { ClarificationQuestion } from '../../types/run';
import { BotIcon, SendIcon } from '../../components/common/Icons';

interface QuestionCardProps {
  question: ClarificationQuestion;
  onAnswer?: (answer: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customAnswer, setCustomAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(question.answered ?? false);

  const handleSubmit = (finalAnswer?: string) => {
    const ans = finalAnswer || customAnswer || selectedOption;
    if (!ans.trim()) return;
    setIsSubmitted(true);
    onAnswer?.(ans.trim());
  };

  return (
    <div className="bg-[#161b22] border-2 border-cyan-500/60 rounded-xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400 shrink-0">
          <BotIcon size={18} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">CLINE REQUIRES CLARIFICATION</span>
          <h3 className="text-sm md:text-base font-semibold text-white leading-snug">{question.question}</h3>
          {question.context && <p className="text-xs text-slate-400">{question.context}</p>}
        </div>
      </div>

      {isSubmitted ? (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-3 text-xs text-emerald-300 flex items-center justify-between">
          <span>✓ Answered: <strong>{question.answer || customAnswer || selectedOption}</strong></span>
          <span className="text-emerald-500">Submitted</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-2 border-t border-[#30363d]">
          {question.options && question.options.length > 0 && (
            <div className="flex flex-col gap-2">
              {question.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedOption(opt.label);
                    handleSubmit(opt.label);
                  }}
                  className="text-left px-3.5 py-2.5 rounded-lg bg-[#21262d] hover:bg-cyan-950/60 hover:border-cyan-500/80 border border-[#30363d] text-xs md:text-sm text-slate-200 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="font-medium group-hover:text-cyan-300">{opt.label}</span>
                  {opt.description && <span className="text-xs text-slate-500">{opt.description}</span>}
                </button>
              ))}
            </div>
          )}

          {question.allowCustomInput !== false && (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                placeholder="Or type a custom response..."
                className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-lg px-3.5 py-2 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!customAnswer.trim()}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <SendIcon size={12} />
                <span>Submit</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
