import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  Phone,
  Key,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

function isPhoneInput(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return (
    digits.length === 10 ||
    (digits.length === 12 && digits.startsWith('91')) ||
    (digits.length === 11 && digits.startsWith('0'))
  );
}

export const LoginScreen: React.FC = () => {
  const { signInWithPassword, enterDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email/phone and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await signInWithPassword(email.trim(), password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials. Please verify your login details.');
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign-in.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }

    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    setTimeout(() => {
      setResetLoading(false);
      setResetSuccess('If your email is registered, a password reset link is on its way. Please check your inbox.');
      setTimeout(() => setShowResetModal(false), 2600);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 flex flex-col items-center justify-center p-4">
      {/* Header — Exact Saraswati Nagri CRM */}
      <div className="flex flex-col items-center pb-6 text-center">
        <div className="mb-4 h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-2xl ring-1 ring-white/20 shrink-0">
          <Building2 className="h-12 w-12 sm:h-14 sm:w-14 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center max-w-xs">
          Saraswati Nagri
        </h1>
        <p className="text-rose-300/80 text-sm mt-1 font-medium">Operations &amp; CRM</p>
      </div>

      {/* Content Glass Card — Exact Saraswati Nagri CRM */}
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-5 w-full">
          <div className="flex items-center gap-3 self-start">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Sign in</p>
              <p className="text-white/50 text-xs">Enter your email or phone and password</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div
              className={`flex items-center gap-2.5 bg-white/10 border rounded-xl px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-rose-400 focus-within:border-rose-400 ${
                error ? 'border-red-400' : 'border-white/20'
              }`}
            >
              {isPhoneInput(email) ? (
                <Phone className="w-5 h-5 text-white/50 shrink-0" />
              ) : (
                <Mail className="w-5 h-5 text-white/50 shrink-0" />
              )}
              <input
                type="text"
                name="username"
                autoComplete="username"
                inputMode={isPhoneInput(email) ? 'numeric' : 'email'}
                placeholder="Email or 10-digit phone"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                disabled={loading}
                className="flex-1 bg-transparent text-white text-sm sm:text-base outline-none placeholder:text-white/30"
                autoFocus
              />
            </div>

            <div
              className={`flex items-center gap-2.5 bg-white/10 border rounded-xl px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-rose-400 focus-within:border-rose-400 ${
                error ? 'border-red-400' : 'border-white/20'
              }`}
            >
              <Lock className="w-5 h-5 text-white/50 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={loading}
                className="flex-1 bg-transparent text-white text-sm sm:text-base outline-none placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/50 hover:text-white transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex justify-end pr-1">
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(true);
                  setResetError('');
                  setResetSuccess('');
                }}
                className="text-xs text-rose-300 hover:text-rose-100 transition-colors focus:outline-none cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="w-full flex items-start gap-2.5 text-xs font-medium text-red-200 bg-red-500/10 p-3 rounded-xl border border-red-500/30">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <span className="flex-1 leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className={`w-full py-3 mt-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                loading || !email.trim() || !password.trim()
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 shadow-lg shadow-rose-500/25 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Demo Staff Login */}
          <div className="w-full pt-1">
            <button
              type="button"
              onClick={enterDemoMode}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Demo Staff Access</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contact admin notice */}
      <div className="mt-6 text-center text-white/30 text-xs">
        <p>Contact your administrator if you need access.</p>
      </div>

      {/* Reset Password Modal — Exact Saraswati Nagri CRM */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 rounded-3xl border border-white/20 max-w-sm w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-300">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-[16px]">Reset Password</h3>
                <p className="text-xs text-white/50">Send a password reset link to your email</p>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">
                  Email Address
                </label>
                <div
                  className={`flex items-center gap-2 bg-white/10 border rounded-xl px-4 py-2.5 transition-all focus-within:ring-2 focus-within:ring-rose-400 focus-within:border-rose-400 ${
                    resetError ? 'border-red-400' : 'border-white/20'
                  }`}
                >
                  <Mail className="w-5 h-5 text-white/50" />
                  <input
                    type="email"
                    placeholder="Enter registered email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setResetError('');
                    }}
                    disabled={resetLoading}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                    autoFocus
                  />
                </div>
              </div>

              {resetError && (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading || Boolean(resetSuccess)}
                className={`w-full h-10 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer ${
                  resetLoading || resetSuccess
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 shadow-lg shadow-rose-500/25'
                }`}
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Link...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
