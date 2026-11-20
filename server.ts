import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  AnswerOption,
  LeaderboardEntry,
  PlayerInfo,
  PublicQuestionPayload,
  Question,
  Quiz,
  SessionStatus,
  User,
} from './src/types/quiz.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  provider: 'email' | 'google';
  createdAt: string;
}

interface AuthSession {
  token: string;
  userId: string;
  createdAt: number;
}

interface PersistedStore {
  users: StoredUser[];
  quizzes: Quiz[];
  usedSessionCodes: string[];
}

interface PlayerAnswerRecord {
  optionIds: string[];
  isCorrect: boolean;
  earnedPoints: number;
  elapsedMs: number;
}

interface InternalPlayer extends PlayerInfo {
  ws: WebSocket | null;
  answersByQuestionId: Record<string, PlayerAnswerRecord>;
}

interface GameSession {
  code: string;
  hostSecret: string;
  quiz: Quiz;
  status: SessionStatus;
  currentQuestionIndex: number;
  questionStartedAt: number;
  players: Map<string, InternalPlayer>;
  hostWs: WebSocket | null;
  timerHandle: ReturnType<typeof setTimeout> | null;
  createdAt: number;
}

const OPTION_COLORS: Record<'A' | 'B' | 'C' | 'D', '#2D70AE' | '#2D9DA6' | '#EFA929' | '#D5546D'> = {
  A: '#2D70AE',
  B: '#2D9DA6',
  C: '#EFA929',
  D: '#D5546D',
};

