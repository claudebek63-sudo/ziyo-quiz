import { AlertCircle, ArrowLeft, Check, CheckCircle2, Flag, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { apiCreateQuiz, apiUpdateQuiz } from '../lib/api';
import type { AnswerOption, Question, Quiz } from '../types/quiz';

interface QuizEditorViewProps {
  initialQuiz: Quiz | null;
  onBack: () => void;
  onSaved: (quiz: Quiz) => void;
}

const OPTION_TEMPLATES: Array<{ label: 'A' | 'B' | 'C' | 'D'; color: '#2D70AE' | '#2D9DA6' | '#EFA929' | '#D5546D' }> = [
  { label: 'A', color: '#2D70AE' },
  { label: 'B', color: '#2D9DA6' },
  { label: 'C', color: '#EFA929' },
  { label: 'D', color: '#D5546D' },
];

function createEmptyQuestion(index: number): Question {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    text: '',
    type: 'multiple_choice',
    answerMode: 'single',
    points: 1,
    timeLimitSec: 30,
    options: OPTION_TEMPLATES.map((tpl, idx) => ({
      id: `opt-${tpl.label}-${Date.now()}-${idx}`,
      label: tpl.label,
      text: '',
      color: tpl.color,
      isCorrect: idx === 0,
    })),
  };
}

