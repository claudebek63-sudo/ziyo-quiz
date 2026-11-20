export interface User {
  id: string;
  name: string;
  email: string;
  provider?: 'email' | 'google';
}

export interface AnswerOption {
  id: string;
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  color: '#2D70AE' | '#2D9DA6' | '#EFA929' | '#D5546D';
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple_choice';
  answerMode: 'single' | 'multiple';
  points: number;
  timeLimitSec: number;
  options: AnswerOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  isPublic: boolean;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'waiting' | 'question' | 'question_result' | 'leaderboard' | 'finished';

export interface PlayerInfo {
  id: string;
  nickname: string;
  score: number;
  correctCount: number;
  totalTimeMs: number;
  connected: boolean;
  lastEarnedPoints: number;
  lastWasCorrect: boolean | null;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  correctCount: number;
  lastEarnedPoints: number;
  lastWasCorrect: boolean | null;
}

export interface PublicQuestionPayload {
  index: number;
  totalQuestions: number;
  id: string;
  text: string;
  answerMode: 'single' | 'multiple';
  points: number;
  timeLimitSec: number;
  startedAt: number;
  serverNow: number;
  options: Array<{
    id: string;
    label: 'A' | 'B' | 'C' | 'D';
    text: string;
    color: '#2D70AE' | '#2D9DA6' | '#EFA929' | '#D5546D';
  }>;
}

export interface SessionSummary {
  code: string;
  quizId: string;
  quizTitle: string;
  totalQuestions: number;
  status: SessionStatus;
  playerCount: number;
}
