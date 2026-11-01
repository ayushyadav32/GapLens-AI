import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Search, Plus, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { getUserInitials } from '@/lib/userUtils';
import { clsx } from 'clsx';

interface TopNavigationProps {
  onNewInvestigation?: () => void;
  onOpenPalette?: () => void;
}

export const TopNavigation = ({ onNewInvestigation, onOpenPalette }: TopNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
        return { section: 'OVERVIEW', title: 'Research Overview' };
      case '/workspace':
        return { section: 'MY RESEARCH', title: 'Research Studio' };
      case '/gaps':
        return { section: 'INFORMATION GAPS', title: 'Unanswered Questions' };
      case '/contradictions':
        return { section: 'SOURCE CONFLICTS', title: 'Contradictory Statements' };
      case '/evidence':
        return { section: 'EVIDENCE', title: 'Extracted Claims & Quotations' };
      case '/temporal':
        return { section: 'OUTDATED SOURCES', title: 'Chronological Source Review' };
      case '/resolution':
        return { section: 'VERIFICATION TASKS', title: 'Actionable Checklist' };
      case '/reports':
        return { section: 'REPORTS', title: 'Research Summary Reports' };
      case '/profile':
        return { section: 'ACCOUNT', title: 'My Profile' };
      default:
        return { section: 'RESEARCH', title: 'Research Investigation' };
    }
  };

  const pageMeta = getPageMeta(location.pathname);

  const triggerPalette = () => {
    if (onOpenPalette) onOpenPalette();
    else window.dispatchEvent(new CustomEvent('toggle-command-palette'));
  };

  return (
    <header className="h-16 bg-white/85 dark:bg-navy/90 backdrop-blur-md border-b border-ink/8 dark:border-white/10 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* ── Left: Global Clickable Breadcrumbs ── */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 min-w-0 text-xs">
        <NavLink
          to="/"
          className="flex items-center gap-1.5 font-semibold text-ink-muted hover:text-teal dark:text-white/60 dark:hover:text-white transition-colors shrink-0"
          title="Return to GapLens AI Home Page"
        >
          <Home className="w-3.5 h-3.5 text-gold" />
          <span className="hidden sm:inline">Home</span>
        </NavLink>

        <ChevronRight className="w-3 h-3 text-ink-muted/40 dark:text-white/20 shrink-0" />

        <NavLink
          to="/dashboard"
          className={clsx(
            'font-semibold transition-colors shrink-0',
            location.pathname === '/dashboard'
              ? 'text-teal font-bold'
              : 'text-ink-muted hover:text-teal dark:text-white/60 dark:hover:text-white'
          )}
          title="Personal Research Observatory Dashboard"
        >
          Dashboard
        </NavLink>

        {location.pathname !== '/dashboard' && (
          <>
            <ChevronRight className="w-3 h-3 text-ink-muted/40 dark:text-white/20 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal font-mono shrink-0">
              {pageMeta.section}
            </span>
            <ChevronRight className="w-3 h-3 text-ink-muted/40 dark:text-white/20 shrink-0 hidden md:inline" />
            <h2 className="text-xs font-bold text-ink dark:text-white leading-tight truncate hidden md:inline">
              {pageMeta.title}
            </h2>
          </>
        )}
      </nav>

      {/* ── Middle: Search / Command Trigger ── */}
      <div
        onClick={triggerPalette}
        className="hidden md:flex items-center justify-between flex-1 max-w-md mx-4 px-3.5 py-1.5 rounded-xl bg-ivory-100 dark:bg-white/5 hover:bg-ivory-200 dark:hover:bg-white/10 border border-ink/10 dark:border-white/10 hover:border-teal/40 cursor-pointer transition-all duration-200 group shadow-xs"
      >
        <div className="flex items-center gap-2 text-ink-muted dark:text-white/60 text-xs truncate">
          <Search className="w-4 h-4 text-teal shrink-0 group-hover:scale-105 transition-transform" />
          <span className="truncate">Search investigations, claims, or run command...</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-muted dark:text-white/40 bg-white dark:bg-white/10 border border-ink/10 dark:border-white/10">
            Ctrl
          </kbd>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-muted dark:text-white/40 bg-white dark:bg-white/10 border border-ink/10 dark:border-white/10">
            K
          </kbd>
        </div>
      </div>

      {/* ── Right Actions ── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* User initials avatar */}
        <div
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-navy text-gold font-black text-xs flex items-center justify-center cursor-pointer border border-gold/40 hover:border-gold hover:shadow-gold-sm transition-all shrink-0"
          title={user?.email || 'My Profile'}
        >
          {getUserInitials(user)}
        </div>
      </div>
    </header>
  );
};
