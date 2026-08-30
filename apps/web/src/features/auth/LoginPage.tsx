import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/state/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithApiKey } = useAuth();
  const [mode, setMode] = useState<'email' | 'apikey'>('email');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'email') {
        if (!email.trim()) {
          setError('Email is required');
          setIsLoading(false);
          return;
        }
        await login(email.trim());
      } else {
        if (!apiKey.trim()) {
          setError('API key is required');
          setIsLoading(false);
          return;
        }
        await loginWithApiKey(apiKey.trim());
      }
      navigate('/missions');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-wide text-white font-mono">SYNAPSE</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono border border-cyan-500/30">OS</span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Operator Control Plane</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-1">Sign in to SYNAPSE</h2>
          <p className="text-xs text-slate-400 mb-6">Authenticate to access the Operator Console</p>

          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg mb-5">
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'email'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMode('apikey')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                mode === 'apikey'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              API Key
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'email' ? (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@synapse.os"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 transition-colors font-mono"
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 transition-colors font-mono"
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6 font-mono">
          SYNAPSE-OS · Operator Control Plane
        </p>
      </div>
    </div>
  );
}
