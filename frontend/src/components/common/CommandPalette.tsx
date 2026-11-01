import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Sparkles,
  Compass,
  GitBranch,
  Zap,
  Map,
  Clock,
  CheckSquare,
  FileText,
  User,
  X,
  ArrowRight,
  FolderOpen,
  Command,
} from 'lucide-react';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession } from '@/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNewInvestigation?: () => void;
  onLoadDemo?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Actions' | 'Investigations' | 'Navigation';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  badge?: string;
}

export const CommandPalette = ({
  open,
  onClose,
  onNewInvestigation,
  onLoadDemo,
}: CommandPaletteProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch active sessions when opened
  useEffect(() => {
    if (open) {
      researchApi
        .getSessions()
        .then((data) => setSessions(data.results))
        .catch(() => {});
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else {
          // If we want parent to open it, handled by parent or custom event
          window.dispatchEvent(new CustomEvent('toggle-command-palette'));
        }
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Build items list
  const allItems: PaletteItem[] = [
    {
      id: 'action-new',
      category: 'Actions',
      title: 'Start New Investigation',
      subtitle: 'Formulate a research hypothesis and ingest multi-modal sources',
      icon: Plus,
      badge: 'Action',
      action: () => {
        onClose();
        if (onNewInvestigation) onNewInvestigation();
        else navigate('/workspace?action=new');
      },
    },
    // Dynamically list recent investigations
    ...sessions.slice(0, 5).map((s) => ({
      id: `session-${s.id}`,
      category: 'Investigations' as const,
      title: s.title,
      subtitle: `"${s.query.slice(0, 75)}..." (${s.source_count} sources)`,
      icon: FolderOpen,
      badge: s.status.toUpperCase(),
      action: () => {
        onClose();
        navigate(`/workspace?session=${s.id}`);
      },
    })),
    // Navigation routes
    {
      id: 'nav-observatory',
      category: 'Navigation',
      title: 'Observatory Command Center',
      subtitle: 'System metrics, coverage charts, and intelligence queue',
      icon: Compass,
      action: () => {
        onClose();
        navigate('/dashboard');
      },
    },
    {
      id: 'nav-workspace',
      category: 'Navigation',
      title: 'Research Ingestion Studio',
      subtitle: 'Upload PDFs, add web URLs, or enter manual transcripts',
      icon: Search,
      action: () => {
        onClose();
        navigate('/workspace');
      },
    },
    {
      id: 'nav-gaps',
      category: 'Navigation',
      title: 'Gap Intelligence Radar',
      subtitle: 'Analyze unaddressed sub-questions and digital dark spots',
      icon: GitBranch,
      action: () => {
        onClose();
        navigate('/gaps');
      },
    },
    {
      id: 'nav-contradictions',
      category: 'Navigation',
      title: 'Contradiction Intelligence Map',
      subtitle: 'Cross-examine conflicting statistics, projections, and facts',
      icon: Zap,
      action: () => {
        onClose();
        navigate('/contradictions');
      },
    },
    {
      id: 'nav-evidence',
      category: 'Navigation',
      title: 'Evidence Universe Graph',
      subtitle: 'Navigable 2D/3D relational network of claims and citations',
      icon: Map,
      action: () => {
        onClose();
        navigate('/evidence');
      },
    },
    {
      id: 'nav-temporal',
      category: 'Navigation',
      title: 'Temporal & Freshness Analysis',
      subtitle: 'Expose stale citations, undated claims, and timeline shifts',
      icon: Clock,
      action: () => {
        onClose();
        navigate('/temporal');
      },
    },
    {
      id: 'nav-resolution',
      category: 'Navigation',
      title: 'Resolution Center',
      subtitle: 'Review actionable verification tasks and resolve dark spots',
      icon: CheckSquare,
      action: () => {
        onClose();
        navigate('/resolution');
      },
    },
    {
      id: 'nav-reports',
      category: 'Navigation',
      title: 'Intelligence Dossier Reports',
      subtitle: 'Generate and export executive research intelligence summaries',
      icon: FileText,
      action: () => {
        onClose();
        navigate('/reports');
      },
    },
    {
      id: 'nav-profile',
      category: 'Navigation',
      title: 'Investigator Profile & Security',
      subtitle: 'Manage account credentials and AI engine parameters',
      icon: User,
      action: () => {
        onClose();
        navigate('/profile');
      },
    },
  ];

  // Filter items by search query
  const filteredItems = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase())) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy/70 backdrop-blur-md transition-opacity" />

      {/* Palette Container */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-ink/10 overflow-hidden flex flex-col max-h-[75vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink/8 bg-ivory-50">
          <Search className="w-5 h-5 text-teal shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search intelligence console, jump to investigation, or type action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-ink font-medium placeholder:text-ink-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-ink-muted bg-white border border-ink/10 shadow-xs">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 sm:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto app-scroll p-3 space-y-4">
          {filteredItems.length > 0 ? (
            <div>
              {['Actions', 'Investigations', 'Navigation'].map((category) => {
                const groupItems = filteredItems.filter((i) => i.category === category);
                if (groupItems.length === 0) return null;

                return (
                  <div key={category} className="mb-3">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                      {category}
                    </span>
                    <div className="space-y-1">
                      {groupItems.map((item) => {
                        const globalIndex = filteredItems.indexOf(item);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.id}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'bg-teal/10 text-teal border border-teal/20 shadow-xs'
                                : 'hover:bg-ivory-100 text-ink border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-teal text-white shadow-teal-sm'
                                    : 'bg-ivory-200 text-ink-muted'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="truncate">
                                <h4 className="text-xs font-bold leading-tight truncate">
                                  {item.title}
                                </h4>
                                {item.subtitle && (
                                  <p className="text-[11px] text-ink-muted truncate mt-0.5">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {item.badge && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ivory-200 text-ink-secondary border border-ink/5">
                                  {item.badge}
                                </span>
                              )}
                              {isSelected && <ArrowRight className="w-3.5 h-3.5 text-teal" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-ink-muted space-y-1">
              <Command className="w-8 h-8 mx-auto text-ink-muted/40 mb-2" />
              <p className="text-xs font-semibold text-ink">No commands or investigations match "{query}"</p>
              <p className="text-[11px]">Try searching for "Scholarship", "New", "Gaps", or "Evidence"</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-ivory-100 border-t border-ink/8 flex items-center justify-between text-[11px] text-ink-muted">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1.5 py-0.5 rounded bg-white border border-ink/10 font-mono">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-ink/10 font-mono">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-ink/10 font-mono">Enter</kbd> to select
            </span>
          </div>
          <span className="font-mono text-teal font-semibold">GAPLENS AI // OBSERVATORY OS</span>
        </div>
      </div>
    </div>
  );
};
