import type { Quiz, SessionSummary, User } from '../types/quiz';

const TOKEN_KEY = 'ziyoquiz_auth_token';
const GUEST_KEY = 'ziyoquiz_guest_id';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getGuestId(): string {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Guest-Id': getGuestId(),
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetchMe(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', { headers: buildHeaders() });
    if (!res.ok) {
      setAuthToken(null);
      return null;
    }
    const data = (await res.json()) as { user: User | null };
    return data.user;
  } catch {
    return null;
  }
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { token?: string; user?: User; error?: string };
  if (!res.ok || !data.user || !data.token) {
    return { error: data.error || 'Topilmadi' };
  }
  setAuthToken(data.token);
  return { user: data.user };
}

export async function apiRegister(
  name: string,
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = (await res.json()) as { token?: string; user?: User; error?: string };
  if (!res.ok || !data.user || !data.token) {
    return { error: data.error || "Ro'yxatdan o'tishda xatolik" };
  }
  setAuthToken(data.token);
  return { user: data.user };
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: buildHeaders() });
  } finally {
    setAuthToken(null);
  }
}

export async function apiGetPublicQuizzes(): Promise<Quiz[]> {
  const res = await fetch('/api/quizzes/public', { headers: buildHeaders() });
  if (!res.ok) return [];
  const data = (await res.json()) as { quizzes: Quiz[] };
  return data.quizzes || [];
}

export async function apiGetMyQuizzes(): Promise<Quiz[]> {
  const res = await fetch('/api/quizzes/mine', { headers: buildHeaders() });
  if (!res.ok) return [];
  const data = (await res.json()) as { quizzes: Quiz[] };
  return data.quizzes || [];
}

export async function apiCreateQuiz(payload: {
  title: string;
  description?: string;
  isPublic?: boolean;
  questions: Quiz['questions'];
}): Promise<{ quiz?: Quiz; error?: string }> {
  const res = await fetch('/api/quizzes', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { quiz?: Quiz; error?: string };
  if (!res.ok || !data.quiz) {
    return { error: data.error || 'Saqlashda xatolik' };
  }
  return { quiz: data.quiz };
}

export async function apiUpdateQuiz(
  id: string,
  payload: {
    title: string;
    description?: string;
    isPublic?: boolean;
    questions: Quiz['questions'];
  }
): Promise<{ quiz?: Quiz; error?: string }> {
  const res = await fetch(`/api/quizzes/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { quiz?: Quiz; error?: string };
  if (!res.ok || !data.quiz) {
    return { error: data.error || 'Yangilashda xatolik' };
  }
  return { quiz: data.quiz };
}

export async function apiDeleteQuiz(id: string): Promise<boolean> {
  const res = await fetch(`/api/quizzes/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  return res.ok;
}

export async function apiStartLiveSession(quizId: string): Promise<{
  code?: string;
  hostSecret?: string;
  quizTitle?: string;
  totalQuestions?: number;
  error?: string;
}> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ quizId }),
  });
  const data = (await res.json()) as {
    code?: string;
    hostSecret?: string;
    quizTitle?: string;
    totalQuestions?: number;
    error?: string;
  };
  if (!res.ok || !data.code) {
    return { error: data.error || 'Sessiya yaratishda xatolik' };
  }
  return data;
}

export async function apiVerifySessionCode(code: string): Promise<{
  valid: boolean;
  session?: SessionSummary;
  error?: string;
}> {
  const res = await fetch('/api/sessions/verify', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ code }),
  });
  const data = (await res.json()) as {
    valid?: boolean;
    session?: SessionSummary;
    error?: string;
  };
  if (!res.ok || !data.valid || !data.session) {
    return {
      valid: false,
      error: data.error || "Topilmadi! Bunday ID mavjud emas yoki faol emas.",
    };
  }
  return { valid: true, session: data.session };
}

export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
