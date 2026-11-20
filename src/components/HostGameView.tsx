import { ArrowLeft, ArrowRight, Check, Clock, Copy, Play, Trophy, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '../lib/api';
import type {
  LeaderboardEntry,
  PlayerInfo,
  PublicQuestionPayload,
  SessionStatus,
} from '../types/quiz';
import { PodiumView } from './PodiumView';

interface HostGameViewProps {
  code: string;
  hostSecret: string;
  quizTitle: string;
  onExit: () => void;
  onReplay: () => void;
}

export function HostGameView({
  code,
  hostSecret,
  quizTitle,
  onExit,
  onReplay,
}: HostGameViewProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<SessionStatus>('waiting');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [question, setQuestion] = useState<PublicQuestionPayload | null>(null);
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([]);
  const [optionCounts, setOptionCounts] = useState<Record<string, number>>({});
  const [answeredCount, setAnsweredCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [copied, setCopied] = useState(false);
  const [hintMsg, setHintMsg] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  useEffect(() => {
    let closedByUnmount = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'host:join',
            payload: { code, hostSecret },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            payload: Record<string, unknown>;
          };
          const p = msg.payload || {};

          if (msg.type === 'host:state') {
            setStatus(p.status as SessionStatus);
            setPlayers((p.players as PlayerInfo[]) || []);
            if (p.question) {
              const q = p.question as PublicQuestionPayload;
              setQuestion(q);
              setServerOffsetMs(Date.now() - q.serverNow);
            }
            setCorrectOptionIds((p.correctOptionIds as string[]) || []);
            setLeaderboard((p.leaderboard as LeaderboardEntry[]) || []);
          } else if (msg.type === 'room:players') {
            setPlayers((p.players as PlayerInfo[]) || []);
            setHintMsg(null);
          } else if (msg.type === 'game:question') {
            const q = p.question as PublicQuestionPayload;
            setStatus('question');
            setQuestion(q);
            setServerOffsetMs(Date.now() - q.serverNow);
            setCorrectOptionIds((p.correctOptionIds as string[]) || []);
            setAnsweredCount(0);
            setOptionCounts({});
          } else if (msg.type === 'host:answer_progress') {
            setAnsweredCount(Number(p.answeredCount || 0));
          } else if (msg.type === 'game:question_result') {
            setStatus('question_result');
            setCorrectOptionIds((p.correctOptionIds as string[]) || []);
            setOptionCounts((p.optionCounts as Record<string, number>) || {});
            setAnsweredCount(Number(p.answeredCount || 0));
          } else if (msg.type === 'game:leaderboard') {
            setStatus('leaderboard');
            setLeaderboard((p.leaderboard as LeaderboardEntry[]) || []);
            setIsLastQuestion(Boolean(p.isLastQuestion));
          } else if (msg.type === 'game:podium') {
            setStatus('finished');
            setLeaderboard((p.leaderboard as LeaderboardEntry[]) || []);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!closedByUnmount) {
          reconnectTimer = setTimeout(connect, 1200);
        }
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [code, hostSecret]);

  // Smooth countdown timer synchronized to server start time
  useEffect(() => {
    if (status !== 'question' || !question) return;
    const update = () => {
      const serverNow = Date.now() - serverOffsetMs;
      const elapsedSec = (serverNow - question.startedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(question.timeLimitSec - elapsedSec));
      setTimeLeftSec(remaining);
    };
    update();
    const id = setInterval(update, 150);
    return () => clearInterval(id);
  }, [status, question, serverOffsetMs]);

  const sendCommand = (type: string) => {
    wsRef.current?.send(
      JSON.stringify({
        type,
        payload: { code, hostSecret },
      })
    );
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleStartGame = () => {
    if (players.length === 0) {
      setHintMsg("Kamida 1 nafar o‘yinchi 6 xonali ID orqali qo‘shilishini kuting.");
      return;
    }
    sendCommand('host:start');
  };

  if (status === 'finished') {
    return (
      <PodiumView
        quizTitle={quizTitle}
        leaderboard={leaderboard}
        onExitHome={onExit}
        onReplay={onReplay}
      />
    );
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-4">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Chiqish</span>
          </button>
          <div>
            <div className="text-xs font-semibold text-[#F0ABFC] tabular-nums">
              O‘yin ID: {code}
            </div>
            <h1 className="text-lg font-bold text-white">{quizTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm font-bold text-white tabular-nums">
          <Users className="h-4 w-4 text-[#F0ABFC]" />
          <span>{players.length} ta o‘yinchi</span>
        </div>
      </div>

      {/* WAITING ROOM */}
      {status === 'waiting' && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left: Giant 6-digit ID & Start Button */}
          <section className="lg:col-span-5 rounded-3xl bg-white p-8 text-slate-900 shadow-2xl text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8854C0]">
              Kutish xonasi · Boshlovchi ekrani
            </div>
            <p className="mt-2 text-sm text-slate-600">
              O‘yinchilar bosh sahifada ushbu 6 xonali ID raqamini kiritib qo‘shiladilar:
            </p>

            <div className="mt-5 rounded-2xl bg-[#461A42] px-6 py-6 text-white shadow-inner">
              <div className="font-mono text-5xl sm:text-6xl font-extrabold tracking-[0.2em] tabular-nums select-all">
                {code}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'ID nusxalandi!' : 'ID raqamini nusxalash'}</span>
            </button>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={handleStartGame}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-6 py-4 text-base font-extrabold text-white shadow-lg hover:from-[#C026D3] hover:to-[#7E22CE] transition-all cursor-pointer"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>O‘yinni boshlash</span>
              </button>

              {hintMsg && (
                <p className="mt-3 text-xs font-semibold text-amber-700">
                  {hintMsg}
                </p>
              )}
            </div>
          </section>

          {/* Right: Real-time Joined Players List */}
          <section className="lg:col-span-7 rounded-3xl border border-white/15 bg-white/10 p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <h2 className="text-xl font-bold text-white">
                Qo‘shilgan o‘yinchilar
              </h2>
              <span className="text-sm font-bold text-[#F0ABFC] tabular-nums">
                {players.length} nafar
              </span>
            </div>

            {players.length === 0 ? (
              <div className="py-16 text-center text-white/75">
                <p className="text-base font-semibold">
                  Hozircha o‘yinchilar qo‘shilmagan
                </p>
                <p className="mt-1.5 text-sm text-white/60">
                  O‘yinchilar {code} ID raqamini kiritishi bilanoq ularning nickname’lari shu yerda real vaqtda paydo bo‘ladi.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {players.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-slate-900 shadow"
                  >
                    <span className="truncate font-bold">{pl.nickname}</span>
                    <span className="text-xs font-semibold text-emerald-600 shrink-0 ml-2">
                      Tayyor
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ACTIVE QUESTION & QUESTION RESULT */}
      {(status === 'question' || status === 'question_result') && question && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm font-bold text-white/90 tabular-nums">
              Savol {question.index + 1} / {question.totalQuestions}
              <span className="mx-2 text-white/40">·</span>
              <span>{question.points} ball</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-bold text-white/90 tabular-nums">
                Javob berdi: {answeredCount} / {players.length}
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-base font-extrabold text-white tabular-nums">
                <Clock className="h-4 w-4 text-[#F0ABFC]" />
                <span>{status === 'question_result' ? '0 s' : `${timeLeftSec} s`}</span>
              </div>
            </div>
          </div>

          {/* Timer Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full bg-gradient-to-r from-[#D946EF] to-[#22C55E] transition-all duration-150"
              style={{
                width:
                  status === 'question_result'
                    ? '0%'
                    : `${Math.max(0, Math.min(100, (timeLeftSec / question.timeLimitSec) * 100))}%`,
              }}
            />
          </div>

          <div className="rounded-3xl bg-white p-8 text-center text-slate-900 shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug">
              {question.text}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {question.options.map((opt) => {
              const isCorrect = correctOptionIds.includes(opt.id);
              const showResult = status === 'question_result';
              const count = optionCounts[opt.id] || 0;

              return (
                <div
                  key={opt.id}
                  style={{ backgroundColor: opt.color }}
                  className={`flex min-h-[160px] flex-col justify-between rounded-2xl p-5 text-white shadow-lg transition-all ${
                    showResult && isCorrect
                      ? 'ring-4 ring-[#22C55E] scale-[1.02]'
                      : showResult && !isCorrect
                      ? 'opacity-45'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span>{opt.label}</span>
                    {showResult && (
                      <span className="tabular-nums">
                        {count} ta tanlov
                      </span>
                    )}
                  </div>
                  <div className="my-2 text-center text-lg font-bold">
                    {opt.text}
                  </div>
                  <div className="text-center text-xs font-bold">
                    {showResult && isCorrect ? "To'g'ri javob" : ''}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-2">
            {status === 'question' ? (
              <button
                type="button"
                onClick={() => sendCommand('host:end_question')}
                className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                Vaqtni yakunlash va javobni ko‘rsatish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => sendCommand('host:show_leaderboard')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-7 py-3.5 text-base font-bold text-white shadow-lg hover:from-[#C026D3] hover:to-[#7E22CE] transition-all cursor-pointer"
              >
                <Trophy className="h-5 w-5" />
                <span>Reyting jadvalini ko‘rish</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* BETWEEN-QUESTIONS LEADERBOARD */}
      {status === 'leaderboard' && (
        <div className="mx-auto mt-8 w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-6 w-6 text-[#8854C0]" />
              <h2 className="text-2xl font-extrabold text-slate-900">
                Reyting jadvali
              </h2>
            </div>
            <span className="text-sm font-semibold text-slate-500 tabular-nums">
              {leaderboard.length} ishtirokchi
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {leaderboard.map((entry) => (
              <div
                key={entry.playerId}
                className="flex items-center justify-between py-3.5 px-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold tabular-nums ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-amber-950'
                        : entry.rank === 2
                        ? 'bg-slate-200 text-slate-800'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <span className="truncate font-bold text-slate-900">
                    {entry.nickname}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0 tabular-nums">
                  {entry.lastEarnedPoints > 0 && (
                    <span className="text-xs font-bold text-emerald-600">
                      +{entry.lastEarnedPoints}
                    </span>
                  )}
                  <span className="text-base font-extrabold text-[#461A42]">
                    {entry.score} ball
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => sendCommand('host:next_question')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-6 py-3.5 text-base font-bold text-white shadow-lg hover:from-[#C026D3] hover:to-[#7E22CE] transition-all cursor-pointer"
            >
              <span>
                {isLastQuestion ? 'G‘oliblar shohsupasini ko‘rish' : 'Keyingi savol'}
              </span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
