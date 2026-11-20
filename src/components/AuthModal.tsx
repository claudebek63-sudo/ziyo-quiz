import { AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { useState } from 'react';
import { apiLogin, apiRegister } from '../lib/api';
import {
  isSupabaseConfigured,
  signInWithSupabaseEmail,
  signInWithSupabaseGoogle,
  signUpWithSupabaseEmail,
} from '../lib/supabase';
import type { User } from '../types/quiz';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (isSupabaseConfigured) {
          const res = await signInWithSupabaseEmail(email, password);
          if (res.error || !res.user) {
            setError('Topilmadi');
            return;
          }
          onSuccess(res.user);
          onClose();
          return;
        }

        const res = await apiLogin(email, password);
        if (res.error || !res.user) {
          setError('Topilmadi');
          return;
        }
        onSuccess(res.user);
        onClose();
      } else {
        if (!name.trim()) {
          setError('Ismingizni kiriting');
          return;
        }
        if (isSupabaseConfigured) {
          const res = await signUpWithSupabaseEmail(name, email, password);
          if (res.error || !res.user) {
            setError(res.error || "Ro'yxatdan o'tishda xatolik");
            return;
          }
          onSuccess(res.user);
          onClose();
          return;
        }

        const res = await apiRegister(name, email, password);
        if (res.error || !res.user) {
          setError(res.error || "Ro'yxatdan o'tishda xatolik");
          return;
        }
        onSuccess(res.user);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError(
        "Google OAuth uchun Supabase kalitlari (.env da VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY) ulanmagan. Hozircha Gmail va parol orqali kirishingiz yoki akkauntsiz davom etishingiz mumkin."
      );
      return;
    }
    setLoading(true);
    const res = await signInWithSupabaseGoogle();
    setLoading(false);
    if (res.error) {
      setError(res.error);
    }
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="auth-modal-title" className="text-xl font-bold text-slate-900">
          {mode === 'login' ? 'Tizimga kirish' : "Ro'yxatdan o'tish"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Kirish ixtiyoriy — akkauntsiz ham viktorina yaratish va o‘ynash mumkin.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#461A42] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kirish
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#461A42] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ro'yxatdan o'tish
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>Google orqali kirish</span>
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">yoki Gmail bilan</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ismingiz
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Azizbek"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#8854C0] focus:outline-none focus:ring-2 focus:ring-[#8854C0]/20"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gmail manzili
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="example@gmail.com"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#8854C0] focus:outline-none focus:ring-2 focus:ring-[#8854C0]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parol
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Parolingizni kiriting"
                className="w-full rounded-xl border border-slate-300 pl-3.5 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#8854C0] focus:outline-none focus:ring-2 focus:ring-[#8854C0]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rish"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#8854C0] px-4 py-3 text-sm font-bold text-white hover:bg-[#7643AC] transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading
              ? 'Tekshirilmoqda...'
              : mode === 'login'
              ? 'Kirish'
              : "Akkaunt yaratish"}
          </button>
        </form>
      </div>
    </div>
  );
}