function createDefaultQuizzes(): Quiz[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'quiz-uz-history',
      title: "O'zbekiston tarixi va madaniyati",
      description: "Buyuk allomalar, qadimiy shaharlar va muhim tarixiy sanalar bo'yicha bilimlar sinovi",
      ownerId: 'system',
      ownerName: 'ZiyoQuiz',
      isPublic: true,
      createdAt: now,
      updatedAt: now,
      questions: [
        {
          id: 'q-hist-1',
          text: "Amir Temur davlatining poytaxti qaysi shahar bo'lgan?",
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: 'Buxoro', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: 'Samarqand', color: OPTION_COLORS.B, isCorrect: true },
            { id: 'opt-3', label: 'C', text: 'Xiva', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: 'Shahrisabz', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-hist-2',
          text: "\"Aljabr val-muqobala\" asarining muallifi kim?",
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: 'Abu Rayhon Beruniy', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: 'Mirzo Ulug‘bek', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: 'Muhammad al-Xorazmiy', color: OPTION_COLORS.C, isCorrect: true },
            { id: 'opt-4', label: 'D', text: 'Ibn Sino', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-hist-3',
          text: "Alisher Navoiyning \"Xamsa\" asari nechta dostondan iborat?",
          type: 'multiple_choice',
          answerMode: 'single',
          points: 2,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: '3 ta', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: '4 ta', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: '5 ta', color: OPTION_COLORS.C, isCorrect: true },
            { id: 'opt-4', label: 'D', text: '7 ta', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-hist-4',
          text: "Qaysi shaharlar O'zbekistonning qadimiy UNESCO merosi ro'yxatiga kiradi?",
          type: 'multiple_choice',
          answerMode: 'multiple',
          points: 2,
          timeLimitSec: 45,
          options: [
            { id: 'opt-1', label: 'A', text: 'Samarqand', color: OPTION_COLORS.A, isCorrect: true },
            { id: 'opt-2', label: 'B', text: 'Buxoro', color: OPTION_COLORS.B, isCorrect: true },
            { id: 'opt-3', label: 'C', text: 'Ichan-Qal’a (Xiva)', color: OPTION_COLORS.C, isCorrect: true },
            { id: 'opt-4', label: 'D', text: 'Nukus', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-hist-5',
          text: "O'zbekiston Respublikasi Konstitutsiyasi qachon qabul qilingan?",
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: '1991-yil 1-sentabr', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: '1992-yil 8-dekabr', color: OPTION_COLORS.B, isCorrect: true },
            { id: 'opt-3', label: 'C', text: '1991-yil 18-noyabr', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: '1993-yil 2-iyul', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'quiz-math-logic',
      title: 'Matematika va mantiqiy fikrlash',
      description: 'Tezkor hisoblash, geometriya va mantiqiy masalalar to‘plami',
      ownerId: 'system',
      ownerName: 'ZiyoQuiz',
      isPublic: true,
      createdAt: now,
      updatedAt: now,
      questions: [
        {
          id: 'q-math-1',
          text: 'Agar 3x + 7 = 22 bo‘lsa, x ning qiymati nechaga teng?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: '4', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: '5', color: OPTION_COLORS.B, isCorrect: true },
            { id: 'opt-3', label: 'C', text: '6', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: '7', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-math-2',
          text: 'Uchburchakning ichki burchaklari yig‘indisi necha gradusga teng?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 20,
          options: [
            { id: 'opt-1', label: 'A', text: '90°', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: '180°', color: OPTION_COLORS.B, isCorrect: true },
            { id: 'opt-3', label: 'C', text: '270°', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: '360°', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-math-3',
          text: 'Quyidagi sonlardan qaysilari tub sonlar hisoblanadi?',
          type: 'multiple_choice',
          answerMode: 'multiple',
          points: 2,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: '11', color: OPTION_COLORS.A, isCorrect: true },
            { id: 'opt-2', label: 'B', text: '15', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: '17', color: OPTION_COLORS.C, isCorrect: true },
            { id: 'opt-4', label: 'D', text: '21', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-math-4',
          text: 'Kvadratning perimetri 36 sm bo‘lsa, uning yuzasi necha sm² bo‘ladi?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 2,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: '36 sm²', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: '64 sm²', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: '81 sm²', color: OPTION_COLORS.C, isCorrect: true },
            { id: 'opt-4', label: 'D', text: '100 sm²', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'quiz-it-coding',
      title: 'Informatika va dasturlash asoslari',
      description: 'Algoritmlar, veb-texnologiyalar va kompyuter savodxonligi',
      ownerId: 'system',
      ownerName: 'ZiyoQuiz',
      isPublic: true,
      createdAt: now,
      updatedAt: now,
      questions: [
        {
          id: 'q-it-1',
          text: '1 bayt necha bitdan tashkil topgan?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 20,
          options: [
            { id: 'opt-1', label: 'A', text: '4 bit', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: '8 bit', color: OPTION_COLORS.B, isCorrect: true },
            { id: 'opt-3', label: 'C', text: '16 bit', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: '32 bit', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-it-2',
          text: 'HTML qisqartmasi nimani anglatadi?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: 'HyperText Markup Language', color: OPTION_COLORS.A, isCorrect: true },
            { id: 'opt-2', label: 'B', text: 'High Transfer Machine Logic', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: 'Hyperlink Text Management Layer', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: 'Home Tool Markup Language', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-it-3',
          text: 'Quyidagilardan qaysilari dasturlash tillari hisoblanadi?',
          type: 'multiple_choice',
          answerMode: 'multiple',
          points: 2,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: 'Python', color: OPTION_COLORS.A, isCorrect: true },
            { id: 'opt-2', label: 'B', text: 'TypeScript', color: OPTION_COLORS.B, isCorrect: true },
            { id: 'opt-3', label: 'C', text: 'Photoshop', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: 'Go', color: OPTION_COLORS.D, isCorrect: true },
          ],
        },
        {
          id: 'q-it-4',
          text: 'Ikkilik sanoq tizimida (binary) faqat qaysi raqamlar ishlatiladi?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 20,
          options: [
            { id: 'opt-1', label: 'A', text: '0 va 1', color: OPTION_COLORS.A, isCorrect: true },
            { id: 'opt-2', label: 'B', text: '1 va 2', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: '0 dan 7 gacha', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: '0 dan 9 gacha', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
      ],
    },
    {
      id: 'quiz-world-geo',
      title: 'Jahon geografiyasi va tabiat',
      description: 'Qit’alar, okeanlar, poytaxtlar va tabiiy mo‘jizalar',
      ownerId: 'system',
      ownerName: 'ZiyoQuiz',
      isPublic: true,
      createdAt: now,
      updatedAt: now,
      questions: [
        {
          id: 'q-geo-1',
          text: 'Dunyodagi eng katta okean qaysi?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 20,
          options: [
            { id: 'opt-1', label: 'A', text: 'Atlantika okeani', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: 'Hind okeani', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: 'Tinch okeani', color: OPTION_COLORS.C, isCorrect: true },
            { id: 'opt-4', label: 'D', text: 'Shimoliy Muz okeani', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-geo-2',
          text: 'Yaponiyaning poytaxti qaysi shahar?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 20,
          options: [
            { id: 'opt-1', label: 'A', text: 'Kioto', color: OPTION_COLORS.A, isCorrect: false },
            { id: 'opt-2', label: 'B', text: 'Osaka', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: 'Tokio', color: OPTION_COLORS.C, isCorrect: true },
            { id: 'opt-4', label: 'D', text: 'Yokogama', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
        {
          id: 'q-geo-3',
          text: 'Dunyodagi eng baland tog‘ cho‘qqisi qaysi?',
          type: 'multiple_choice',
          answerMode: 'single',
          points: 1,
          timeLimitSec: 30,
          options: [
            { id: 'opt-1', label: 'A', text: 'Everest (Jomolungma)', color: OPTION_COLORS.A, isCorrect: true },
            { id: 'opt-2', label: 'B', text: 'Kilimanjaro', color: OPTION_COLORS.B, isCorrect: false },
            { id: 'opt-3', label: 'C', text: 'Elbrus', color: OPTION_COLORS.C, isCorrect: false },
            { id: 'opt-4', label: 'D', text: 'Monblan', color: OPTION_COLORS.D, isCorrect: false },
          ],
        },
      ],
    },
  ];
}

function loadStore(): PersistedStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: PersistedStore = {
      users: [],
      quizzes: createDefaultQuizzes(),
      usedSessionCodes: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedStore;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      quizzes: Array.isArray(parsed.quizzes) && parsed.quizzes.length > 0 ? parsed.quizzes : createDefaultQuizzes(),
      usedSessionCodes: Array.isArray(parsed.usedSessionCodes) ? parsed.usedSessionCodes : [],
    };
  } catch {
    return {
      users: [],
      quizzes: createDefaultQuizzes(),
      usedSessionCodes: [],
    };
  }
}

const store: PersistedStore = loadStore();
const authSessions = new Map<string, AuthSession>();
const activeGameSessions = new Map<string, GameSession>();

function saveStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const hash = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (hash.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(hash, storedBuf);
}

function generateUnique6DigitCode(): string {
  const usedSet = new Set<string>([
    ...store.usedSessionCodes,
    ...Array.from(activeGameSessions.keys()),
  ]);

  // Maximum possible 6-digit numbers with all distinct digits and non-zero leading digit: 9 * 9 * 8 * 7 * 6 * 5 = 136,080
  if (usedSet.size >= 130000) {
    store.usedSessionCodes = Array.from(activeGameSessions.keys());
  }

  for (let attempt = 0; attempt < 1000; attempt++) {
    const firstDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const firstIdx = crypto.randomInt(0, firstDigits.length);
    const first = firstDigits[firstIdx];

    const remaining = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].filter((d) => d !== first);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const tmp = remaining[i];
      remaining[i] = remaining[j];
      remaining[j] = tmp;
    }

    const code = first + remaining.slice(0, 5).join('');
    if (!usedSet.has(code) && !activeGameSessions.has(code)) {
      store.usedSessionCodes.push(code);
      saveStore();
      return code;
    }
  }

  throw new Error('Unikal ID yaratib bo‘lmadi');
}

function getAuthUser(req: express.Request): User | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const authSession = authSessions.get(token);
  if (!authSession) return null;
  const user = store.users.find((u) => u.id === authSession.userId);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
  };
}

function getOwnerId(req: express.Request): string {
  const user = getAuthUser(req);
  if (user) return user.id;
  const guestHeader = req.headers['x-guest-id'];
  if (typeof guestHeader === 'string' && guestHeader.trim().length > 0) {
    return `guest:${guestHeader.trim()}`;
  }
  return 'guest:anonymous';
}

function sendWs(ws: WebSocket | null, event: string, payload: unknown) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: event, payload }));
}

function serializePlayers(session: GameSession): PlayerInfo[] {
  return Array.from(session.players.values()).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    score: p.score,
    correctCount: p.correctCount,
    totalTimeMs: p.totalTimeMs,
    connected: p.connected,
    lastEarnedPoints: p.lastEarnedPoints,
    lastWasCorrect: p.lastWasCorrect,
  }));
}

function computeLeaderboard(session: GameSession): LeaderboardEntry[] {
  const sorted = Array.from(session.players.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.totalTimeMs - b.totalTimeMs;
  });

  return sorted.map((p, idx) => ({
    rank: idx + 1,
    playerId: p.id,
    nickname: p.nickname,
    score: p.score,
    correctCount: p.correctCount,
    lastEarnedPoints: p.lastEarnedPoints,
    lastWasCorrect: p.lastWasCorrect,
  }));
}

function buildPublicQuestion(session: GameSession): PublicQuestionPayload | null {
  const q = session.quiz.questions[session.currentQuestionIndex];
  if (!q) return null;
  return {
    index: session.currentQuestionIndex,
    totalQuestions: session.quiz.questions.length,
    id: q.id,
    text: q.text,
    answerMode: q.answerMode,
    points: q.points,
    timeLimitSec: q.timeLimitSec,
    startedAt: session.questionStartedAt,
    serverNow: Date.now(),
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      text: o.text,
      color: o.color,
    })),
  };
}

