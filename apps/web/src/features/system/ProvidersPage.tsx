import React, { useState, useCallback } from 'react';
import { useSystem } from '../../hooks/trust-governance.js';
import { Card, Badge, Button, Modal } from '../../components/ui/trust-ui.js';
import { ProviderCredential } from '../../types/trust-governance.js';
import { systemApi } from '../../api/trust-governance-client.js';

const PROVIDER_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...' },
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-proj-...' },
  { value: 'google', label: 'Google Vertex / Gemini', placeholder: 'AIzaSy...' },
  { value: 'deepseek', label: 'DeepSeek', placeholder: 'sk-ds-...' },
  { value: 'ollama', label: 'Ollama (Local)', placeholder: '' },
  { value: 'custom', label: 'Custom / Self-Hosted', placeholder: '' },
];

export function ProvidersPage() {
  const { providers, loading, error, refresh } = useSystem();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [providerSlug, setProviderSlug] = useState('anthropic');
  const [displayName, setDisplayName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const selectedOption = PROVIDER_OPTIONS.find(o => o.value === providerSlug);

  const handleAdd = useCallback(async () => {
    if (!apiKeyInput.trim() && providerSlug !== 'ollama') return;
    setIsSaving(true);
    try {
      await systemApi.addProvider({
        provider: providerSlug,
        displayName: displayName || selectedOption?.label || providerSlug,
        maskedApiKey: (apiKeyInput ? `${apiKeyInput.slice(0, 4)}...${apiKeyInput.slice(-4)}` : 'configured') as any,
        endpointUrl: endpointUrl || undefined,
      } as any);
      setIsAddModalOpen(false);
      setApiKeyInput('');
      setDisplayName('');
      setEndpointUrl('');
      refresh();
    } finally {
      setIsSaving(false);
    }
  }, [apiKeyInput, providerSlug, displayName, endpointUrl, selectedOption, refresh]);

  const handleValidate = useCallback(async (id: string) => {
    setValidatingId(id);
    try {
      await systemApi.validateProvider(id);
      refresh();
    } finally {
      setValidatingId(null);
    }
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Remove this provider key?')) return;
    await systemApi.deleteProvider(id);
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">LLM Provider Credentials</h1>
            <Badge variant="cyan">Encrypted Vault Storage</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Manage provider API keys, enterprise gateways, custom inference endpoints, and credential rotation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            ↻ Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            + Add Provider Key
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {providers.length === 0 && !loading && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="text-zinc-500 text-sm mb-4">No provider keys configured yet.</div>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            + Add Your First Provider Key
          </Button>
        </div>
      )}

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((p: ProviderCredential) => (
          <Card
            key={p.id}
            title={
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-100">{p.displayName}</span>
                <Badge variant={p.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {p.status}
                </Badge>
              </div>
            }
            subtitle={`Provider: ${p.provider}`}
          >
            <div className="space-y-4 text-xs">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-1 font-mono">
                <span className="text-zinc-500 block text-[10px] uppercase">MASKED API CREDENTIAL</span>
                <span className="text-cyan-400 text-sm tracking-wider">{p.maskedApiKey}</span>
              </div>

              <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                <span>Last Validated:</span>
                <span>{p.lastValidatedAt ? new Date(p.lastValidatedAt).toLocaleString() : 'Never'}</span>
              </div>

              {p.endpointUrl && (
                <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                  <span>Endpoint:</span>
                  <span className="text-zinc-300">{p.endpointUrl}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleValidate(p.id)}
                  disabled={validatingId === p.id}
                >
                  {validatingId === p.id ? '⟳ Testing...' : 'Test Connectivity'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">
                    Rotate Key →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300"
                    onClick={() => handleDelete(p.id)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Provider Credentials"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-mono mb-1">Provider Engine</label>
            <select
              value={providerSlug}
              onChange={e => {
                setProviderSlug(e.target.value);
                const opt = PROVIDER_OPTIONS.find(o => o.value === e.target.value);
                if (!displayName || displayName === selectedOption?.label) {
                  setDisplayName(opt?.label || '');
                }
              }}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
            >
              {PROVIDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-mono mb-1">Display Name</label>
            <input
              type="text"
              placeholder={selectedOption?.label || 'My Provider'}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
            />
          </div>

          {providerSlug !== 'ollama' && (
            <div>
              <label className="block text-zinc-400 font-mono mb-1">API Key / Secret Token</label>
              <input
                type="password"
                placeholder={selectedOption?.placeholder || 'Paste your API key'}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
            </div>
          )}

          {providerSlug === 'custom' || providerSlug === 'ollama' ? (
            <div>
              <label className="block text-zinc-400 font-mono mb-1">Custom Endpoint URL</label>
              <input
                type="text"
                placeholder="http://localhost:11434/v1"
                value={endpointUrl}
                onChange={e => setEndpointUrl(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={isSaving || (!apiKeyInput.trim() && providerSlug !== 'ollama')}
            >
              {isSaving ? '⟳ Saving...' : 'Save & Encrypt'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
