import confetti from 'canvas-confetti';
import { Award, Crown, Home, RotateCcw, Trophy } from 'lucide-react';
import { useEffect } from 'react';
import type { LeaderboardEntry } from '../types/quiz';

interface PodiumViewProps {
  quizTitle: string;
  leaderboard: LeaderboardEntry[];
  highlightPlayerId?: string;
  onExitHome: () => void;
  onReplay?: () => void;
}

export function PodiumView({
  quizTitle,
  leaderboard,
  highlightPlayerId,
  onExitHome,
  onReplay,
}: PodiumViewProps) {
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
    });
  }, []);

  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];
  const rest = leaderboard.slice(3);
  const myEntry = highlightPlayerId
    ? leaderboard.find((e) => e.playerId === highlightPlayerId)
    : undefined;

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-16 pt-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#F0ABFC]">
          <Trophy className="h-4 w-4" />
          <span>{quizTitle}</span>
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-white">
          G‘oliblar shohsupasi
        </h1>
        {myEntry && (
          <p className="mt-2 text-base font-semibold text-white/90 tabular-nums">
            Sizning natijangiz: {myEntry.rank}-o‘rin · {myEntry.score} ball ({myEntry.correctCount} ta to‘g‘ri)
          </p>
        )}
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length === 0 ? (
        <div className="mt-10 w-full rounded-2xl border border-white/15 bg-white/10 p-8 text-center text-white/80">
          O‘yinda ishtirokchilar qayd etilmadi.
        </div>
      ) : (
        <div className="mt-10 grid w-full grid-cols-1 sm:grid-cols-3 items-end gap-4">
          {/* 2nd Place */}
          <div className="order-2 sm:order-1 flex flex-col items-center">
            {second ? (
              <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-5 text-center backdrop-blur-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-300 text-slate-900 font-extrabold text-lg shadow">
                  2
                </div>
                <div className="mt-3 truncate text-lg font-bold text-white">
                  {second.nickname}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-[#F0ABFC] tabular-nums">
                  {second.score}
                </div>
                <div className="text-xs font-medium text-white/70 tabular-nums">
                  ball · {second.correctCount} ta to‘g‘ri
                </div>
                <div className="mt-4 h-20 rounded-xl bg-gradient-to-t from-slate-400/30 to-slate-300/20 flex items-center justify-center text-sm font-bold text-slate-200">
                  <Award className="h-5 w-5 mr-1.5" />
                  2-o‘rin
                </div>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          {/* 1st Place */}
          <div className="order-1 sm:order-2 flex flex-col items-center">
            {first && (
              <div
                className={`w-full rounded-2xl border p-6 text-center shadow-2xl ${
                  highlightPlayerId === first.playerId
                    ? 'border-emerald-300 bg-gradient-to-b from-[#8854C0] to-[#461A42]'
                    : 'border-amber-300/60 bg-gradient-to-b from-[#6B21A8] to-[#3B0764]'
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-extrabold text-xl shadow-lg">
                  <Crown className="h-7 w-7" />
                </div>
                <div className="mt-3 truncate text-xl font-extrabold text-white">
                  {first.nickname}
                </div>
                <div className="mt-1 text-3xl font-extrabold text-amber-300 tabular-nums">
                  {first.score}
                </div>
                <div className="text-xs font-medium text-white/80 tabular-nums">
                  ball · {first.correctCount} ta to‘g‘ri
                </div>
                <div className="mt-4 h-28 rounded-xl bg-gradient-to-t from-amber-500/40 to-amber-300/25 flex items-center justify-center text-base font-extrabold text-amber-200">
                  1-o‘rin · Chempion
                </div>
              </div>
            )}
          </div>

          {/* 3rd Place */}
          <div className="order-3 flex flex-col items-center">
            {third ? (
              <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-5 text-center backdrop-blur-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-700 text-amber-100 font-extrabold text-lg shadow">
                  3
                </div>
                <div className="mt-3 truncate text-lg font-bold text-white">
                  {third.nickname}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-[#F0ABFC] tabular-nums">
                  {third.score}
                </div>
                <div className="text-xs font-medium text-white/70 tabular-nums">
                  ball · {third.correctCount} ta to‘g‘ri
                </div>
                <div className="mt-4 h-14 rounded-xl bg-gradient-to-t from-amber-800/35 to-amber-600/20 flex items-center justify-center text-sm font-bold text-amber-200">
                  3-o‘rin
                </div>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
        </div>
      )}

      {/* Remaining Standings */}
      {rest.length > 0 && (
        <div className="mt-8 w-full rounded-2xl bg-white p-4 sm:p-6 text-slate-900 shadow-xl">
          <h2 className="mb-3 text-base font-bold text-slate-800">
            Barcha natijalar
          </h2>
          <div className="divide-y divide-slate-100">
            {rest.map((entry) => (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between py-3 px-3 rounded-xl ${
                  entry.playerId === highlightPlayerId ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 text-sm font-extrabold text-slate-500 tabular-nums">
                    {entry.rank}.
                  </span>
                  <span className="truncate font-bold text-slate-900">
                    {entry.nickname}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm shrink-0 tabular-nums">
                  <span className="text-slate-500">{entry.correctCount} ta to‘g‘ri</span>
                  <span className="font-extrabold text-[#461A42]">{entry.score} ball</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onExitHome}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
        >
          <Home className="h-4 w-4" />
          <span>Bosh sahifaga qaytish</span>
        </button>

        {onReplay && (
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-6 py-3 text-sm font-bold text-white shadow-lg hover:from-[#C026D3] hover:to-[#7E22CE] transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Yangi ID bilan qayta o‘ynash</span>
          </button>
        )}
      </div>
    </main>
  );
}
