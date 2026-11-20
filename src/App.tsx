import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { GeometricBackdrop } from './components/GeometricBackdrop';
import { HomeView } from './components/HomeView';
import { HostGameView } from './components/HostGameView';
import { JoinNicknameView } from './components/JoinNicknameView';
import { Navbar } from './components/Navbar';
import { PlayerGameView } from './components/PlayerGameView';
import { QuizEditorView } from './components/QuizEditorView';
import {
  apiDeleteQuiz,
  apiFetchMe,
  apiGetMyQuizzes,
  apiGetPublicQuizzes,
  apiLogout,
  apiStartLiveSession,
} from './lib/api';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { Quiz, SessionSummary, User } from './types/quiz';

type ViewState =
  | { name: 'home' }
  | { name: 'dashboard' }
  | { name: 'editor'; quiz: Quiz | null }
  | { name: 'join_nickname'; session: SessionSummary }
  | { name: 'host_game'; code: string; hostSecret: string; quizId: string; quizTitle: string }
  | { name: 'player_game'; code: string; nickname: string; quizTitle: string };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [view, setView] = useState<ViewState>({ name: 'home' });

  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);

  const loadPublicQuizzes = useCallback(async () => {
    setLoadingPublic(true);
    try {
      const list = await apiGetPublicQuizzes();
      setPublicQuizzes(list);
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  const loadMyQuizzes = useCallback(async () => {
    setLoadingMine(true);
    try {
      const list = await apiGetMyQuizzes();
      setMyQuizzes(list);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => {
    void loadPublicQuizzes();

    void apiFetchMe().then((u) => {
      if (u) setUser(u);
    });

    if (isSupabaseConfigured && supabase) {
      void supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          const metaName =
            (data.user.user_metadata?.full_name as string | undefined) ||
            (data.user.user_metadata?.name as string | undefined) ||
            data.user.email?.split('@')[0] ||
            'Foydalanuvchi';
          setUser({
            id: data.user.id,
            name: metaName,
            email: data.user.email || '',
            provider: 'google',
          });
        }
      });
    }
  }, [loadPublicQuizzes]);

  const handleOpenDashboard = () => {
    setView({ name: 'dashboard' });
    void loadMyQuizzes();
  };

  const handleStartLiveQuiz = async (quizId: string) => {
    setStartingQuizId(quizId);
    try {
      const res = await apiStartLiveSession(quizId);
      if (res.code && res.hostSecret && res.quizTitle) {
        setView({
          name: 'host_game',
          code: res.code,
          hostSecret: res.hostSecret,
          quizId,
          quizTitle: res.quizTitle,
        });
      }
    } finally {
      setStartingQuizId(null);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    const ok = await apiDeleteQuiz(quizId);
    if (ok) {
      setMyQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      void loadPublicQuizzes();
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    await apiLogout();
    setUser(null);
    if (view.name === 'dashboard') {
      void loadMyQuizzes();
    }
  };

  // Fullscreen editor without outer navbar
  if (view.name === 'editor') {
    return (
      <QuizEditorView
        initialQuiz={view.quiz}
        onBack={() => {
          setView({ name: 'dashboard' });
          void loadMyQuizzes();
          void loadPublicQuizzes();
        }}
        onSaved={() => {
          void loadMyQuizzes();
          void loadPublicQuizzes();
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col text-white">
      <GeometricBackdrop />

      <Navbar
        user={user}
        currentView={view.name}
        onNavigateHome={() => {
          setView({ name: 'home' });
          void loadPublicQuizzes();
        }}
        onNavigateDashboard={handleOpenDashboard}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {view.name === 'home' && (
        <HomeView
          publicQuizzes={publicQuizzes}
          loadingQuizzes={loadingPublic}
          startingQuizId={startingQuizId}
          onCodeVerified={(session) =>
            setView({ name: 'join_nickname', session })
          }
          onStartPublicQuiz={handleStartLiveQuiz}
        />
      )}

      {view.name === 'dashboard' && (
        <DashboardView
          user={user}
          quizzes={myQuizzes}
          loading={loadingMine}
          startingQuizId={startingQuizId}
          onBackHome={() => setView({ name: 'home' })}
          onCreateNew={() => setView({ name: 'editor', quiz: null })}
          onEditQuiz={(quiz) => setView({ name: 'editor', quiz })}
          onStartEditLive={handleStartLiveQuiz}
          onDeleteQuiz={handleDeleteQuiz}
        />
      )}

      {view.name === 'join_nickname' && (
        <JoinNicknameView
          session={view.session}
          onBack={() => setView({ name: 'home' })}
          onSubmitNickname={(nickname) =>
            setView({
              name: 'player_game',
              code: view.session.code,
              nickname,
              quizTitle: view.session.quizTitle,
            })
          }
        />
      )}

      {view.name === 'host_game' && (
        <HostGameView
          code={view.code}
          hostSecret={view.hostSecret}
          quizTitle={view.quizTitle}
          onExit={() => setView({ name: 'home' })}
          onReplay={() => void handleStartLiveQuiz(view.quizId)}
        />
      )}

      {view.name === 'player_game' && (
        <PlayerGameView
          code={view.code}
          nickname={view.nickname}
          quizTitle={view.quizTitle}
          onExit={() => setView({ name: 'home' })}
        />
      )}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          if (view.name === 'dashboard') {
            void loadMyQuizzes();
          }
        }}
      />
    </div>
  );
}
