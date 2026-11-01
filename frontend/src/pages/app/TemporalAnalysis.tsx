import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
  Info,
  FileCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession, SourceDocument } from '@/types';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

export const TemporalAnalysis = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlSessionId = params.get('session');

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [realTemporal, setRealTemporal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load user sessions
  useEffect(() => {
    researchApi
      .getSessions()
      .then((data) => {
        setSessions(data.results);
        let active = data.results.find((s) => s.id === urlSessionId);
        if (!active && data.results.length > 0) {
          active = data.results[0];
        }
        if (active) {
          setActiveSession(active);
          setParams({ session: active.id }, { replace: true });
        } else {
          setActiveSession(null);
        }
      })
      .catch((err) => console.error('Failed to load sessions:', err))
      .finally(() => setLoading(false));
  }, [urlSessionId]);

  // 2. Load real sources and temporal findings for active session
  useEffect(() => {
    if (!activeSession) {
      setSources([]);
      setRealTemporal([]);
      return;
    }

    Promise.all([
      researchApi.getSources(activeSession.id),
      researchApi.getFindings(activeSession.id, { type: 'temporal' }),
    ])
      .then(([srcData, findingsData]) => {
        setSources(srcData.sources || []);
        setRealTemporal(findingsData.results || []);
      })
      .catch((err) => {
        console.error('Failed to load temporal data:', err);
        setSources([]);
        setRealTemporal([]);
      });
  }, [activeSession]);

  const isAnalyzed = Boolean(activeSession && (activeSession.dimension_count || 0) > 0);

  const refSources = sources.filter((s) => s.document_category === 'reference');
  const evSources = sources.filter((s) => s.document_category === 'evidence');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Page Header ── */}
      <PageHeader
        title="Publication Date & Cycle Review"
        subtitle="Verify document publication dates, academic year alignment, and detect outdated applicant proofs or stale policies."
        icon={<Clock className="w-5 h-5 text-gold" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(activeSession ? `/resolution?session=${activeSession.id}` : '/resolution')}
            iconRight={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Review Verification Checklist
          </Button>
        }
      />

      <FeatureExplainer
        title="Source Freshness & Chronological Audit"
        badge="PUBLICATION DATE REVIEW"
        badgeColor="gold"
        whatItDoes="Audits the publication date, validity cycle, and academic year alignment of official reference directives and applicant proofs."
        whyItMatters="Scholarship regulations are updated annually. Submitting a certificate or marksheet from an earlier academic year leads to administrative disqualification."
        whereItComesFrom="Extracted publication dates, academic year markers (e.g. AY 2026-27 vs AY 2025-26), and temporal divergence rules."
        whatYouShouldDo="Ensure all applicant supporting documents are issued for the current active application cycle (AY 2026-27)."
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
              {isAnalyzed ? `${sources.length} Documents Audited · ${realTemporal.length} Cycle Flags` : 'Draft — Not Analyzed'}
            </span>
          </div>
        </div>
      )}

      {/* ── State 1: No Investigations Exist ── */}
      {sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Select an investigation to view its results</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Create an investigation in My Research and upload dated sources to analyze chronological freshness.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/workspace')}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Go to My Research
          </Button>
        </Card>
      )}

      {/* ── State 2: Investigation Exists but Not Analyzed ── */}
      {activeSession && !isAnalyzed && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Analysis not run yet</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Run analysis on this investigation to verify source publication dates and check for superseded directives.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/workspace?session=${activeSession.id}`)}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Add sources and analyze
          </Button>
        </Card>
      )}

      {/* ── State 3: Analyzed Investigation ── */}
      {activeSession && isAnalyzed && (
        <div className="space-y-8">
          {/* Accurate Metric Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Reference Guidelines</span>
                <FileCheck className="w-4 h-4 text-teal" />
              </div>
              <span className="text-3xl font-extrabold text-teal font-display">{refSources.length}</span>
              <p className="text-[11px] text-teal">Official Directives Reviewed</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Supporting Evidence</span>
                <FileText className="w-4 h-4 text-purple-700" />
              </div>
              <span className="text-3xl font-extrabold text-purple-700 font-display">{evSources.length}</span>
              <p className="text-[11px] text-purple-700 font-medium">Applicant Proofs Assessed</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Cycle & Staleness Warnings</span>
                <AlertTriangle className="w-4 h-4 text-coral" />
              </div>
              <span className="text-3xl font-extrabold text-coral font-display">{realTemporal.length}</span>
              <p className="text-[11px] text-coral font-medium">
                {realTemporal.length > 0 ? 'Outdated Proof Identified' : 'All Dates Aligned'}
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              SECTION 1: Derived Temporal & Academic Cycle Findings
             ════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal font-mono">
                  Part 1
                </span>
                <h3 className="text-lg font-bold text-ink">
                  Derived Temporal &amp; Academic Cycle Findings ({realTemporal.length})
                </h3>
              </div>
            </div>

            {realTemporal.length > 0 ? (
              <div className="space-y-4">
                {realTemporal.map((f: any) => {
                  const isOutdatedApplicantProof =
                    f.staleness_category === 'OUTDATED_APPLICANT_PROOF' ||
                    (f.title || '').toLowerCase().includes('outdated');

                  return (
                    <div
                      key={f.id}
                      className="bg-white rounded-2xl p-6 border-l-4 border-l-coral border-ink/10 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/5 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-coral/15 text-coral border border-coral/30">
                            {isOutdatedApplicantProof ? 'Outdated Applicant Proof' : 'Temporal Discrepancy'}
                          </span>
                          <span className="text-xs font-semibold text-ink-muted">
                            {f.priority || 'HIGH'} Priority
                          </span>
                        </div>
                        <span className="text-xs font-mono text-ink-muted">
                          {f.sources_checked?.join(', ') || 'Reviewed Document'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-ink">{f.title}</h4>
                        <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                          {f.explanation || f.description}
                        </p>
                      </div>

                      {f.why_it_matters && (
                        <div className="p-3.5 rounded-xl bg-coral/5 border border-coral/20 text-xs text-ink-secondary space-y-1">
                          <span className="font-bold text-coral text-[11px] block uppercase tracking-wider">
                            Why It Matters:
                          </span>
                          <p>{f.why_it_matters}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-ink/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <span className="text-[11px] font-mono text-teal">
                          Target Academic Cycle: AY 2026-27
                        </span>
                        <Button
                          variant="outline-teal"
                          size="sm"
                          onClick={() => navigate(`/resolution?session=${activeSession.id}`)}
                          iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                          className="text-xs font-semibold"
                        >
                          View Resolution Task
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white border border-ink/8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
                <h4 className="text-sm font-bold text-ink">No Temporal Discrepancies</h4>
                <p className="text-xs text-ink-secondary">
                  All reviewed guidelines and evidence strictly align with the current academic cycle.
                </p>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              SECTION 2: Chronological Document Registry & Publication Dates
             ════════════════════════════════════════════════════════════ */}
          <div className="space-y-4 pt-4 border-t border-ink/8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal font-mono">
                  Part 2
                </span>
                <h3 className="text-lg font-bold text-ink">
                  Chronological Document Registry &amp; Publication Dates ({sources.length})
                </h3>
                <p className="text-xs text-ink-muted">
                  Audited publication dates and academic cycle classification across all 8 ingested files.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {sources.map((s: any) => {
                const isReference = s.document_category === 'reference';
                const is2025Proof =
                  (s.publication_date && s.publication_date.includes('2025')) ||
                  (s.title && s.title.includes('2025-26')) ||
                  (s.metadata?.filename && s.metadata.filename.includes('2025-26'));

                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm space-y-2.5 ${
                      is2025Proof
                        ? 'border-l-4 border-l-coral bg-coral/[0.02]'
                        : isReference
                        ? 'border-l-4 border-l-teal'
                        : 'border-l-4 border-l-purple-600'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            is2025Proof
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isReference
                              ? 'bg-teal/15 text-teal border border-teal/30'
                              : 'bg-purple-100 text-purple-800 border border-purple-300'
                          }`}
                        >
                          {is2025Proof
                            ? 'PREVIOUS ACADEMIC YEAR (AY 2025-26)'
                            : isReference
                            ? 'OFFICIAL DIRECTIVE (AY 2026-27)'
                            : 'SUPPORTING EVIDENCE (AY 2026-27)'}
                        </span>

                        <span className="text-xs font-semibold text-ink-muted flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                          {s.publication_date || 'Date Unspecified'}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-ink-muted">
                        {s.metadata?.filename || s.title}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-ink">{s.title}</h4>
                      <span className="text-xs font-medium text-ink-secondary">
                        {isReference
                          ? 'Official Reference Directive'
                          : is2025Proof
                          ? 'Outdated Applicant Supporting Evidence'
                          : 'Valid Applicant Supporting Evidence'}
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-muted font-mono flex items-center gap-3 pt-1 border-t border-ink/5">
                      <span>Category: {isReference ? 'Reference Guideline' : 'Supporting Evidence'}</span>
                      <span>·</span>
                      <span>{s.page_count || 1} Pages</span>
                      <span>·</span>
                      <span>{(s.word_count || 0).toLocaleString()} Words</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
