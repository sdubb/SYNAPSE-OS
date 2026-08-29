import React, { useState } from 'react';
import { ConversationMessage } from '../../../types/index.js';
import {
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Wrench,
  FileCode,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { Button, StatusBadge, RiskBadge } from '../../../components/ui/index.js';

export const ConversationTab: React.FC<{ conversation: ConversationMessage[] }> = ({ conversation }) => {
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {conversation.map((msg) => {
        const isUser = msg.role === 'user';
        const isExpanded = !!expandedDetails[msg.id];

        if (isUser) {
          return (
            <div key={msg.id} className="flex items-start gap-3.5 justify-end">
              <div className="bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border border-cyan-500/30 rounded-2xl rounded-tr-sm p-4 max-w-2xl text-slate-100 shadow-md">
                <div className="flex items-center justify-between gap-4 mb-1 text-xs text-cyan-300 font-mono">
                  <span className="font-semibold">OPERATOR (YOU)</span>
                  <span className="text-slate-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-cyan-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
            </div>
          );
        }

        // AGENT MESSAGE
        return (
          <div key={msg.id} className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Bot className="w-4 h-4" />
            </div>

            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono border-b border-slate-800/80 pb-2">
                <span className="text-indigo-300 font-semibold uppercase tracking-wider">SYNAPSE AGENT</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>

              {/* High-level human readable summary */}
              {msg.summary && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1">
                    🔍 {msg.summary}
                  </h4>
                  {msg.reason && <p className="text-xs text-slate-300 leading-relaxed">{msg.reason}</p>}
                </div>
              )}

              {/* Message Content */}
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {/* Action checklist */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Execution Steps:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.actions.map((act, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-xs"
                      >
                        {act.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
                        )}
                        <span className={act.status === 'completed' ? 'text-slate-300' : 'text-amber-200'}>
                          {act.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Changes Preview */}
              {msg.proposedChanges && msg.proposedChanges.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Proposed Code Modifications:
                  </span>
                  {msg.proposedChanges.map((change, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 truncate max-w-sm">{change.file}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">+{change.additions}</span>
                        <span className="text-rose-400">-{change.deletions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Progressive disclosure toggle */}
              {msg.evidence && (
                <div>
                  <button
                    onClick={() => toggleDetails(msg.id)}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors mt-2"
                  >
                    <span>{isExpanded ? 'Hide Technical Evidence' : 'Show Technical Evidence'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-3">
                      {msg.evidence.filesRead && (
                        <div>
                          <span className="text-slate-400 block mb-1">FILES READ:</span>
                          <div className="space-y-0.5 pl-2">
                            {msg.evidence.filesRead.map((f) => (
                              <div key={f} className="text-slate-300">{f}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.evidence.commands && (
                        <div>
                          <span className="text-slate-400 block mb-1">COMMANDS EXECUTED:</span>
                          <div className="space-y-0.5 pl-2">
                            {msg.evidence.commands.map((c) => (
                              <div key={c} className="text-emerald-400">$ {c}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.evidence.testsPassed !== undefined && (
                        <div>
                          <span className="text-slate-400 block mb-1">TEST VERDICT:</span>
                          <span className="text-emerald-300 font-bold pl-2">
                            ✓ {msg.evidence.testsPassed} / {msg.evidence.testsTotal} Passed
                          </span>
                        </div>
                      )}

                      {msg.evidence.notes && (
                        <div>
                          <span className="text-slate-400 block mb-1">EVIDENCE NOTES:</span>
                          <p className="text-slate-300 pl-2">{msg.evidence.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
