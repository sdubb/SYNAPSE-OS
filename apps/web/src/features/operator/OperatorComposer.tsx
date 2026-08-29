import React, { useState, useRef, useEffect } from 'react';
import {
  SendIcon,
  PaperclipIcon,
  AtSignIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from '../../components/common/Icons';
import { RunStatus } from '../../types/run';
import { apiClient } from '../../api/client';

interface ProviderModel {
  modelId: string;
  provider: string;
  displayName: string;
  contextWindow: string;
  capabilities: string[];
}

interface OperatorComposerProps {
  status: RunStatus;
  onSendInstruction: (instruction: string, attachments?: Array<{ name: string; size: string; type: string }>, provider?: string, modelId?: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

const DEFAULT_MODELS: ProviderModel[] = [
  { modelId: 'anthropic/claude-opus-5', provider: 'cline', displayName: 'Claude Opus 5', contextWindow: '200000', capabilities: ['reasoning', 'function_calling'] },
  { modelId: 'moonshotai/kimi-k3', provider: 'cline', displayName: 'Kimi K3', contextWindow: '128000', capabilities: ['function_calling'] },
  { modelId: 'x-ai/grok-4.5', provider: 'cline', displayName: 'Grok 4.5', contextWindow: '128000', capabilities: ['reasoning', 'function_calling'] },
  { modelId: 'openai/gpt-5.6-sol', provider: 'cline', displayName: 'GPT-5.6 Sol', contextWindow: '128000', capabilities: ['function_calling'] },
  { modelId: 'z-ai/glm-5.3-flash', provider: 'cline', displayName: 'GLM-5.3-Flash (Free)', contextWindow: '128000', capabilities: ['function_calling'] },
  { modelId: 'deepseek/deepseek-v4-flash', provider: 'cline', displayName: 'DeepSeek V4 Flash (Free)', contextWindow: '128000', capabilities: ['reasoning', 'function_calling'] },
];

export const OperatorComposer: React.FC<OperatorComposerProps> = ({
  status,
  onSendInstruction,
  onPause,
  onResume,
  onStop,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string; type: string }>>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [models, setModels] = useState<ProviderModel[]>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<ProviderModel>(DEFAULT_MODELS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch real Cline catalog from the backend
    apiClient.request<{ models: any[] }>('/catalog').then((res: any) => {
      if (res?.models && Array.isArray(res.models) && res.models.length > 0) {
        const enriched = res.models.map((m: any) => ({
          modelId: m.id,
          provider: m.provider || 'cline',
          displayName: m.name || m.id,
          contextWindow: String(m.contextWindow || '128000'),
          capabilities: Array.isArray(m.capabilities) ? m.capabilities : [],
          tier: m.tier || 'available',
        }));
        if (enriched.length > 0) setModels(enriched);
      }
    }).catch(() => {
      // Fallback: try the DB models endpoint
      apiClient.request<any[]>('/models').then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          const enriched = res.filter((m: any) => m.enabled !== false).map((m: any) => ({
            modelId: m.modelId,
            provider: m.provider,
            displayName: m.displayName || m.modelId,
            contextWindow: String(m.contextWindow || '128000'),
            capabilities: Array.isArray(m.capabilities) ? m.capabilities : [],
          }));
          if (enriched.length > 0) setModels(enriched);
        }
      }).catch(() => {});
    });
  }, []);

  const availableMentions = ['Developer Agent', 'Security Agent', 'Payment Service', 'Database'];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    onSendInstruction(
      inputText.trim(),
      attachments.length > 0 ? attachments : undefined,
      selectedModel.provider,
      selectedModel.modelId,
    );
    setInputText('');
    setAttachments([]);
    setShowMentionMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Array<{ name: string; size: string; type: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newAttachments.push({
        name: f.name,
        size: `${(f.size / 1024).toFixed(1)} KB`,
        type: f.type || 'text/plain',
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const insertMention = (mention: string) => {
    setInputText((prev) => `${prev}@${mention} `);
    setShowMentionMenu(false);
  };

  return (
    <div className="bg-[#161b22] border-t border-[#30363d] p-4 flex flex-col gap-3 shadow-xl">
      {/* File Attachments List if any */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-1">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-slate-200"
            >
              <PaperclipIcon size={12} className="text-cyan-400" />
              <span className="font-mono">{att.name}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="text-slate-500 hover:text-rose-400 font-bold ml-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Box and Mention Trigger */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Cline what to do next... (e.g. 'Use the staging environment instead' or 'Pause until I review this')"
            rows={2}
            className="w-full bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-xl p-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all resize-none shadow-inner"
          />

          {/* Mention Autocomplete Dropdown */}
          {showMentionMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-30">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">Mention Agent / Context</span>
              {availableMentions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => insertMention(m)}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 hover:text-cyan-300 text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  @{m}
                </button>
              ))}
            </div>
          )}

          {/* Model Picker Dropdown */}
          {showModelPicker && (
            <div className="absolute bottom-full right-0 mb-2 w-80 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-30 max-h-64 overflow-y-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">Select Provider & Model</span>
              {models.map((m) => (
                <button
                  key={`${m.provider}/${m.modelId}`}
                  type="button"
                  onClick={() => { setSelectedModel(m); setShowModelPicker(false); }}
                  className={`text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedModel.modelId === m.modelId && selectedModel.provider === m.provider
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50'
                      : 'hover:bg-[#30363d] text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.displayName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{m.provider}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">ctx: {Number(m.contextWindow).toLocaleString()}</span>
                    {m.capabilities.includes('reasoning') && <span className="text-[10px] text-amber-500">reasoning</span>}
                    {m.capabilities.includes('vision') && <span className="text-[10px] text-blue-400">vision</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Attach button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs font-medium border border-[#30363d] transition-colors cursor-pointer"
              title="Attach logs or files"
            >
              <PaperclipIcon size={14} className="text-slate-400" />
              <span>Attach</span>
            </button>

            {/* Mention button */}
            <button
              type="button"
              onClick={() => setShowMentionMenu(!showMentionMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs font-medium border border-[#30363d] transition-colors cursor-pointer"
              title="Mention an agent or workspace resource"
            >
              <AtSignIcon size={14} className="text-slate-400" />
              <span>Mention</span>
            </button>

            {/* Model Picker button */}
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs font-medium border border-[#30363d] transition-colors cursor-pointer"
              title="Select provider and model"
            >
              <span className="font-mono text-[10px] text-cyan-400">{selectedModel.provider}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-300 truncate max-w-[120px]">{selectedModel.displayName}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick intervention controls */}
            {status === 'EXECUTING' && (
              <button
                type="button"
                onClick={onPause}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-amber-300 border border-amber-800/60 text-xs font-semibold transition-colors cursor-pointer"
              >
                <PauseIcon size={12} />
                <span>Pause</span>
              </button>
            )}

            {status === 'PAUSED' && (
              <button
                type="button"
                onClick={onResume}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-xs font-semibold transition-colors cursor-pointer"
              >
                <PlayIcon size={12} />
                <span>Resume</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-rose-950/80 text-rose-300 border border-rose-800/50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <StopIcon size={12} />
              <span>Stop</span>
            </button>

            {/* Send instruction button */}
            <button
              type="submit"
              disabled={!inputText.trim() && attachments.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold shadow transition-all cursor-pointer"
            >
              <SendIcon size={14} />
              <span>Send Instruction</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
