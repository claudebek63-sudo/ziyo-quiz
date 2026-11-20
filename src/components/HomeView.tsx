import { AlertCircle, ArrowRight, Play } from 'lucide-react';
import { useState } from 'react';
import { apiVerifySessionCode } from '../lib/api';
import type { Quiz, SessionSummary } from '../types/quiz';

interface HomeViewProps {
  publicQuizzes: Quiz[];
  loadingQuizzes: boolean;
  onCodeVerified: (session: SessionSummary) => void;
  onStartPublicQuiz: (quizId: string) => void;
  startingQuizId: string | null;
}

export function HomeView({
  publicQuizzes,
  loadingQuizzes,
  onCodeVerified,
  onStartPublicQuiz,
  startingQuizId,
}: HomeViewProps) {
  const [codeInput, setCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = codeInput.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      setErrorMsg("Topilmadi! Bunday ID mavjud emas yoki faol emas.");
      return;
    }

    setErrorMsg(null);
    setVerifying(true);
    try {
      const result = await apiVerifySessionCode(cleaned);
      if (!result.valid || !result.session) {
        setErrorMsg(result.error || "Topilmadi! Bunday ID mavjud emas yoki faol emas.");
        return;
      }
      onCodeVerified(result.session);
    } catch {
      setErrorMsg("Topilmadi! Bunday ID mavjud emas yoki faol emas.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-8">
      {/* Center Hero Section */}
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center text-center pt-6 pb-14">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
          ZiyoQuiz
        </h1>
        <p className="mt-3 max-w-lg text-base sm:text-lg text-white/80 leading-relaxed">
          6 xonali o‘yin ID raqamini kiriting yoki tayyor viktorinalardan birini jonli boshlang.
        </p>

        <form
          onSubmit={handleJoinSubmit}
          className="mt-8 flex w-full max-w-xl flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl bg-white p-2 shadow-2xl"
        >
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={codeInput}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCodeInput(digits);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="6 xonali quiz ID ni kiriting"
            aria-label="6 xonali quiz ID ni kiriting"
            className="flex-1 rounded-xl bg-transparent px-4 py-3 text-base sm:text-lg font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-none tabular-nums tracking-wider"
          />
          <button
            type="submit"
            disabled={verifying}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-md hover:from-[#C026D3] hover:to-[#7E22CE] transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <span>{verifying ? 'Tekshirilmoqda...' : 'ID orqali kirish'}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-400/50 bg-red-600/95 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-white" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Bottom Ready Quizzes Section */}
      <section className="mt-2">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-white/15 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Tayyor viktorinalar
          </h2>
          <span className="text-sm text-white/65 tabular-nums">
            {publicQuizzes.length} ta to‘plam
          </span>
        </div>

        {loadingQuizzes ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-48 rounded-2xl bg-white/10 animate-pulse border border-white/10"
              />
            ))}
          </div>
        ) : publicQuizzes.length === 0 ? (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-10 text-center text-white/75">
            Hozircha umumiy viktorinalar mavjud emas. "Mening panelim" orqali yangisini yarating!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {publicQuizzes.map((quiz) => (
              <article
                key={quiz.id}
                className="flex flex-col justify-between rounded-2xl bg-white p-6 text-slate-900 shadow-lg transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 tabular-nums">
                    <span>{quiz.questions.length} ta savol</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{quiz.ownerName}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900 leading-snug">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {quiz.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onStartPublicQuiz(quiz.id)}
                    disabled={startingQuizId === quiz.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#461A42] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#5E2359] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Play className="h-4 w-4 shrink-0 fill-current" />
                    <span>
                      {startingQuizId === quiz.id ? 'Tayyorlanmoqda...' : 'Testni boshlash'}
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
