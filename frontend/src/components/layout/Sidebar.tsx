import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Search,
  GitBranch,
  Zap,
  Map,
  Clock,
  CheckSquare,
  FileText,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Command,
  Bell,
  Home,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { GapLensIcon, GapLensSidebarLogo } from '@/components/logo/GapLensLogo';
import { formatUserName, getUserInitials } from '@/lib/userUtils';

interface NavItem {
  path: string;
  label: string;
  shortcut: string;
  icon: React.ElementType;
  tooltip: string;
  badge?: string;
  hasNotification?: boolean;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Overview', shortcut: '⌘1', icon: Compass, tooltip: 'Summary of your personal research activity' },
  { path: '/workspace', label: 'My Research', shortcut: '⌘2', icon: Search, tooltip: 'Enter research questions, add sources, and view results' },
  { path: '/gaps', label: 'Information Gaps', shortcut: '⌘3', icon: GitBranch, tooltip: 'Information missing from your reviewed sources', hasNotification: true },
  { path: '/contradictions', label: 'Source Conflicts', shortcut: '⌘4', icon: Zap, tooltip: 'Disagreements and conflicts between sources' },
  { path: '/evidence', label: 'Evidence', shortcut: '⌘5', icon: Map, tooltip: 'Explore extracted claims with verbatim source quotations' },
  { path: '/temporal', label: 'Outdated Sources', shortcut: '⌘6', icon: Clock, tooltip: 'Check publication dates and outdated information' },
  { path: '/resolution', label: 'Verification Tasks', shortcut: '⌘7', icon: CheckSquare, tooltip: 'Actionable checklist to verify and close gaps' },
  { path: '/reports', label: 'Reports', shortcut: '⌘8', icon: FileText, tooltip: 'Generate and export research summaries' },
];

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('toggle-command-palette'));
  };

  return (
    <aside
      className={clsx(
        'relative h-full bg-navy border-r border-white/8 transition-all duration-300 ease-in-out z-40 flex flex-col justify-between shrink-0 select-none shadow-2xl',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* ── Top Header / Mark ── */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-white/6 justify-between">
          <NavLink
            to="/"
            className="flex items-center gap-3 overflow-hidden group py-1"
            title="Return to GapLens AI Home"
          >
            <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 group-hover:border-teal/50 group-hover:bg-teal/10 transition-all shadow-sm">
              <GapLensIcon size={24} />
            </div>

            {!collapsed && (
              <div className="flex flex-col leading-tight truncate">
                <span className="font-black text-sm tracking-tight text-white group-hover:text-teal transition-colors flex items-center gap-1">
                  Gap<span style={{ color: '#087F83' }}>Lens</span>
                  <span className="font-semibold text-[10px] px-1 py-0.5 rounded bg-teal/20 text-teal border border-teal/40">
                    AI
                  </span>
                </span>
                <span className="text-[10px] text-white/50 font-medium mt-0.5">
                  Research Platform
                </span>
              </div>
            )}
          </NavLink>

          {/* Toggle Rail Collapse button on desktop */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white items-center justify-center transition-colors border border-white/8"
            title={collapsed ? 'Expand Command Rail' : 'Collapse Command Rail'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Global Return to Public Home */}
        <div className="px-3 pt-2.5 pb-1 border-b border-white/4">
          <NavLink
            to="/"
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-colors border border-transparent hover:border-white/10 group',
              collapsed ? 'justify-center' : ''
            )}
            title="Return to GapLens AI Public Landing Page"
          >
            <Home className="w-4 h-4 text-gold shrink-0 group-hover:scale-105 transition-transform" />
            {!collapsed && <span>Public Home</span>}
          </NavLink>
        </div>

        {/* ── Navigation Command Rail ── */}
        <nav className="p-3 space-y-1.5" aria-label="Command Rail">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <div key={item.path} className="relative group">
                <NavLink
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={clsx(
                    'relative flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-all duration-200 text-xs font-semibold group',
                    active
                      ? 'bg-teal/20 text-white border border-teal/40 shadow-teal-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  )}
                >
                  {/* Active glowing indicator pill */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-teal rounded-r-full shadow-[0_0_12px_#087F83]" />
                  )}

                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon
                      className={clsx(
                        'w-5 h-5 transition-transform group-hover:scale-110',
                        active ? 'text-teal' : 'text-white/60 group-hover:text-white'
                      )}
                    />
                    {item.hasNotification && !active && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold shadow-[0_0_8px_#D59A55]" />
                    )}
                  </div>

                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      <span className="text-[10px] font-mono text-white/30 group-hover:text-white/50 ml-2">
                        {item.shortcut}
                      </span>
                    </div>
                  )}
                </NavLink>

                {/* Floating Tooltip when collapsed */}
                {collapsed && hoveredItem === item.path && (
                  <div className="fixed left-20 z-50 ml-2 px-3 py-1.5 bg-navy border border-teal/40 rounded-xl shadow-2xl text-xs font-bold text-white whitespace-nowrap pointer-events-none flex items-center gap-2 animate-scale-in">
                    <span className="text-white">{item.label}</span>
                    <span className="text-[10px] font-mono text-gold bg-white/10 px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom Controls & Profile ── */}
      <div className="p-3 border-t border-white/6 space-y-2">
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={openPalette}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all border border-white/5 group',
            collapsed ? 'justify-center' : 'justify-between'
          )}
          title="Open Command Palette (Ctrl+K)"
        >
          <div className="flex items-center gap-2.5">
            <Command className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
            {!collapsed && <span>Commands</span>}
          </div>
          {!collapsed && (
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/50">
              ⌘K
            </kbd>
          )}
        </button>

        {/* User Profile item */}
        <div className="relative group">
          <NavLink
            to="/profile"
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent',
              collapsed ? 'justify-center' : ''
            )}
            title={user?.email || 'Investigator Profile'}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal to-teal-400 text-navy font-black text-xs flex items-center justify-center shrink-0 border border-teal/50 shadow-sm">
              {getUserInitials(user)}
            </div>
            {!collapsed && (
              <div className="truncate flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {formatUserName(user)}
                </p>
                <p className="text-[10px] text-white/40 truncate font-mono">
                  {user?.email || 'Active Session'}
                </p>
              </div>
            )}
          </NavLink>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-coral/80 hover:text-coral hover:bg-coral/10 transition-colors',
            collapsed ? 'justify-center' : ''
          )}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
