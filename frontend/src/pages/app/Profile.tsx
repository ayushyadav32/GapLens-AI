import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Building2,
  ShieldCheck,
  FileSpreadsheet,
  BookOpen,
  Plus,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { researchApi } from '@/lib/api/researchApi';
import { formatUserName, getUserInitials } from '@/lib/userUtils';
import type { ResearchSession } from '@/types';

export const Profile = () => {
  const { user, logout, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    fetchUser?.();
    researchApi
      .getSessions()
      .then((data) => {
        setSessions(data.results || []);
      })
      .catch(() => {
        setSessions([]);
      })
      .finally(() => {
        setLoadingSessions(false);
      });
  }, [fetchUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = formatUserName(user);
  const initials = getUserInitials(user);

  const formatMemberDate = (dateStr?: string) => {
    if (!dateStr) return 'Active Member';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Active Member';
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Active Member';
    }
  };

  const totalCount = sessions.length;
  const activeCount = sessions.filter(
    (s) => s.status === 'analyzing' || s.status === 'ingesting' || s.status === 'pending'
  ).length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 font-sans">
      <PageHeader
        title="My Profile"
        subtitle="Manage your GapLens AI account and preferences."
        icon={<User className="w-5 h-5 text-teal" />}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline-teal"
              size="sm"
              onClick={() => navigate('/workspace?action=new')}
              icon={<Plus className="w-4 h-4" />}
              className="text-xs font-semibold"
            >
              New Investigation
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
              icon={<LogOut className="w-4 h-4" />}
              className="text-xs font-semibold"
            >
              Sign Out
            </Button>
          </div>
        }
      />

      {/* ── User Account Card ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-ink/8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-navy to-teal text-gold font-bold text-2xl sm:text-3xl flex items-center justify-center border-2 border-gold/40 shadow-md shrink-0">
            {initials}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-ink truncate">
                {displayName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono text-ink-muted bg-ivory-100 border border-ink/5">
                @{user?.username || 'investigator'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-ink-secondary font-mono flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-teal shrink-0" />
              <span className="truncate">{user?.email || 'No email registered'}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold shrink-0" />
                Member since {formatMemberDate(user?.date_joined)}
              </span>
              {user?.organization && (
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <Building2 className="w-3.5 h-3.5 text-teal shrink-0" />
                  {user.organization}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-ink/5">
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            icon={<LogOut className="w-4 h-4" />}
            className="text-xs font-bold"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* ── Two-Column Grid: Account Information & Research Overview ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Account & Security */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-ink/8 shadow-card space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-ink/8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal/10 text-teal">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Account Information</h3>
                  <p className="text-[11px] text-ink-secondary">Authenticated credentials and access tier</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal/10 text-teal border border-teal/20">
                Active
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-ivory-50 border border-ink/5 flex items-center justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Full Name</span>
                <span className="font-semibold text-ink text-right truncate">{displayName}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-ivory-50 border border-ink/5 flex items-center justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Email Address</span>
                <span className="font-mono font-semibold text-ink text-right truncate" title={user?.email}>
                  {user?.email || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-ivory-50 border border-ink/5 flex items-center justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Account Username</span>
                <span className="font-mono text-teal font-semibold text-right truncate">
                  @{user?.username || 'investigator'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-ivory-50 border border-ink/5 flex items-center justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Workspace Scope</span>
                <span className="font-semibold text-ink text-right">Personal Isolated Workspace</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-ivory-50 border border-ink/5 flex items-center justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Session Security</span>
                <span className="font-mono text-ink-muted text-right">Token-Based (JWT)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-ink/5">
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Your research sessions, source documents, and verification tasks are strictly isolated to your authenticated account.
            </p>
          </div>
        </div>

        {/* Right: Personal Research Overview */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-ink/8 shadow-card space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-ink/8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gold/15 text-gold">
                  <FileSpreadsheet className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Personal Research Overview</h3>
                  <p className="text-[11px] text-ink-secondary">Activity across personal investigations</p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-ink-muted">
                {totalCount} {totalCount === 1 ? 'Investigation' : 'Investigations'}
              </span>
            </div>

            {loadingSessions ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                Loading research statistics...
              </div>
            ) : totalCount === 0 ? (
              <div className="p-6 rounded-2xl bg-ivory-50 border border-dashed border-ink/15 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-ivory-200 text-ink-muted flex items-center justify-center mx-auto">
                  <BookOpen className="w-5 h-5 text-teal" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-ink">No Personal Investigations Yet</p>
                  <p className="text-[11px] text-ink-secondary max-w-xs mx-auto leading-relaxed">
                    You have not started any research investigations. Launch your first investigation to ingest sources and detect hidden information dark spots.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/workspace?action=new')}
                  icon={<Plus className="w-4 h-4" />}
                  className="text-xs font-bold shadow-teal-sm"
                >
                  Start First Investigation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-ivory-50 border border-ink/5 text-center space-y-0.5">
                    <span className="text-[10px] font-mono text-ink-muted uppercase block">Total</span>
                    <span className="text-lg font-black text-ink">{totalCount}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-0.5">
                    <span className="text-[10px] font-mono text-amber-700 uppercase block">Active</span>
                    <span className="text-lg font-black text-amber-700">{activeCount}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-teal/10 border border-teal/20 text-center space-y-0.5">
                    <span className="text-[10px] font-mono text-teal uppercase block">Completed</span>
                    <span className="text-lg font-black text-teal">{completedCount}</span>
                  </div>
                </div>

                {/* Recent Personal Investigations Preview */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted font-mono">
                    Recent Personal Investigations
                  </p>
                  <div className="space-y-2 max-h-44 overflow-y-auto app-scroll pr-1">
                    {sessions.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/workspace?session=${s.id}`)}
                        className="p-3 rounded-xl bg-ivory-50 hover:bg-ivory-100 border border-ink/5 hover:border-teal/30 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-ink truncate group-hover:text-teal transition-colors">
                            {s.title || 'Untitled Investigation'}
                          </p>
                          <p className="text-[10px] text-ink-muted font-mono truncate">
                            {formatMemberDate(s.created_at)} • {s.status.toUpperCase()}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-teal group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-ink/5 flex items-center justify-between">
            <span className="text-[11px] text-ink-muted">
              {totalCount > 0 ? 'Excludes public demonstration sessions' : 'Personal workspace ready'}
            </span>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-[11px] font-semibold text-teal hover:underline flex items-center gap-1"
            >
              Open Observatory Dashboard <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Account Session Controls ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-ink/8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Account Session</h4>
          <p className="text-xs text-ink-secondary">
            Sign out of your active browser session when finished investigating.
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleLogout}
          icon={<LogOut className="w-4 h-4" />}
          className="text-xs font-bold shrink-0"
        >
          Sign Out of GapLens AI
        </Button>
      </div>
    </div>
  );
};