function broadcastToPlayers(session: GameSession, event: string, payload: unknown) {
  for (const player of session.players.values()) {
    sendWs(player.ws, event, payload);
  }
}

function broadcastRoomPlayers(session: GameSession) {
  const players = serializePlayers(session);
  sendWs(session.hostWs, 'room:players', { players });
  broadcastToPlayers(session, 'room:players', { players });
}

function endCurrentQuestion(session: GameSession) {
  if (session.status !== 'question') return;
  if (session.timerHandle) {
    clearTimeout(session.timerHandle);
    session.timerHandle = null;
  }

  const question = session.quiz.questions[session.currentQuestionIndex];
  if (!question) return;

  session.status = 'question_result';
  const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
  const optionCounts: Record<string, number> = {};
  for (const opt of question.options) {
    optionCounts[opt.id] = 0;
  }

  for (const player of session.players.values()) {
    const rec = player.answersByQuestionId[question.id];
    if (rec) {
      for (const oid of rec.optionIds) {
        if (optionCounts[oid] !== undefined) {
          optionCounts[oid] += 1;
        }
      }
      sendWs(player.ws, 'game:question_result', {
        questionId: question.id,
        correctOptionIds,
        isCorrect: rec.isCorrect,
        earnedPoints: rec.earnedPoints,
        totalScore: player.score,
        selectedOptionIds: rec.optionIds,
      });
    } else {
      player.lastEarnedPoints = 0;
      player.lastWasCorrect = false;
      sendWs(player.ws, 'game:question_result', {
        questionId: question.id,
        correctOptionIds,
        isCorrect: false,
        earnedPoints: 0,
        totalScore: player.score,
        selectedOptionIds: [],
      });
    }
  }

  sendWs(session.hostWs, 'game:question_result', {
    questionId: question.id,
    correctOptionIds,
    optionCounts,
    answeredCount: Array.from(session.players.values()).filter(
      (p) => Boolean(p.answersByQuestionId[question.id])
    ).length,
    totalPlayers: session.players.size,
  });
}

