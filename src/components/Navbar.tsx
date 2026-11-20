import { LayoutGrid, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '../types/quiz';

interface NavbarProps {
  user: User | null;
  currentView: string;
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  currentView,
  onNavigateHome,
  onNavigateDashboard,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-8 px-6 py-5">
      <button
        type="button"
        onClick={onNavigateHome}
        className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden="true"
        >
          <rect width="32" height="32" rx="9" fill="#D946EF" />
          <path
            d="M10 11.5H22L12.5 20.5H22"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>ZiyoQuiz</span>
      </button>

      <nav className="flex items-center gap-5 shrink-0">
        <button
          type="button"
          onClick={onNavigateDashboard}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentView === 'dashboard'
              ? 'bg-white text-[#2D0F2B]'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
          }`}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span>Mening panelim</span>
        </button>

        {user ? (
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 px-3.5 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0">
              <UserIcon className="h-4 w-4 text-[#F0ABFC] shrink-0" />
              <span className="max-w-[150px] truncate">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Chiqish"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-2 rounded-lg bg-[#D946EF] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#C026D3] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>Kirish / Google</span>
          </button>
        )}
      </nav>
    </header>
  );
}
