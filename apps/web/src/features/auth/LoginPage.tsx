import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ArrowRight, Loader2, ShieldCheck, UserPlus, Key, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/state/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithApiKey } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'apikey'>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (mode === 'login') {
        if (!email.trim()) {
          setError('Email is required');
          setIsLoading(false);
          return;
        }
        await login(email.trim());
      } else if (mode === 'register') {
        if (!email.trim()) {
          setError('Email is required');
          setIsLoading(false);
          return;
        }
        await register(email.trim(), fullName.trim());
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
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-2xl tracking-wide text-white font-mono">SYNAPSE</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono border border-cyan-500/30">
              OS V3
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Governed Autonomous Agent Operating System
          </p>
        </div>

        {/* First-Run Onboarding Banner */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> First-Run Operator Journey
            </span>
            <span className="text-[10px] text-slate-500">Zero-Trust Governed</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1">
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-0.5">
              <span className="text-cyan-400 font-bold block">1. Auth & Org</span>
              <span className="text-slate-500">Sign in / Register</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-0.5">
              <span className="text-purple-400 font-bold block">2. Add Provider</span>
              <span className="text-slate-500">AES-256-GCM Key</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-0.5">
              <span className="text-emerald-400 font-bold block">3. Cline Brain</span>
              <span className="text-slate-500">Execute Mission</span>
            </div>
          </div>
        </div>

        {/* Authentication Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {mode === 'register' ? 'Register New Operator' : 'Operator Sign In'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'register'
                  ? 'Create account and join authoritative tenant workspace'
                  : 'Authenticate to access the Mission Command Center'}
              </p>
            </div>
          </div>

          {/* Mode Toggle Tabs */}
          <div className="flex gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg mb-5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Register
            </button>
            <button
              type="button"
              onClick={() => setMode('apikey')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === 'apikey'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" /> API Key
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 transition-colors font-mono"
                  autoFocus
                />
              </div>
            )}

            {mode !== 'apikey' ? (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@synapse.os"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 transition-colors font-mono"
                  autoFocus={mode === 'login'}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Operator API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="syn_live_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 transition-colors font-mono"
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs text-rose-300 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'register' ? 'Create Account & Continue' : 'Enter Mission Command'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security / Governance Footnote */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ToolGateway Governed
          </span>
          <span>Tenant & RBAC Isolated</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