function startQuestionAtIndex(session: GameSession, index: number) {
  if (session.timerHandle) {
    clearTimeout(session.timerHandle);
    session.timerHandle = null;
  }

  if (index >= session.quiz.questions.length) {
    session.status = 'finished';
    const leaderboard = computeLeaderboard(session);
    sendWs(session.hostWs, 'game:podium', { leaderboard });
    broadcastToPlayers(session, 'game:podium', { leaderboard });
    return;
  }

  session.currentQuestionIndex = index;
  session.status = 'question';
  session.questionStartedAt = Date.now();

  for (const p of session.players.values()) {
    p.lastEarnedPoints = 0;
    p.lastWasCorrect = null;
  }

  const question = session.quiz.questions[index];
  const publicPayload = buildPublicQuestion(session);
  if (!publicPayload) return;

  sendWs(session.hostWs, 'game:question', {
    question: publicPayload,
    correctOptionIds: question.options.filter((o) => o.isCorrect).map((o) => o.id),
    totalPlayers: session.players.size,
  });
  broadcastToPlayers(session, 'game:question', {
    question: publicPayload,
  });

  session.timerHandle = setTimeout(() => {
    endCurrentQuestion(session);
  }, question.timeLimitSec * 1000 + 300);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Auth endpoints
  app.post('/api/auth/register', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || !email || !password) {
      res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
      return;
    }
    if (!email.includes('@')) {
      res.status(400).json({ error: "To'g'ri Gmail manzilini kiriting" });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: "Parol kamida 4 ta belgidan iborat bo'lishi kerak" });
      return;
    }

    const existing = store.users.find((u) => u.email === email);
    if (existing) {
      res.status(409).json({ error: "Bu Gmail manzili bilan akkaunt allaqachon mavjud" });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const newUser: StoredUser = {
      id: `user-${crypto.randomUUID()}`,
      name,
      email,
      passwordHash,
      salt,
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    store.users.push(newUser);
    saveStore();

    const token = crypto.randomBytes(32).toString('hex');
    authSessions.set(token, { token, userId: newUser.id, createdAt: Date.now() });

    res.json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        provider: newUser.provider,
      },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(401).json({ error: 'Topilmadi' });
      return;
    }

    const user = store.users.find((u) => u.email === email);
    if (!user) {
      res.status(401).json({ error: 'Topilmadi' });
      return;
    }

    const valid = verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Topilmadi' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    authSessions.set(token, { token, userId: user.id, createdAt: Date.now() });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      },
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ user: null });
      return;
    }
    res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      authSessions.delete(header.slice(7).trim());
    }
    res.json({ ok: true });
  });

  // Quiz endpoints
  app.get('/api/quizzes/public', (_req, res) => {
    const publicQuizzes = store.quizzes.filter((q) => q.isPublic);
    res.json({ quizzes: publicQuizzes });
  });

  app.get('/api/quizzes/mine', (req, res) => {
    const ownerId = getOwnerId(req);
    const mine = store.quizzes.filter((q) => q.ownerId === ownerId);
    res.json({ quizzes: mine });
  });

  app.get('/api/quizzes/:id', (req, res) => {
    const quiz = store.quizzes.find((q) => q.id === req.params.id);
    if (!quiz) {
      res.status(404).json({ error: 'Topilmadi' });
      return;
    }
    res.json({ quiz });
  });

  app.post('/api/quizzes', (req, res) => {
    const user = getAuthUser(req);
    const ownerId = getOwnerId(req);
    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim()
      : 'Yangi viktorina';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const isPublic = Boolean(req.body?.isPublic);
    const questions = Array.isArray(req.body?.questions) ? (req.body.questions as Question[]) : [];

    if (questions.length === 0) {
      res.status(400).json({ error: "Viktorinada kamida 1 ta savol bo'lishi kerak" });
      return;
    }

    const now = new Date().toISOString();
    const quiz: Quiz = {
      id: `quiz-${crypto.randomUUID().slice(0, 8)}`,
      title,
      description,
      ownerId,
      ownerName: user ? user.name : 'Mehmon muallif',
      isPublic,
      questions,
      createdAt: now,
      updatedAt: now,
    };

    store.quizzes.unshift(quiz);
    saveStore();
    res.status(201).json({ quiz });
  });

  app.put('/api/quizzes/:id', (req, res) => {
    const ownerId = getOwnerId(req);
    const idx = store.quizzes.findIndex((q) => q.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Topilmadi' });
      return;
    }
    const existing = store.quizzes[idx];
    if (existing.ownerId !== ownerId && existing.ownerId !== 'system') {
      res.status(403).json({ error: 'Ruxsat berilmagan' });
      return;
    }

    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim()
      : existing.title;
    const description = typeof req.body?.description === 'string'
      ? req.body.description.trim()
      : existing.description;
    const isPublic = typeof req.body?.isPublic === 'boolean' ? req.body.isPublic : existing.isPublic;
    const questions = Array.isArray(req.body?.questions) ? (req.body.questions as Question[]) : existing.questions;

    const updated: Quiz = {
      ...existing,
      title,
      description,
      isPublic,
      questions,
      updatedAt: new Date().toISOString(),
    };
    store.quizzes[idx] = updated;
    saveStore();
    res.json({ quiz: updated });
  });

  app.delete('/api/quizzes/:id', (req, res) => {
    const ownerId = getOwnerId(req);
    const idx = store.quizzes.findIndex((q) => q.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Topilmadi' });
      return;
    }
    if (store.quizzes[idx].ownerId !== ownerId) {
      res.status(403).json({ error: 'Ruxsat berilmagan' });
      return;
    }
    store.quizzes.splice(idx, 1);
    saveStore();
    res.json({ ok: true });
  });

  // Live session endpoints
  app.post('/api/sessions', (req, res) => {
    const quizId = typeof req.body?.quizId === 'string' ? req.body.quizId : '';
    const quiz = store.quizzes.find((q) => q.id === quizId);
    if (!quiz) {
      res.status(404).json({ error: 'Viktorina topilmadi' });
      return;
    }
    if (!quiz.questions || quiz.questions.length === 0) {
      res.status(400).json({ error: "Viktorinada savollar mavjud emas" });
      return;
    }

    const code = generateUnique6DigitCode();
    const hostSecret = crypto.randomBytes(16).toString('hex');

    const session: GameSession = {
      code,
      hostSecret,
      quiz: JSON.parse(JSON.stringify(quiz)) as Quiz,
      status: 'waiting',
      currentQuestionIndex: 0,
      questionStartedAt: 0,
      players: new Map(),
      hostWs: null,
      timerHandle: null,
      createdAt: Date.now(),
    };

    activeGameSessions.set(code, session);

    res.status(201).json({
      code,
      hostSecret,
      quizTitle: quiz.title,
      totalQuestions: quiz.questions.length,
    });
  });

  app.post('/api/sessions/verify', (req, res) => {
    const rawCode = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!/^\d{6}$/.test(rawCode)) {
      res.status(404).json({ error: "Topilmadi! Bunday ID mavjud emas yoki faol emas." });
      return;
    }

    const session = activeGameSessions.get(rawCode);
    if (!session || session.status === 'finished') {
      res.status(404).json({ error: "Topilmadi! Bunday ID mavjud emas yoki faol emas." });
      return;
    }

    res.json({
      valid: true,
      session: {
        code: session.code,
        quizId: session.quiz.id,
        quizTitle: session.quiz.title,
        totalQuestions: session.quiz.questions.length,
        status: session.status,
        playerCount: session.players.size,
      },
    });
  });

  app.get('/api/sessions/:code', (req, res) => {
    const session = activeGameSessions.get(req.params.code);
    if (!session || session.status === 'finished') {
      res.status(404).json({ error: "Topilmadi! Bunday ID mavjud emas yoki faol emas." });
      return;
    }
    res.json({
      code: session.code,
      quizTitle: session.quiz.title,
      totalQuestions: session.quiz.questions.length,
      status: session.status,
      playerCount: session.players.size,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let attachedCode: string | null = null;
    let attachedRole: 'host' | 'player' | null = null;
    let attachedPlayerId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; payload?: Record<string, unknown> };
        const payload = msg.payload || {};

        if (msg.type === 'host:join') {
          const code = String(payload.code || '');
          const hostSecret = String(payload.hostSecret || '');
          const session = activeGameSessions.get(code);
          if (!session || session.hostSecret !== hostSecret) {
            sendWs(ws, 'error', { message: "Sessiya topilmadi yoki ruxsat yo'q" });
            return;
          }
          attachedCode = code;
          attachedRole = 'host';
          session.hostWs = ws;

          const currentQ = buildPublicQuestion(session);
          const rawQ = session.quiz.questions[session.currentQuestionIndex];
          sendWs(ws, 'host:state', {
            code: session.code,
            quizTitle: session.quiz.title,
            totalQuestions: session.quiz.questions.length,
            status: session.status,
            players: serializePlayers(session),
            question: currentQ,
            correctOptionIds: rawQ ? rawQ.options.filter((o) => o.isCorrect).map((o) => o.id) : [],
            leaderboard: computeLeaderboard(session),
          });
          return;
        }

        if (msg.type === 'player:join') {
          const code = String(payload.code || '').trim();
          const nickname = String(payload.nickname || '').trim().slice(0, 28);
          const requestedPlayerId = payload.playerId ? String(payload.playerId) : '';

          const session = activeGameSessions.get(code);
          if (!session || session.status === 'finished') {
            sendWs(ws, 'error', { message: "Topilmadi! Bunday ID mavjud emas yoki faol emas." });
            return;
          }
          if (!nickname) {
            sendWs(ws, 'error', { message: "Nickname kiritilishi shart" });
            return;
          }

          let player: InternalPlayer | undefined;
          if (requestedPlayerId && session.players.has(requestedPlayerId)) {
            player = session.players.get(requestedPlayerId);
          }
          if (!player) {
            const newPlayerId = requestedPlayerId || `pl-${crypto.randomUUID().slice(0, 8)}`;
            player = {
              id: newPlayerId,
              nickname,
              score: 0,
              correctCount: 0,
              totalTimeMs: 0,
              connected: true,
              lastEarnedPoints: 0,
              lastWasCorrect: null,
              ws,
              answersByQuestionId: {},
            };
            session.players.set(newPlayerId, player);
          } else {
            player.ws = ws;
            player.connected = true;
            player.nickname = nickname;
          }

          attachedCode = code;
          attachedRole = 'player';
          attachedPlayerId = player.id;

          const currentQ = buildPublicQuestion(session);
          const hasAnsweredCurrent = currentQ ? Boolean(player.answersByQuestionId[currentQ.id]) : false;

          sendWs(ws, 'player:state', {
            playerId: player.id,
            nickname: player.nickname,
            code: session.code,
            quizTitle: session.quiz.title,
            totalQuestions: session.quiz.questions.length,
            status: session.status,
            score: player.score,
            players: serializePlayers(session),
            question: session.status === 'question' ? currentQ : null,
            hasAnsweredCurrent,
            leaderboard:
              session.status === 'leaderboard'
                ? computeLeaderboard(session)
                : [],
          });

          broadcastRoomPlayers(session);
          return;
        }

        if (msg.type === 'host:start') {
          const code = String(payload.code || '');
          const hostSecret = String(payload.hostSecret || '');
          const session = activeGameSessions.get(code);
          if (!session || session.hostSecret !== hostSecret) return;
          if (session.status !== 'waiting') return;
          startQuestionAtIndex(session, 0);
          return;
        }

        if (msg.type === 'player:answer') {
          const code = String(payload.code || '');
          const playerId = String(payload.playerId || '');
          const questionId = String(payload.questionId || '');
          const optionIds = Array.isArray(payload.optionIds)
            ? payload.optionIds.map((x) => String(x))
            : [];

          const session = activeGameSessions.get(code);
          if (!session || session.status !== 'question') return;
          const player = session.players.get(playerId);
          if (!player) return;

          const question = session.quiz.questions[session.currentQuestionIndex];
          if (!question || question.id !== questionId) return;
          if (player.answersByQuestionId[question.id]) return;

          const elapsedMs = Math.max(0, Date.now() - session.questionStartedAt);
          const totalMs = question.timeLimitSec * 1000;
          if (elapsedMs > totalMs + 1000) return;

          const correctSet = new Set(question.options.filter((o: AnswerOption) => o.isCorrect).map((o) => o.id));
          const chosenSet = new Set(optionIds);

          const isCorrect =
            chosenSet.size > 0 &&
            chosenSet.size === correctSet.size &&
            Array.from(chosenSet).every((id) => correctSet.has(id));

          let earnedPoints = 0;
          if (isCorrect) {
            const timeRatio = Math.max(0, Math.min(1, 1 - elapsedMs / totalMs));
            earnedPoints = Math.round(question.points * 1000 * (0.5 + 0.5 * timeRatio));
            player.score += earnedPoints;
            player.correctCount += 1;
          }
          player.totalTimeMs += elapsedMs;
          player.lastEarnedPoints = earnedPoints;
          player.lastWasCorrect = isCorrect;

          player.answersByQuestionId[question.id] = {
            optionIds: Array.from(chosenSet),
            isCorrect,
            earnedPoints,
            elapsedMs,
          };

          sendWs(player.ws, 'player:answer_ack', {
            questionId: question.id,
            selectedOptionIds: Array.from(chosenSet),
          });

          const answeredCount = Array.from(session.players.values()).filter(
            (p) => Boolean(p.answersByQuestionId[question.id])
          ).length;
          const totalPlayers = session.players.size;

          sendWs(session.hostWs, 'host:answer_progress', {
            answeredCount,
            totalPlayers,
          });

          if (totalPlayers > 0 && answeredCount >= totalPlayers) {
            endCurrentQuestion(session);
          }
          return;
        }

        if (msg.type === 'host:end_question') {
          const code = String(payload.code || '');
          const hostSecret = String(payload.hostSecret || '');
          const session = activeGameSessions.get(code);
          if (!session || session.hostSecret !== hostSecret) return;
          endCurrentQuestion(session);
          return;
        }

        if (msg.type === 'host:show_leaderboard') {
          const code = String(payload.code || '');
          const hostSecret = String(payload.hostSecret || '');
          const session = activeGameSessions.get(code);
          if (!session || session.hostSecret !== hostSecret) return;
          if (session.status === 'question') {
            endCurrentQuestion(session);
          }
          session.status = 'leaderboard';
          const leaderboard = computeLeaderboard(session);
          sendWs(session.hostWs, 'game:leaderboard', {
            leaderboard,
            isLastQuestion: session.currentQuestionIndex >= session.quiz.questions.length - 1,
          });
          broadcastToPlayers(session, 'game:leaderboard', {
            leaderboard,
            isLastQuestion: session.currentQuestionIndex >= session.quiz.questions.length - 1,
          });
          return;
        }

        if (msg.type === 'host:next_question') {
          const code = String(payload.code || '');
          const hostSecret = String(payload.hostSecret || '');
          const session = activeGameSessions.get(code);
          if (!session || session.hostSecret !== hostSecret) return;
          startQuestionAtIndex(session, session.currentQuestionIndex + 1);
          return;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (!attachedCode) return;
      const session = activeGameSessions.get(attachedCode);
      if (!session) return;
      if (attachedRole === 'host' && session.hostWs === ws) {
        session.hostWs = null;
      } else if (attachedRole === 'player' && attachedPlayerId) {
        const player = session.players.get(attachedPlayerId);
        if (player && player.ws === ws) {
          player.connected = false;
          player.ws = null;
          broadcastRoomPlayers(session);
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ZiyoQuiz server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
