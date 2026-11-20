import { ArrowLeft, Check, CheckCircle2, Clock, Send, Trophy, Users, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '../lib/api';
import type {
  LeaderboardEntry,
  PlayerInfo,
  PublicQuestionPayload,
  SessionStatus,
} from '../types/quiz';
import { PodiumView } from './PodiumView';

interface PlayerGameViewProps {
  code: string;
  nickname: string;
  quizTitle: string;
  onExit: () => void;
}

export function PlayerGameView({
  code,
  nickname,
  quizTitle: initialTitle,
  onExit,
}: PlayerGameViewProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [playerId, setPlayerId] = useState<string>(() => {
    const key = `ziyoquiz_player_${code}_${nickname}`;
    return sessionStorage.getItem(key) || '';
  });
  const [quizTitle, setQuizTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SessionStatus>('waiting');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [question, setQuestion] = useState<PublicQuestionPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    earnedPoints: number;
    correctOptionIds: string[];
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [wsError, setWsError] = useState<string | null>(null);

  useEffect(() => {
    let closedByUnmount = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const storageKey = `ziyoquiz_player_${code}_${nickname}`;

    const connect = () => {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        const storedId = sessionStorage.getItem(storageKey) || '';
        ws.send(
          JSON.stringify({
            type: 'player:join',
            payload: { code, nickname, playerId: storedId || undefined },
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

          if (msg.type === 'error') {
            setWsError(String(p.message || 'Xatolik yuz berdi'));
          } else if (msg.type === 'player:state') {
            const pid = String(p.playerId || '');
            if (pid) {
              setPlayerId(pid);
              sessionStorage.setItem(storageKey, pid);
            }
            if (p.quizTitle) setQuizTitle(String(p.quizTitle));
            setStatus(p.status as SessionStatus);
            setTotalScore(Number(p.score || 0));
            setPlayers((p.players as PlayerInfo[]) || []);
            setSubmitted(Boolean(p.hasAnsweredCurrent));
            if (p.question) {
              const q = p.question as PublicQuestionPayload;
              setQuestion(q);
              setServerOffsetMs(Date.now() - q.serverNow);
            }
            setLeaderboard((p.leaderboard as LeaderboardEntry[]) || []);
          } else if (msg.type === 'room:players') {
            setPlayers((p.players as PlayerInfo[]) || []);
          } else if (msg.type === 'game:question') {
            const q = p.question as PublicQuestionPayload;
            setStatus('question');
            setQuestion(q);
            setServerOffsetMs(Date.now() - q.serverNow);
            setSelectedIds([]);
            setSubmitted(false);
            setLastResult(null);
          } else if (msg.type === 'player:answer_ack') {
            setSubmitted(true);
            if (Array.isArray(p.selectedOptionIds)) {
              setSelectedIds(p.selectedOptionIds as string[]);
            }
          } else if (msg.type === 'game:question_result') {
            setStatus('question_result');
            setTotalScore(Number(p.totalScore || 0));
            setLastResult({
              isCorrect: Boolean(p.isCorrect),
              earnedPoints: Number(p.earnedPoints || 0),
              correctOptionIds: (p.correctOptionIds as string[]) || [],
            });
          } else if (msg.type === 'game:leaderboard') {
            setStatus('leaderboard');
            setLeaderboard((p.leaderboard as LeaderboardEntry[]) || []);
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
  }, [code, nickname]);

  // Synchronized countdown timer
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

  const submitAnswer = (optionIds: string[]) => {
    if (!question || submitted || status !== 'question' || optionIds.length === 0) return;
    setSelectedIds(optionIds);
    setSubmitted(true);
    wsRef.current?.send(
      JSON.stringify({
        type: 'player:answer',
        payload: {
          code,
          playerId,
          questionId: question.id,
          optionIds,
        },
      })
    );
  };

  const handleOptionClick = (optionId: string) => {
    if (!question || submitted || status !== 'question') return;
    if (question.answerMode === 'single') {
      submitAnswer([optionId]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    }
  };

  if (wsError) {
    return (
      <main className="relative z-10 mx-auto max-w-md px-6 pt-16 text-center">
        <div className="rounded-2xl bg-white p-8 text-slate-900 shadow-2xl">
          <p className="text-base font-bold text-red-600">{wsError}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-5 rounded-xl bg-[#461A42] px-5 py-2.5 text-sm font-bold text-white cursor-pointer"
          >
            Bosh sahifaga qaytish
          </button>
        </div>
      </main>
    );
  }

  if (status === 'finished') {
    return (
      <PodiumView
        quizTitle={quizTitle}
        leaderboard={leaderboard}
        highlightPlayerId={playerId}
        onExitHome={onExit}
      />
    );
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-6 pb-16 pt-4">
      {/* Top Player Bar */}
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
              ID: {code} · {nickname}
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white">{quizTitle}</h1>
          </div>
        </div>

        <div className="rounded-xl bg-white/15 px-4 py-2 text-sm font-extrabold text-white tabular-nums">
          Ball: {totalScore}
        </div>
      </div>

      {/* WAITING ROOM */}
      {status === 'waiting' && (
        <div className="mx-auto mt-12 w-full max-w-xl rounded-3xl bg-white p-8 sm:p-10 text-center text-slate-900 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#461A42]/10 text-[#461A42]">
            <Users className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold text-slate-900">
            Boshlovchi o‘yinni boshlashini kuting...
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Siz <span className="font-bold text-[#461A42]">{nickname}</span> nomi bilan kutish xonasidasiz.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 tabular-nums">
              Xonadagi o‘yinchilar ({players.length} nafar)
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {players.map((pl) => (
                <span
                  key={pl.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    pl.id === playerId
                      ? 'bg-[#8854C0] text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {pl.nickname}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE QUESTION & QUESTION RESULT */}
      {(status === 'question' || status === 'question_result') && question && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-bold text-white/90 tabular-nums">
              Savol {question.index + 1} / {question.totalQuestions}
              <span className="mx-2 text-white/40">·</span>
              <span>
                {question.answerMode === 'multiple'
                  ? 'Bir nechta javob tanlash mumkin'
                  : 'Bitta javobni tanlang'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-base font-extrabold text-white tabular-nums">
              <Clock className="h-4 w-4 text-[#F0ABFC]" />
              <span>{status === 'question_result' ? '0 s' : `${timeLeftSec} s`}</span>
            </div>
          </div>

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

          <div className="rounded-3xl bg-white p-6 sm:p-8 text-center text-slate-900 shadow-2xl">
            <h2 className="text-xl sm:text-3xl font-extrabold leading-snug">
              {question.text}
            </h2>
          </div>

          {status === 'question' && submitted && (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-5 py-4 text-center text-sm sm:text-base font-bold text-emerald-100">
              Javobingiz qabul qilindi! Boshqa o‘yinchilar javob berishini kuting...
            </div>
          )}

          {status === 'question_result' && lastResult && (
            <div
              className={`flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-base font-extrabold shadow-lg ${
                lastResult.isCorrect
                  ? 'bg-emerald-500 text-white'
                  : 'bg-red-500 text-white'
              }`}
            >
              {lastResult.isCorrect ? (
                <>
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <span>To‘g‘ri! +{lastResult.earnedPoints} ball qo‘shildi</span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 shrink-0" />
                  <span>Noto‘g‘ri javob (0 ball)</span>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {question.options.map((opt) => {
              const isSelected = selectedIds.includes(opt.id);
              const showResult = status === 'question_result';
              const isCorrect = lastResult?.correctOptionIds.includes(opt.id);

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitted || status !== 'question'}
                  onClick={() => handleOptionClick(opt.id)}
                  style={{ backgroundColor: opt.color }}
                  className={`relative flex min-h-[150px] flex-col justify-between rounded-2xl p-5 text-white shadow-lg transition-all cursor-pointer disabled:cursor-default ${
                    showResult && isCorrect
                      ? 'ring-4 ring-[#22C55E] scale-[1.02]'
                      : showResult && !isCorrect
                      ? 'opacity-45'
                      : isSelected
                      ? 'ring-4 ring-white scale-[1.02]'
                      : 'hover:brightness-105'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">{opt.label}</span>
                    {isSelected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="my-2 text-center text-lg font-bold">
                    {opt.text}
                  </div>
                  <div className="text-center text-xs font-semibold opacity-85">
                    {showResult && isCorrect ? "To'g'ri javob" : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {status === 'question' && question.answerMode === 'multiple' && !submitted && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => submitAnswer(selectedIds)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D946EF] to-[#9333EA] px-8 py-3.5 text-base font-bold text-white shadow-lg hover:from-[#C026D3] hover:to-[#7E22CE] transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>Javobni yuborish</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* LEADERBOARD */}
      {status === 'leaderboard' && (
        <div className="mx-auto mt-8 w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 text-slate-900 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <Trophy className="h-6 w-6 text-[#8854C0]" />
            <h2 className="text-2xl font-extrabold text-slate-900">
              Reyting jadvali
            </h2>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {leaderboard.map((entry) => (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between py-3 px-3 rounded-xl ${
                  entry.playerId === playerId ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 text-sm font-extrabold text-slate-500 tabular-nums">
                    {entry.rank}.
                  </span>
                  <span className="truncate font-bold text-slate-900">
                    {entry.nickname}
                    {entry.playerId === playerId ? ' (Siz)' : ''}
                  </span>
                </div>
                <span className="font-extrabold text-[#461A42] tabular-nums">
                  {entry.score} ball
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm font-semibold text-slate-500">
            Boshlovchi keyingi savolni ochishini kuting...
          </p>
        </div>
      )}
    </main>
  );
}
