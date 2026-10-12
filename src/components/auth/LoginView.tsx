import React, { useState } from 'react';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight, Sparkles, Shield, UserCheck } from 'lucide-react';
import { signInWithEmail } from '../../services/authService';
import { UserRole } from '../../types/student';

interface LoginViewProps {
  onSuccess: () => void;
  onEnterDemoMode: (role?: UserRole) => void;
  isSupabaseConnected: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  onEnterDemoMode,
  isSupabaseConnected,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your college email and password.');
      return;
    }

    setIsLoading(true);
    const result = await signInWithEmail(email, password);
    setIsLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setErrorMessage(result.error || 'Invalid credentials or connection error.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/20 mb-4 border border-indigo-400/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <span>EduPulse</span>
            <span className="text-xs px-2 py-0.5 rounded-md font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest">
              AI
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Student Analytics & Early Intervention Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl shadow-black/40">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">Institutional Sign In</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                isSupabaseConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {isSupabaseConnected ? 'Supabase Live' : 'Demo Ready'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authenticate using your college email credentials to access your dashboard.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                College Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. prof.sharma@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Institutional Note */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span>Public self-registration disabled. Accounts are provisioned by College Administrator.</span>
          </div>
        </div>

        {/* Demo Mode Fallback Container */}
        <div className="mt-6 p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hackathon Reviewer Mode (Safe Demo Sandbox)</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Evaluating without campus Supabase credentials? Explore the platform using preconfigured local synthetic personas (Does not access remote DB):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onEnterDemoMode('admin')}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-medium rounded-xl border border-slate-700/60 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Demo</span>
            </button>
            <button
              type="button"
              onClick={() => onEnterDemoMode('teacher')}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-medium rounded-xl border border-slate-700/60 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Teacher Demo</span>
            </button>
            <button
              type="button"
              onClick={() => onEnterDemoMode('student')}
              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-medium rounded-xl border border-slate-700/60 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Student Demo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
