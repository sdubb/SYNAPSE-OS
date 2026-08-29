import React, { useState, useCallback } from 'react';
import { useSystem } from '../../hooks/trust-governance.js';
import { Card, Badge, Button, Modal } from '../../components/ui/trust-ui.js';
import { LLMModelInfo } from '../../types/trust-governance.js';
import { systemApi } from '../../api/trust-governance-client.js';

export function ModelsPage() {
  const { models, loading, error, refresh } = useSystem();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModel, setNewModel] = useState({
    id: '',
    name: '',
    provider: 'anthropic',
    contextWindow: 128000,
    inputPricingPer1M: 0,
    outputPricingPer1M: 0,
    rateLimitRpm: 1000,
    rateLimitTpm: 100000,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = useCallback(async (model: LLMModelInfo) => {
    await systemApi.toggleModel(model.id, !model.enabled);
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (modelId: string) => {
    if (!confirm('Delete this model from the registry?')) return;
    await systemApi.deleteModel(modelId);
    refresh();
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    if (!newModel.id.trim() || !newModel.name.trim()) return;
    setIsSaving(true);
    try {
      await systemApi.createModel({
        id: newModel.id,
        name: newModel.name,
        provider: newModel.provider as any,
        contextWindow: newModel.contextWindow,
        inputPricingPer1M: newModel.inputPricingPer1M,
        outputPricingPer1M: newModel.outputPricingPer1M,
        rateLimitRpm: newModel.rateLimitRpm,
        rateLimitTpm: newModel.rateLimitTpm,
        enabled: true,
      });
      setIsAddModalOpen(false);
      setNewModel({ id: '', name: '', provider: 'anthropic', contextWindow: 128000, inputPricingPer1M: 0, outputPricingPer1M: 0, rateLimitRpm: 1000, rateLimitTpm: 100000 });
      refresh();
    } finally {
      setIsSaving(false);
    }
  }, [newModel, refresh]);

  // Group models by provider
  const providers = [...new Set(models.map(m => m.provider))];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">LLM Models & Execution Catalog</h1>
            <Badge variant="cyan">{models.length} Models • {providers.length} Providers</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Registered LLM foundation models, token economics, context window boundaries, and rate limits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            + Register Custom Model
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Models Table */}
      <Card title="Available Foundation Models">
        <div className="overflow-x-auto -mx-5 -my-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/40 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-5">Model Name & ID</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Context Window</th>
                <th className="py-3.5 px-4">Pricing (In / Out per 1M)</th>
                <th className="py-3.5 px-4">Rate Limits (RPM / TPM)</th>
                <th className="py-3.5 px-4">Availability</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-xs text-zinc-300">
              {models.map((m: LLMModelInfo) => (
                <tr key={m.id} className="hover:bg-zinc-800/40 transition">
                  <td className="py-4 px-5">
                    <div className="font-bold text-zinc-100">{m.name}</div>
                    <div className="text-zinc-500 font-mono text-[11px] mt-0.5">{m.id}</div>
                  </td>
                  <td className="py-4 px-4 font-medium text-zinc-300 capitalize">{m.provider}</td>
                  <td className="py-4 px-4 font-mono text-cyan-400">
                    {(m.contextWindow / 1000).toFixed(0)}k tokens
                  </td>
                  <td className="py-4 px-4 font-mono">
                    <span className="text-zinc-300">${m.inputPricingPer1M.toFixed(2)}</span>
                    <span className="text-zinc-600"> / </span>
                    <span className="text-zinc-400">${m.outputPricingPer1M.toFixed(2)}</span>
                  </td>
                  <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                    {m.rateLimitRpm.toLocaleString()} RPM • {(m.rateLimitTpm / 1000).toFixed(0)}k TPM
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={m.availability === 'AVAILABLE' ? 'success' : 'warning'}>
                      {m.availability}
                    </Badge>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(m)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                          m.enabled
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-900/80'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {m.enabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-rose-400 hover:bg-rose-950/50 transition-all cursor-pointer"
                        title="Delete model"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {models.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No models registered. Click "+ Register Custom Model" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Model Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Custom Model"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-mono mb-1">Model ID</label>
              <input
                type="text"
                placeholder="my-fine-tuned-v2"
                value={newModel.id}
                onChange={e => setNewModel(p => ({ ...p, id: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 font-mono mb-1">Display Name</label>
              <input
                type="text"
                placeholder="My Fine-Tuned Model"
                value={newModel.name}
                onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">Provider</label>
            <select
              value={newModel.provider}
              onChange={e => setNewModel(p => ({ ...p, provider: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="google">Google</option>
              <option value="deepseek">DeepSeek</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-mono mb-1">Context Window (tokens)</label>
              <input
                type="number"
                value={newModel.contextWindow}
                onChange={e => setNewModel(p => ({ ...p, contextWindow: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 font-mono mb-1">Input $/1M</label>
                <input
                  type="number"
                  step="0.01"
                  value={newModel.inputPricingPer1M}
                  onChange={e => setNewModel(p => ({ ...p, inputPricingPer1M: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 font-mono mb-1">Output $/1M</label>
                <input
                  type="number"
                  step="0.01"
                  value={newModel.outputPricingPer1M}
                  onChange={e => setNewModel(p => ({ ...p, outputPricingPer1M: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-mono mb-1">Rate Limit (RPM)</label>
              <input
                type="number"
                value={newModel.rateLimitRpm}
                onChange={e => setNewModel(p => ({ ...p, rateLimitRpm: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 font-mono mb-1">Rate Limit (TPM)</label>
              <input
                type="number"
                value={newModel.rateLimitTpm}
                onChange={e => setNewModel(p => ({ ...p, rateLimitTpm: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={isSaving || !newModel.id.trim() || !newModel.name.trim()}
            >
              {isSaving ? '⟳ Saving...' : 'Register Model'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
