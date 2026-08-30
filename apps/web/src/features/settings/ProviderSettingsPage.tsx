import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Shield, RefreshCw, Trash2, Check, AlertTriangle,
  Eye, EyeOff, Plus, ExternalLink, Lock, Clock, Zap,
  Copy, ArrowRight, Server
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

// Types
interface ProviderCredential {
  id: string;
  provider: string;
  model?: string;
  baseUrl?: string;
  keyPrefix: string;
  status: 'active' | 'revoked' | 'expired';
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

// Provider logos/config
const PROVIDERS: Record<string, { name: string; icon: string; color: string; placeholder: string }> = {
  openrouter: {
    name: 'OpenRouter',
    icon: '🔀',
    color: 'cyan',
    placeholder: 'sk-or-v1-...',
  },
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    color: 'emerald',
    placeholder: 'sk-...',
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    color: 'purple',
    placeholder: 'sk-ant-...',
  },
};

// API helpers
const api = {
  async list(): Promise<ProviderCredential[]> {
    const res = await fetch('/api/v1/provider-credentials', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) throw new Error('Failed to list credentials');
    const data = await res.json();
    return data.credentials || [];
  },

  async create(payload: { provider: string; apiKey: string; model?: string; baseUrl?: string }): Promise<ProviderCredential> {
    const res = await fetch('/api/v1/provider-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create credential');
    const data = await res.json();
    return data.credential;
  },

  async revoke(id: string): Promise<void> {
    const res = await fetch(`/api/v1/provider-credentials/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) throw new Error('Failed to revoke credential');
  },

  async rotate(id: string, newApiKey: string): Promise<{ old: ProviderCredential; new: ProviderCredential }> {
    const res = await fetch(`/api/v1/provider-credentials/${id}/rotate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ apiKey: newApiKey }),
    });
    if (!res.ok) throw new Error('Failed to rotate credential');
    return res.json();
  },

  async test(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/v1/provider-credentials/${id}/test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    if (!res.ok) throw new Error('Failed to test credential');
    return res.json();
  },
};

// ────────────────────────────────────────────────────────────
// Add Credential Modal
// ────────────────────────────────────────────────────────────

function AddCredentialModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.create({ provider, apiKey, model: model || undefined });
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add credential');
    } finally {
      setLoading(false);
    }
  };

  const providerConfig = PROVIDERS[provider];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Key className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Add Provider Key</h2>
                <p className="text-xs text-slate-500">Encrypted at rest with AES-256-GCM</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Provider Select */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-2">PROVIDER</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PROVIDERS).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setProvider(key)}
                  className={cn(
                    'p-3 rounded-lg border text-center transition-all cursor-pointer',
                    provider === key
                      ? 'bg-slate-800 border-cyan-500/50 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <span className="text-xl">{config.icon}</span>
                  <p className="text-xs font-mono mt-1">{config.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-2">API KEY</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={providerConfig?.placeholder}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Key is encrypted immediately and never sent to the browser in plaintext
            </p>
          </div>

          {/* Model (optional) */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-2">DEFAULT MODEL (OPTIONAL)</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g., openrouter/auto, gpt-4, claude-3-opus"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading} className="flex-1">
              <Lock className="w-4 h-4" /> Encrypt & Store
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Credential Card
// ────────────────────────────────────────────────────────────

function CredentialCard({
  credential,
  onRefresh,
}: {
  credential: ProviderCredential;
  onRefresh: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [showRotate, setShowRotate] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [rotating, setRotating] = useState(false);

  const providerConfig = PROVIDERS[credential.provider] || { name: credential.provider, icon: '🔑', color: 'slate' };

  const statusConfig = {
    active: { badge: 'emerald' as const, label: 'Connected', pulse: true },
    revoked: { badge: 'rose' as const, label: 'Revoked', pulse: false },
    expired: { badge: 'amber' as const, label: 'Expired', pulse: false },
  };

  const status = statusConfig[credential.status] || statusConfig.active;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.test(credential.id);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleRevoke = async () => {
    try {
      await api.revoke(credential.id);
      onRefresh();
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  const handleRotate = async () => {
    if (!newKey) return;
    setRotating(true);
    try {
      await api.rotate(credential.id, newKey);
      setShowRotate(false);
      setNewKey('');
      onRefresh();
    } catch (err) {
      console.error('Rotate failed:', err);
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl">
            {providerConfig.icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{providerConfig.name}</h3>
            <p className="text-xs font-mono text-slate-500">{credential.keyPrefix}</p>
          </div>
        </div>
        <Badge variant={status.badge} hasDot pulse={status.pulse}>
          {status.label}
        </Badge>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono">
        <div>
          <span className="text-slate-500">CREATED</span>
          <p className="text-slate-300 mt-0.5">{new Date(credential.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <span className="text-slate-500">LAST USED</span>
          <p className="text-slate-300 mt-0.5">
            {credential.lastUsedAt ? new Date(credential.lastUsedAt).toLocaleString() : 'Never'}
          </p>
        </div>
        <div>
          <span className="text-slate-500">MODEL</span>
          <p className="text-slate-300 mt-0.5">{credential.model || 'Default'}</p>
        </div>
        <div>
          <span className="text-slate-500">CREDENTIAL ID</span>
          <p className="text-slate-300 mt-0.5 truncate">{credential.id}</p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 p-2.5 bg-cyan-950/20 border border-cyan-500/20 rounded-lg">
        <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
        <p className="text-[10px] font-mono text-cyan-300">
          Plaintext key is NEVER returned through API, WebSocket, or browser. Encrypted at rest with AES-256-GCM.
        </p>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          'p-3 rounded-lg text-xs font-mono',
          testResult.success
            ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
        )}>
          {testResult.success ? '✅' : '❌'} {testResult.message}
        </div>
      )}

      {/* Rotate Form */}
      {showRotate && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
            <RefreshCw className="w-4 h-4" />
            <span>ROTATE CREDENTIAL</span>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Enter a new API key. The old key will be immediately revoked.
          </p>
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={providerConfig.name + ' API key'}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="xs" onClick={() => { setShowRotate(false); setNewKey(''); }}>
              Cancel
            </Button>
            <Button variant="primary" size="xs" isLoading={rotating} onClick={handleRotate}>
              Rotate Key
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="ghost"
          size="xs"
          leftIcon={<Zap className="w-3.5 h-3.5" />}
          onClick={handleTest}
          isLoading={testing}
        >
          Test
        </Button>
        <Button
          variant="ghost"
          size="xs"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => setShowRotate(true)}
        >
          Rotate
        </Button>

        {!confirmRevoke ? (
          <Button
            variant="ghost"
            size="xs"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setConfirmRevoke(true)}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
          >
            Revoke
          </Button>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-mono text-rose-400">Confirm revoke?</span>
            <Button variant="danger" size="xs" onClick={handleRevoke}>
              Yes, Revoke
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setConfirmRevoke(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Provider Settings Page
// ────────────────────────────────────────────────────────────

export function ProviderSettingsPage() {
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.list();
      setCredentials(data);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const activeCount = credentials.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* ── TOP BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
              PROVIDER CREDENTIALS
            </h1>
            <Badge variant="cyan" hasDot>
              {activeCount} ACTIVE
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Manage LLM provider API keys. Encrypted at rest with AES-256-GCM. Never exposed through API or browser.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Add Provider Key
        </Button>
      </div>

      {/* ── SECURITY ARCHITECTURE ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> ENCRYPTION
          </span>
          <p className="text-lg font-bold font-mono text-cyan-400">AES-256-GCM</p>
          <p className="text-[10px] font-mono text-slate-500">Per-credential salt + IV via PBKDF2</p>
        </div>
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> RESOLUTION
          </span>
          <p className="text-lg font-bold font-mono text-emerald-400">RUNTIME ONLY</p>
          <p className="text-[10px] font-mono text-slate-500">Decrypted only in trusted backend</p>
        </div>
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5">
            <Server className="w-3 h-3" /> SCOPE
          </span>
          <p className="text-lg font-bold font-mono text-purple-400">USER + TENANT</p>
          <p className="text-[10px] font-mono text-slate-500">Isolated per user/org/workspace</p>
        </div>
      </div>

      {/* ── CREDENTIALS LIST ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <EmptyState
          icon={<Key />}
          title="No Provider Credentials"
          description="Add an LLM provider API key to enable AI-powered missions. Keys are encrypted at rest and never exposed to the browser."
          actionLabel="Add Provider Key"
          onAction={() => setShowAddModal(true)}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      ) : (
        <div className="space-y-4">
          {credentials.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} onRefresh={loadCredentials} />
          ))}
        </div>
      )}

      {/* ── ARCHITECTURE DIAGRAM ── */}
      <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">CREDENTIAL FLOW</h3>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded text-cyan-300">SYNAPSE AUTH</span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 bg-purple-950/40 border border-purple-500/30 rounded text-purple-300">SYNAPSE TENANT</span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded text-emerald-300">CREDENTIAL RESOLVER</span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 bg-amber-950/40 border border-amber-500/30 rounded text-amber-300">CLINE ENGINE</span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">LLM PROVIDER</span>
        </div>
        <p className="text-[10px] font-mono text-slate-500">
          Plaintext key is resolved only at runtime inside the trusted backend. Never persisted in Cline, browser, or audit logs.
        </p>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddCredentialModal
          onClose={() => setShowAddModal(false)}
          onAdded={loadCredentials}
        />
      )}
    </div>
  );
}

export default ProviderSettingsPage;
