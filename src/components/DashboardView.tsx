import { ArrowLeft, Edit3, Play, Plus, Trash2 } from 'lucide-react';
import type { Quiz, User } from '../types/quiz';

interface DashboardViewProps {
  user: User | null;
  quizzes: Quiz[];
  loading: boolean;
  startingQuizId: string | null;
  onBackHome: () => void;
  onCreateNew: () => void;
  onEditQuiz: (quiz: Quiz) => void;
  onStartEditLive: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
}

export function DashboardView({
  user,
  quizzes,
  loading,
  startingQuizId,
  onBackHome,
  onCreateNew,
  onEditQuiz,
  onStartEditLive,
  onDeleteQuiz,
}: DashboardViewProps) {
  return (
    <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/15 pb-6">
        <div>
          <button
            type="button"
            onClick={onBackHome}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-white/75 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Bosh sahifaga</span>
          </button>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Mening panelim
          </h1>
          <p className="mt-1 text-sm text-white/75">
            {user
              ? `${user.name} (${user.email}) — shaxsiy viktorinalaringiz`
              : 'Akkauntsiz mehmon rejimi — yaratgan viktorinalaringiz shu brauzerda saqlanadi'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-5 py-3 text-sm font-bold text-white shadow-lg hover:from-[#C026D3] hover:to-[#7E22CE] transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Yangi viktorina yaratish</span>
        </button>
      </div>

      <section className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-2xl border border-white/15 bg-white/10 p-12 text-center backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white">
              Hali viktorina yaratilmagan
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/75">
              Akkauntsiz ham o‘zingizning birinchi viktorinangizni tuzib, do‘stlaringiz yoki o‘quvchilaringiz bilan jonli o‘ynashingiz mumkin.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#461A42] hover:bg-white/90 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Yangi viktorina yaratish</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <article
                key={quiz.id}
                className="flex flex-col justify-between rounded-2xl bg-white p-6 text-slate-900 shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 tabular-nums">
                    <span>{quiz.questions.length} ta savol</span>
                    <span>
                      {quiz.isPublic ? 'Umumiy' : 'Shaxsiy'}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-900 leading-snug">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">
                      {quiz.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onStartEditLive(quiz.id)}
                    disabled={startingQuizId === quiz.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8854C0] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#7643AC] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Play className="h-4 w-4 shrink-0 fill-current" />
                    <span>
                      {startingQuizId === quiz.id ? 'ID yaratilmoqda...' : 'Start edit'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditQuiz(quiz)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteQuiz(quiz.id)}
                      aria-label="Viktorinani o'chirish"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>O‘chirish</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