export function QuizEditorView({ initialQuiz, onBack, onSaved }: QuizEditorViewProps) {
  const [quizId, setQuizId] = useState<string | null>(initialQuiz?.id || null);
  const [title, setTitle] = useState<string>(initialQuiz?.title || 'Yangi viktorina');
  const [isPublic, setIsPublic] = useState<boolean>(initialQuiz?.isPublic ?? false);
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialQuiz && initialQuiz.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialQuiz.questions)) as Question[];
    }
    return [createEmptyQuestion(0)];
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentQuestion = questions[activeIndex] || questions[0];

  const updateCurrentQuestion = (updater: (q: Question) => Question) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeIndex ? updater(q) : q))
    );
    if (statusMsg) setStatusMsg(null);
  };

  const handleOptionTextChange = (optId: string, text: string) => {
    updateCurrentQuestion((q) => ({
      ...q,
      options: q.options.map((o) => (o.id === optId ? { ...o, text } : o)),
    }));
  };

  const handleToggleCorrect = (optId: string) => {
    updateCurrentQuestion((q) => {
      if (q.answerMode === 'single') {
        return {
          ...q,
          options: q.options.map((o) => ({
            ...o,
            isCorrect: o.id === optId,
          })),
        };
      }
      return {
        ...q,
        options: q.options.map((o) =>
          o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o
        ),
      };
    });
  };

  const handleClearOption = (optId: string) => {
    updateCurrentQuestion((q) => ({
      ...q,
      options: q.options.map((o) =>
        o.id === optId ? { ...o, text: '', isCorrect: false } : o
      ),
    }));
  };

  const handleSwitchAnswerMode = (mode: 'single' | 'multiple') => {
    updateCurrentQuestion((q) => {
      if (mode === 'single') {
        const firstCorrect = q.options.find((o) => o.isCorrect) || q.options[0];
        return {
          ...q,
          answerMode: 'single',
          options: q.options.map((o) => ({
            ...o,
            isCorrect: o.id === firstCorrect.id,
          })),
        };
      }
      return {
        ...q,
        answerMode: 'multiple',
      };
    });
  };

  const handleAddQuestion = () => {
    const nextQ = createEmptyQuestion(questions.length);
    setQuestions((prev) => [...prev, nextQ]);
    setActiveIndex(questions.length);
    setStatusMsg(null);
  };

  const handleDeleteQuestion = (idxToDelete: number) => {
    if (questions.length <= 1) {
      setStatusMsg({ type: 'error', text: "Viktorinada kamida 1 ta savol bo'lishi kerak" });
      return;
    }
    const next = questions.filter((_, idx) => idx !== idxToDelete);
    setQuestions(next);
    setActiveIndex((prev) => Math.min(prev, next.length - 1));
  };

  const handleSaveQuiz = async () => {
    setStatusMsg(null);

    if (!title.trim()) {
      setStatusMsg({ type: 'error', text: 'Viktorina nomini kiriting' });
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setActiveIndex(i);
        setStatusMsg({ type: 'error', text: `${i + 1}-savol matnini kiriting` });
        return;
      }
      const filledOptions = q.options.filter((o) => o.text.trim().length > 0);
      if (filledOptions.length < 2) {
        setActiveIndex(i);
        setStatusMsg({ type: 'error', text: `${i + 1}-savolda kamida 2 ta javob varianti yozing` });
        return;
      }
      const hasCorrect = q.options.some((o) => o.isCorrect && o.text.trim().length > 0);
      if (!hasCorrect) {
        setActiveIndex(i);
        setStatusMsg({
          type: 'error',
          text: `${i + 1}-savolda kamida 1 ta to'ldirilgan to'g'ri javobni belgilang`,
        });
        return;
      }
    }

    const sanitizedQuestions: Question[] = questions.map((q) => ({
      ...q,
      text: q.text.trim(),
      options: q.options.map((o) => ({
        ...o,
        text: o.text.trim() || `${o.label} varianti`,
      })),
    }));

    setSaving(true);
    try {
      const result = quizId
        ? await apiUpdateQuiz(quizId, {
            title: title.trim(),
            isPublic,
            questions: sanitizedQuestions,
          })
        : await apiCreateQuiz({
            title: title.trim(),
            isPublic,
            questions: sanitizedQuestions,
          });

      if (result.error || !result.quiz) {
        setStatusMsg({ type: 'error', text: result.error || 'Saqlashda xatolik yuz berdi' });
        return;
      }

      setQuizId(result.quiz.id);
      setStatusMsg({ type: 'success', text: 'Viktorina va savollar muvaffaqiyatli saqlandi!' });
      onSaved(result.quiz);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#461A42] text-white flex flex-col">
      {/* Top Editor Bar */}
      <header className="border-b border-white/15 bg-[#351132] px-4 sm:px-6 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Ortga</span>
            </button>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Viktorina nomi"
              aria-label="Viktorina nomi"
              className="w-48 sm:w-64 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-bold text-white placeholder:text-white/50 focus:border-[#D946EF] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Savol turi */}
            <select
              value={currentQuestion.type}
              onChange={(e) =>
                updateCurrentQuestion((q) => ({
                  ...q,
                  type: e.target.value as 'multiple_choice',
                }))
              }
              aria-label="Savol turi"
              className="rounded-xl border border-white/20 bg-[#461A42] px-3 py-2 text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="multiple_choice">Ko‘p tanlovli</option>
            </select>

            {/* Ball tanlovi */}
            <select
              value={currentQuestion.points}
              onChange={(e) =>
                updateCurrentQuestion((q) => ({
                  ...q,
                  points: Number(e.target.value),
                }))
              }
              aria-label="Ball tanlovi"
              className="rounded-xl border border-white/20 bg-[#461A42] px-3 py-2 text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value={1}>1 ball</option>
              <option value={2}>2 ball</option>
              <option value={3}>3 ball</option>
              <option value={5}>5 ball</option>
              <option value={10}>10 ball</option>
            </select>

            {/* Vaqt tanlovi */}
            <select
              value={currentQuestion.timeLimitSec}
              onChange={(e) =>
                updateCurrentQuestion((q) => ({
                  ...q,
                  timeLimitSec: Number(e.target.value),
                }))
              }
              aria-label="Vaqt tanlovi"
              className="rounded-xl border border-white/20 bg-[#461A42] px-3 py-2 text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value={15}>15 soniya</option>
              <option value={20}>20 soniya</option>
              <option value={30}>30 soniya</option>
              <option value={45}>45 soniya</option>
              <option value={60}>60 soniya</option>
              <option value={90}>90 soniya</option>
            </select>

            {/* Savolni saqlash */}
            <button
              type="button"
              onClick={handleSaveQuiz}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8854C0] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#9C6ADE] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saqlanmoqda...' : 'Savolni saqlash'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Question Tabs Strip */}
      <div className="border-b border-white/10 bg-[#3B1538] px-4 sm:px-6 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    idx === activeIndex
                      ? 'bg-white text-[#461A42]'
                      : 'bg-white/10 text-white/85 hover:bg-white/20'
                  }`}
                >
                  {idx + 1}-savol
                </button>
                {questions.length > 1 && idx === activeIndex && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(idx)}
                    title="Ushbu savolni o'chirish"
                    className="ml-1 rounded-lg p-1.5 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/35 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yangi savol qo‘shish</span>
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-white/85 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded accent-[#D946EF]"
            />
            <span>Bosh sahifada hammaga ko‘rsatish</span>
          </label>
        </div>
      </div>

      {/* Main Editor Canvas (#461A42) */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-4 sm:px-6 py-6">
        {statusMsg && (
          <div
            role="status"
            className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                : 'bg-red-500/20 border border-red-400/40 text-red-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Central White Question Input */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{activeIndex + 1}-savol matni</span>
            <span className="tabular-nums">
              {currentQuestion.points} ball · {currentQuestion.timeLimitSec} soniya
            </span>
          </div>
          <textarea
            rows={3}
            value={currentQuestion.text}
            onChange={(e) =>
              updateCurrentQuestion((q) => ({ ...q, text: e.target.value }))
            }
            placeholder="Savol matnini shu yerga yozing..."
            className="w-full resize-none bg-transparent text-center text-xl sm:text-2xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* 4 Colored Answer Cards Side-by-Side (A, B, C, D) */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {currentQuestion.options.map((opt: AnswerOption) => (
            <div
              key={opt.id}
              style={{ backgroundColor: opt.color }}
              className={`relative flex min-h-[210px] flex-col justify-between rounded-2xl p-4 text-white shadow-lg transition-all ${
                opt.isCorrect ? 'ring-4 ring-[#22C55E] shadow-emerald-500/30' : ''
              }`}
            >
              {/* Card Top Controls: Trash (left) & Correct Flag/Check (right) */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleClearOption(opt.id)}
                  title="Javob matnini tozalash"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/20 text-white/85 hover:bg-black/35 hover:text-white transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <span className="text-xs font-extrabold tracking-wider opacity-85">
                  {opt.label}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleCorrect(opt.id)}
                  title={opt.isCorrect ? "To'g'ri javob sifatida belgilangan" : "To'g'ri javob qilib belgilash"}
                  aria-pressed={opt.isCorrect}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                    opt.isCorrect
                      ? 'bg-[#22C55E] text-white shadow-md scale-105 ring-2 ring-white'
                      : 'bg-black/20 text-white/80 hover:bg-black/35 hover:text-white'
                  }`}
                >
                  {opt.isCorrect ? (
                    <Check className="h-5 w-5 stroke-[3]" />
                  ) : (
                    <Flag className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Center Answer Textarea */}
              <textarea
                rows={4}
                value={opt.text}
                onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                placeholder={`${opt.label} javobini yozing...`}
                className="my-2 w-full flex-1 resize-none bg-transparent text-center text-base sm:text-lg font-bold text-white placeholder:text-white/65 focus:outline-none flex items-center justify-center"
              />

              <div className="text-center text-[11px] font-semibold text-white/85">
                {opt.isCorrect ? "To'g'ri javob" : 'Variant'}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Single vs Multiple Correct Answer Toggle */}
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex items-center rounded-xl bg-[#351132] p-1.5 border border-white/15">
            <button
              type="button"
              onClick={() => handleSwitchAnswerMode('single')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                currentQuestion.answerMode === 'single'
                  ? 'bg-[#8854C0] text-white shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              Bitta to‘g‘ri javob
            </button>
            <button
              type="button"
              onClick={() => handleSwitchAnswerMode('multiple')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                currentQuestion.answerMode === 'multiple'
                  ? 'bg-[#8854C0] text-white shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              Bir nechta to‘g‘ri javob
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
