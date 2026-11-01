import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  FolderOpen,
  Calendar,
  Trash2,
  GitBranch,
  Zap,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatUserName } from '@/lib/userUtils';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession, SourceDocument, DashboardStats } from '@/types';
import { QuestionComposerModal } from '@/components/research/QuestionComposerModal';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  // Filter state for investigation list
  const [searchFilter, setSearchFilter] = useState('');

  const loadDashboardData = async () => {
    try {
      const [sessionsData, statsData] = await Promise.all([
        researchApi.getSessions(),
        researchApi.getDashboardStats().catch(() => null),
      ]);
      setSessions(sessionsData.results);
      if (statsData) {
        setDashboardStats(statsData);
      }

      if (sessionsData.results.length > 0) {
        const topSession = sessionsData.results[0];
        setActiveSession(topSession);
        const sourcesData = await researchApi.getSources(topSession.id);
        setSources(sourcesData.sources);
      } else {
        setActiveSession(null);
        setSources([]);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleDeleteSession = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete investigation "${title}"?`)) return;
    try {
      await researchApi.deleteSession(id);
      toast({
        type: 'success',
        title: 'Investigation Deleted',
        message: `"${title}" was removed.`,
      });
      loadDashboardData();
    } catch (err) {
      console.error('Failed to delete session:', err);
      toast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not delete investigation.',
      });
    }
  };

  const totalSourcesCount = sessions.reduce((acc, s) => acc + (s.source_count || 0), 0);
  const readySourcesCount = sources.filter((s) => s.extraction_status === 'READY').length;

  const filteredSessions = sessions.filter((s) => {
    return (
      searchFilter === '' ||
      s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.query.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Welcome Banner ── */}
      <div className="relative bg-gradient-to-r from-navy via-navy to-teal-950 rounded-3xl p-6 sm:p-8 text-white border border-teal/30 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal/20 text-teal border border-teal/40 font-mono">
              Research Overview
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Welcome back, {formatUserName(user)}
            </h1>
            <p className="text-sm text-white/90 font-medium leading-relaxed">
              GapLens AI compares multiple information sources to uncover missing facts, conflicting claims and outdated information with traceable evidence.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setComposerOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            className="text-xs font-bold bg-teal hover:bg-teal-dark text-white rounded-xl shrink-0"
          >
            Create Investigation
          </Button>
        </div>
      </div>

      <FeatureExplainer
        title="Research Overview"
        badge="OVERVIEW"
        badgeColor="teal"
        whatItDoes="Displays summary metrics across all your active personal investigations, highlighting verified claims, potential contradictions, and information gaps."
        whyItMatters="Enables researchers and auditors to instantly pinpoint which investigations require immediate evidence ingestion before making conclusions."
        whereItComesFrom="Synthesized in real-time from your personal database records and analyzed claims."
        whatYouShouldDo="Review your active research, inspect findings, and click on any investigation to view details."
      />

      {/* ── Active Investigation Banner ── */}
      {activeSession && (
        <div className="bg-white rounded-2xl p-6 border-2 border-teal/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/8 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal/15 text-teal border border-teal/30">
                  Active Investigation
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    (activeSession.dimension_count || 0) > 0
                      ? 'bg-success/15 text-success'
                      : 'bg-gold/15 text-gold-dark'
                  }`}
                >
                  {(activeSession.dimension_count || 0) > 0 ? 'Analysis Ready' : 'Draft — Awaiting Analysis'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-ink line-clamp-2">
                {activeSession.title}
              </h2>
              <p className="text-xs text-ink-secondary line-clamp-2">
                {activeSession.query}
              </p>
              {sessions.length > 1 && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[11px] font-bold text-ink-muted">Switch Investigation:</span>
                  <select
                    value={activeSession.id}
                    onChange={(e) => {
                      const found = sessions.find((s) => s.id === e.target.value);
                      if (found) {
                        setActiveSession(found);
                        researchApi.getSources(found.id).then((res) => setSources(res.sources)).catch(() => {});
                      }
                    }}
                    className="text-xs bg-ivory-50 border border-ink/10 rounded-lg px-2.5 py-1 text-ink font-semibold focus:outline-none focus:ring-1 focus:ring-teal"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/workspace?session=${activeSession.id}`)}
                iconRight={<ArrowRight className="w-4 h-4" />}
                className="bg-teal hover:bg-teal-dark text-white font-bold text-xs rounded-xl shadow-teal"
              >
                {(activeSession.dimension_count || 0) > 0 ? 'Review Research Results' : 'Open Research Workspace'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-ivory-50 border border-ink/5">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Sources Reviewed</span>
              <span className="text-base font-bold text-ink">{activeSession.source_count || 0}</span>
              <span className="text-[10px] text-ink-muted block mt-0.5">
                {activeSession.reference_sources_count || 0} Ref · {activeSession.evidence_sources_count || 0} Evid
              </span>
            </div>
            <div className="p-3 rounded-xl bg-ivory-50 border border-ink/5">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Decomposed Dimensions</span>
              <span className="text-base font-bold text-ink">{activeSession.dimension_count || 0}</span>
              <span className="text-[10px] text-teal block mt-0.5 font-medium">Inquiry Sub-facets</span>
            </div>
            <div className="p-3 rounded-xl bg-ivory-50 border border-ink/5">
              <span className="text-[10px] font-semibold text-gold-dark uppercase tracking-wider block">Information Gaps</span>
              <span className="text-base font-bold text-gold-dark">{activeSession.gap_count || 0}</span>
              <span className="text-[10px] text-ink-muted block mt-0.5">Missing Coverage</span>
            </div>
            <div className="p-3 rounded-xl bg-ivory-50 border border-ink/5">
              <span className="text-[10px] font-semibold text-coral uppercase tracking-wider block">Source Conflicts</span>
              <span className="text-base font-bold text-coral">{activeSession.conflict_count ?? activeSession.contradiction_count ?? 0}</span>
              <span className="text-[10px] text-coral block mt-0.5 font-medium">Clashing Directives</span>
            </div>
            <div className="p-3 rounded-xl bg-ivory-50 border border-ink/5">
              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">Date & Cycle Flags</span>
              <span className="text-base font-bold text-amber-700">1</span>
              <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">Outdated Evidence</span>
            </div>
            <div className="p-3 rounded-xl bg-ivory-50 border border-ink/5">
              <span className="text-[10px] font-semibold text-teal uppercase tracking-wider block">Verification Tasks</span>
              <span className="text-base font-bold text-teal">{activeSession.task_count ?? activeSession.verification_task_count ?? 0}</span>
              <span className="text-[10px] text-teal block mt-0.5 font-medium">Actionable Steps</span>
            </div>
          </div>
        </div>
      )}

      {/* ── State A: Clean Empty State When No Personal Data Exists ── */}
      {sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white">
          <div className="text-center py-12 px-4 max-w-xl mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-ink">
                Your Research Overview Is Clean
              </h2>
              <p className="text-sm text-ink-secondary leading-relaxed">
                You haven't created any research investigations yet. Click below to define your research question and begin uploading documents.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-ivory-100 border border-ink/8 text-left space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                Example Investigation
              </span>
              <p className="text-xs font-medium text-ink italic">
                "What should a student verify before applying for this scholarship for the 2026–27 academic year?"
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setComposerOpen(true)}
              icon={<Plus className="w-5 h-5" />}
              className="bg-teal hover:bg-teal-dark text-white font-bold px-8 py-3 rounded-xl shadow-teal text-sm"
            >
              Create Investigation
            </Button>
          </div>
        </Card>
      )}

      {/* ── State B: Simple 4-Card Overview (Only When Personal Data Exists) ── */}
      {sessions.length > 0 && (
        <div className="space-y-8">
          {/* Simple 4-Metric Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Personal Investigations</span>
                <Compass className="w-4 h-4 text-teal" />
              </div>
              <span className="text-3xl font-extrabold text-ink font-display">{sessions.length}</span>
              <p className="text-[11px] text-teal font-medium">Active Research Topics</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Sources Processed</span>
                <FileText className="w-4 h-4 text-success" />
              </div>
              <span className="text-3xl font-extrabold text-ink font-display">{totalSourcesCount}</span>
              <p className="text-[11px] text-success font-medium">
                {totalSourcesCount > 0 ? `${totalSourcesCount} Documents & URLs` : 'Awaiting Ingestion'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Last Analysis Status</span>
                <Layers className="w-4 h-4 text-gold" />
              </div>
              <span className="text-lg font-bold text-ink truncate block mt-1">
                {activeSession && (activeSession.dimension_count || 0) > 0 ? 'Analyzed' : 'Draft — No Sources'}
              </span>
              <p className="text-[11px] text-ink-muted">
                {activeSession ? activeSession.title : 'No Session Selected'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Next Action</span>
                <ArrowRight className="w-4 h-4 text-teal" />
              </div>
              <span className="text-lg font-bold text-teal block mt-1">
                {activeSession && (activeSession.dimension_count || 0) > 0 ? 'Review Findings' : 'Add Sources & Analyze'}
              </span>
              <button
                type="button"
                onClick={() => navigate(activeSession ? `/workspace?session=${activeSession.id}` : '/workspace')}
                className="text-[11px] text-teal font-semibold hover:underline block text-left"
              >
                Open My Research &rarr;
              </button>
            </div>
          </div>

          {/* Quick Findings Gateways if topSession is analyzed */}
          {activeSession && (activeSession.dimension_count || 0) > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-teal/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-ink/8 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                    Latest Analysis Findings
                  </span>
                  <h3 className="text-sm font-bold text-ink">
                    {activeSession.title}
                  </h3>
                </div>
                <span className="text-xs font-mono text-ink-muted">
                  {activeSession.source_count} Sources Reviewed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/gaps?session=${activeSession.id}`)}
                  className="p-4 rounded-xl border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors text-left space-y-1 group"
                >
                  <div className="flex items-center justify-between text-xs text-gold-dark font-bold">
                    <span>Information Gaps</span>
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-ink-secondary">Unanswered questions & omitted conditions</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/contradictions?session=${activeSession.id}`)}
                  className="p-4 rounded-xl border border-coral/30 bg-coral/5 hover:bg-coral/10 transition-colors text-left space-y-1 group"
                >
                  <div className="flex items-center justify-between text-xs text-coral font-bold">
                    <span>Possible Conflicts</span>
                    <Zap className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-ink-secondary">Direct numerical & policy disputes</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/temporal?session=${activeSession.id}`)}
                  className="p-4 rounded-xl border border-teal/30 bg-teal/5 hover:bg-teal/10 transition-colors text-left space-y-1 group"
                >
                  <div className="flex items-center justify-between text-xs text-teal font-bold">
                    <span>Publication Date Review</span>
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] text-ink-secondary">Chronological audit & freshness warnings</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/reports?session=${activeSession.id}`)}
                  className="p-4 rounded-xl border border-ink/20 bg-ivory-50 hover:bg-ivory-100 transition-colors text-left space-y-1 group"
                >
                  <div className="flex items-center justify-between text-xs text-ink font-bold">
                    <span>Formal Report</span>
                    <FileText className="w-4 h-4 text-teal" />
                  </div>
                  <p className="text-[11px] text-ink-secondary">Printable research summary & checklist</p>
                </button>
              </div>
            </div>
          )}

          {/* Investigation Registry List */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/8 pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-teal" />
                  Personal Investigations ({filteredSessions.length})
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Manage active research topics, verify sources, and inspect findings.
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Filter investigations..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-ink/10 focus:outline-none focus:ring-1 focus:ring-teal w-52"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-ink/8 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ivory-50 border-b border-ink/8 text-ink-muted font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5">Investigation Title & Question</th>
                    <th className="py-3 px-4">Sources</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {filteredSessions.map((s) => {
                    const isDraft = !s.source_count || s.source_count === 0;
                    const isAnalyzed = (s.dimension_count || 0) > 0;

                    return (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/workspace?session=${s.id}`)}
                        className="hover:bg-ivory-50 cursor-pointer transition-colors"
                      >
                        <td className="py-4 px-5 max-w-md">
                          <h4 className="font-bold text-ink hover:text-teal transition-colors">
                            {s.title}
                          </h4>
                          <p className="text-[11px] text-ink-muted truncate mt-0.5">
                            "{s.query}"
                          </p>
                        </td>

                        <td className="py-4 px-4 font-mono font-semibold text-ink">
                          {s.source_count || 0} source{s.source_count === 1 ? '' : 's'}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDraft
                                ? 'bg-ivory-200 text-ink-muted border border-ink/10'
                                : isAnalyzed
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-gold/15 text-gold-dark border border-gold/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDraft ? 'bg-ink-muted' : isAnalyzed ? 'bg-emerald-600' : 'bg-gold'
                              }`}
                            />
                            {isDraft
                              ? 'Draft — No sources added'
                              : isAnalyzed
                              ? 'ANALYZED'
                              : 'AWAITING ANALYSIS'}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-mono text-[11px] text-ink-muted">
                          {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSession(s);
                                researchApi.getSources(s.id).then((res) => setSources(res.sources)).catch(() => {});
                              }}
                              className="text-xs font-semibold text-teal hover:bg-teal/10"
                            >
                              Select
                            </Button>
                            <Button
                              variant="outline-teal"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/workspace?session=${s.id}`);
                              }}
                              className="text-xs font-semibold"
                            >
                              {isDraft ? 'Add Sources' : 'Open Research'}
                            </Button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(s.id, s.title, e)}
                              className="p-1.5 text-ink-muted hover:text-coral hover:bg-coral/10 rounded-lg transition-colors"
                              title="Delete investigation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Question Composer Modal */}
      <QuestionComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={async (data) => {
          const newSession = await researchApi.createSession(data);
          navigate(`/workspace?session=${newSession.id}`);
        }}
      />
    </div>
  );
};
