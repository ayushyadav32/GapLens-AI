import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GitBranch,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileText,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession, ResearchFinding } from '@/types';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

export const GapIntelligence = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlSessionId = params.get('session');

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [realFindings, setRealFindings] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Load user personal sessions
  useEffect(() => {
    researchApi
      .getSessions()
      .then((data) => {
        setSessions(data.results);
        let selected = data.results.find((s) => s.id === urlSessionId);
        if (!selected && data.results.length > 0) {
          selected = data.results[0];
        }
        if (selected) {
          setActiveSession(selected);
          setParams({ session: selected.id }, { replace: true });
        } else {
          setActiveSession(null);
        }
      })
      .catch((err) => console.error('Failed to load sessions:', err))
      .finally(() => setLoading(false));
  }, [urlSessionId]);

  // 2. Load findings and dimensions for active personal session
  useEffect(() => {
    if (!activeSession) {
      setRealFindings([]);
      setDimensions([]);
      return;
    }

    Promise.all([
      researchApi.getFindings(activeSession.id, { type: 'gap' }),
      researchApi.getDimensions(activeSession.id),
    ])
      .then(([fRes, dRes]) => {
        setRealFindings(fRes.results || []);
        setDimensions(dRes.results || []);
      })
      .catch((err) => console.error('Failed to load gap intelligence from API:', err));
  }, [activeSession]);

  const isAnalyzed = Boolean(activeSession && (activeSession.dimension_count || 0) > 0);

  // Filtered gaps from actual real records
  const filteredGaps = realFindings.filter((gap) => {
    const matchesSeverity = selectedSeverity === 'all' || (gap.priority || '').toLowerCase() === selectedSeverity;
    const matchesSearch =
      searchQuery === '' ||
      (gap.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (gap.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const criticalGapsCount = realFindings.filter((g) => (g.priority || '').toLowerCase() === 'critical').length;
  const highGapsCount = realFindings.filter((g) => (g.priority || '').toLowerCase() === 'high').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Page Header ── */}
      <PageHeader
        title="Information Gaps"
        subtitle="Discover questions, criteria, and requirements where no supporting evidence was found in your reviewed documents."
        icon={<GitBranch className="w-5 h-5 text-teal" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(activeSession ? `/resolution?session=${activeSession.id}` : '/resolution')}
            iconRight={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Go to Verification Tasks
          </Button>
        }
      />

      <FeatureExplainer
        title="Information Gap Detection"
        badge="INFORMATION GAP"
        badgeColor="gold"
        whatItDoes="Identifies important research dimensions, requirements, or sub-questions for which NO supporting evidence was found in your reviewed documents."
        whyItMatters="Most real-world research failures happen because of unasked or unanswered questions. We mark these as 'Not found in reviewed sources'."
        whereItComesFrom="Direct comparison between your research dimensions and the extracted source claims."
        whatYouShouldDo="Review detected gaps, submit supplementary documents or links, and update your verification checklist."
      />

      {/* ── Active Investigation Selector ── */}
      {sessions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-ink/8 shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-teal flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <FolderOpen className="w-3.5 h-3.5" /> Investigation:
            </span>
            <select
              value={activeSession?.id || ''}
              onChange={(e) => {
                const s = sessions.find((x) => x.id === e.target.value);
                if (s) {
                  setActiveSession(s);
                  setParams({ session: s.id });
                }
              }}
              className="bg-ivory-50 border border-ink/10 rounded-lg px-2.5 py-1 text-xs font-bold text-ink focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.source_count} sources)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="px-2.5 py-1 rounded-full bg-ivory-100 font-semibold text-ink">
              {isAnalyzed ? `${realFindings.length} Gaps Detected` : 'Draft — Not Analyzed'}
            </span>
          </div>
        </div>
      )}

      {/* ── State 1: No Investigations Exist ── */}
      {sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
            <GitBranch className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Select an investigation to view its results</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Create an investigation in My Research and upload sources to detect missing information gaps.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/workspace#central-document-upload')}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Go to My Research &amp; Add Documents
          </Button>
        </Card>
      )}

      {/* ── State 2: Investigation Exists but Not Analyzed ── */}
      {activeSession && !isAnalyzed && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Analysis not run yet</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              This investigation has not been analyzed yet. Add documents or website URLs and click "Analyze All Documents" to discover information gaps.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/workspace?session=${activeSession.id}#central-document-upload`)}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Add sources and analyze
          </Button>
        </Card>
      )}

      {/* ── State 3: Analyzed Investigation ── */}
      {activeSession && isAnalyzed && (
        <div className="space-y-6">
          {/* Honest Metric Telemetry Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Total Information Gaps</span>
                <GitBranch className="w-4 h-4 text-teal" />
              </div>
              <span className="text-3xl font-extrabold text-ink font-display">{realFindings.length}</span>
              <p className="text-[11px] text-teal font-medium">Unaddressed Points</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Critical Gaps</span>
                <AlertTriangle className="w-4 h-4 text-coral" />
              </div>
              <span className="text-3xl font-extrabold text-coral font-display">{criticalGapsCount}</span>
              <p className="text-[11px] text-coral font-medium">Severe Evidence Omissions</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">High Priority</span>
                <HelpCircle className="w-4 h-4 text-gold" />
              </div>
              <span className="text-3xl font-extrabold text-gold font-display">{highGapsCount}</span>
              <p className="text-[11px] text-ink-muted">Needs Primary Clarification</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Sources Reviewed</span>
                <FileText className="w-4 h-4 text-success" />
              </div>
              <span className="text-3xl font-extrabold text-success font-display">
                {activeSession.source_count || 0}
              </span>
              <p className="text-[11px] text-success font-medium">Grounding Documents</p>
            </div>
          </div>

          {/* Real Findings Feed */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/8 pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-teal" />
                  Identified Information Gaps ({filteredGaps.length})
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Questions, criteria, and requirements not substantiated by any reviewed source document.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="Search gaps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-ink/10 focus:outline-none focus:ring-1 focus:ring-teal w-44"
                  />
                </div>

                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-xl bg-white border border-ink/10 text-ink focus:outline-none focus:ring-1 focus:ring-teal"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
            </div>

            {/* Gap Cards */}
            {filteredGaps.length > 0 ? (
              <div className="space-y-4">
                {filteredGaps.map((gap) => {
                  const severity = (gap.priority || 'medium').toLowerCase();
                  const isCritical = severity === 'critical';
                  const isHigh = severity === 'high';

                  return (
                    <div
                      key={gap.id}
                      className={`bg-white rounded-2xl p-6 border transition-all duration-200 shadow-sm hover:shadow-card space-y-4 ${
                        isCritical
                          ? 'border-l-4 border-l-coral'
                          : isHigh
                          ? 'border-l-4 border-l-gold'
                          : 'border-l-4 border-l-teal'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/5 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? 'bg-coral/15 text-coral border border-coral/30'
                                : isHigh
                                ? 'bg-gold/15 text-gold-dark border border-gold/30'
                                : 'bg-teal/15 text-teal border border-teal/30'
                            }`}
                          >
                            {severity} priority
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-ivory-200 text-ink-muted">
                            Not found in reviewed sources
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-ink-muted">
                          {gap.dimension_name ? `Dimension: ${gap.dimension_name}` : 'General Inquiry'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-950 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-purple-700 shrink-0" />
                          <span>
                            {gap.title.toLowerCase().includes('renewal')
                              ? 'Numeric renewal marks and attendance thresholds were not found in the reviewed documents.'
                              : 'This critical requirement or metric was not found in any of the reviewed sources.'}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-ink leading-snug">
                          {gap.title}
                        </h4>
                        <p className="text-xs text-ink-secondary leading-relaxed">
                          {gap.description || gap.explanation || 'No detailed explanation provided.'}
                        </p>
                      </div>

                      {/* Missing conditions if available */}
                      {gap.missing_conditions && gap.missing_conditions.length > 0 && (
                        <div className="p-3 rounded-xl bg-ivory-50 border border-ink/8 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal block">
                            Specific Unaddressed Aspects:
                          </span>
                          <ul className="text-xs text-ink-secondary list-disc pl-4 space-y-0.5">
                            {gap.missing_conditions.map((cond: string, idx: number) => (
                              <li key={idx}>{cond}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-2 border-t border-ink/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              gap.resolution_stage === 'VERIFIED_RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : gap.resolution_stage === 'EVIDENCE_RECEIVED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : gap.resolution_stage === 'USER_ACTION_COMPLETED'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {gap.resolution_stage === 'VERIFIED_RESOLVED'
                              ? 'Verified Resolved'
                              : gap.resolution_stage === 'EVIDENCE_RECEIVED'
                              ? 'Evidence Received'
                              : gap.resolution_stage === 'USER_ACTION_COMPLETED'
                              ? 'Action Completed (Pending Supporting Evidence)'
                              : 'Unresolved Information Gap'}
                          </span>
                        </div>

                        <Button
                          variant="outline-teal"
                          size="sm"
                          onClick={() =>
                            navigate(
                              activeSession
                                ? `/resolution?session=${activeSession.id}`
                                : '/resolution'
                            )
                          }
                          iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                          className="text-xs font-semibold"
                        >
                          View Actionable Task
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-white border border-ink/8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                <h4 className="text-sm font-bold text-ink">No Information Gaps Detected</h4>
                <p className="text-xs text-ink-secondary max-w-md mx-auto leading-relaxed">
                  All key questions and target dimensions were addressed by the reviewed sources.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
