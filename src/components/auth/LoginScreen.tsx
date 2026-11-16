import React, { useState } from 'react';
import { Building2, Mail, Lock, Loader2, Eye, EyeOff, AlertTriangle, Database, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export const LoginScreen: React.FC = () => {
  const { signInWithPassword, enterDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your Saraswati Nagri CRM email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await signInWithPassword(email, password);
    if (!res.success) {
      setError(res.error || 'Sign-in failed. Please verify your Saraswati Nagri CRM credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 flex flex-col">
      {/* Header matching Saraswati Nagri CRM /login */}
      <div className="flex flex-col items-center pt-12 pb-6 px-4 text-center">
        <div className="mb-4 h-24 w-24 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-2xl ring-1 ring-white/20">
          <Building2 className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Saraswati Nagri</h1>
        <p className="text-rose-300/90 text-sm font-semibold mt-1">
          Operations &amp; CRM • Nagpur Properties Resale Desk
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-[11px] font-bold">
          <Database className="w-3.5 h-3.5" />
          <span>Connected to Saraswati Nagri Supabase</span>
        </div>
      </div>

      {/* Login Glass Card */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-10">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">CRM Staff Sign In</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Use your existing Saraswati Nagri CRM login to sync live leads &amp; inventory
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs font-medium text-rose-200 bg-rose-500/20 p-3 rounded-xl border border-rose-400/30">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
                CRM Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@saraswatinagri.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/15 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/60 border border-white/15 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{loading ? 'Connecting to Supabase...' : 'Sign In to Resale Desk'}</span>
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/15 text-center space-y-2.5">
            <p className="text-[11px] text-slate-300">
              Want to preview the UI or test without signing in right now?
            </p>
            <button
              type="button"
              onClick={enterDemoMode}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Open Offline Demo Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

