import { ArrowLeft, ArrowRight, UserCheck } from 'lucide-react';
import { useState } from 'react';
import type { SessionSummary } from '../types/quiz';

interface JoinNicknameViewProps {
  session: SessionSummary;
  onBack: () => void;
  onSubmitNickname: (nickname: string) => void;
}

export function JoinNicknameView({
  session,
  onBack,
  onSubmitNickname,
}: JoinNicknameViewProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('Iltimos, o‘yindagi ismingizni (Nickname) kiriting');
      return;
    }
    onSubmitNickname(trimmed);
  };

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center px-6 pt-14 pb-20">
      <div className="w-full rounded-2xl bg-white p-8 text-slate-900 shadow-2xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Ortga</span>
        </button>

        <div className="text-xs font-semibold text-[#8854C0] tabular-nums">
          ID: {session.code} · {session.totalQuestions} ta savol
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          {session.quizTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          O‘yinga qo‘shilish uchun ismingiz yoki taxallusingizni (Nickname) kiriting.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nickname
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                maxLength={28}
                autoFocus
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Masalan: Jasur_07"
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#8854C0] focus:outline-none focus:ring-2 focus:ring-[#8854C0]/20"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-5 py-3.5 text-base font-bold text-white shadow-md hover:from-[#C026D3] hover:to-[#7E22CE] transition-all cursor-pointer"
          >
            <span>Kutish xonasiga kirish</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </main>
  );
}
