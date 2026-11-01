import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  FileText,
  Globe,
  Calendar,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Scale,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession, ResearchFinding } from '@/types';
import { SourcePreviewDrawer } from '@/components/research/SourcePreviewDrawer';
import { useToast } from '@/context/ToastContext';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

interface ContradictionItem {
  id: string;
  title: string;
  conciseTitle: string;
  conflictType: 'numerical' | 'procedural' | 'temporal';
  conflictTypeLabel: string;
  claimA: {
    sourceId?: string;
    sourceTitle: string;
    sourceType: 'pdf' | 'url' | 'manual';
    authority: string;
    date: string;
    assertion: string;
    quote: string;
    ref: string;
  };
  claimB: {
    sourceId?: string;
    sourceTitle: string;
    sourceType: 'pdf' | 'url' | 'manual';
    authority: string;
    date: string;
    assertion: string;
    quote: string;
    ref: string;
  };
  rootCause: string;
  reconciliationStep: string;
  disposition?: string;
  status?: string;
  resolution_notes?: string;
  rawFinding?: any;
}

export const ContradictionMap = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlSessionId = params.get('session');
  const { toast } = useToast();

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [realContradictions, setRealContradictions] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Source drawer preview
  const [inspectSourceId, setInspectSourceId] = useState<string | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | undefined>(undefined);

  // 1. Fetch personal sessions
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

  // 2. Fetch real contradictions for active session
  useEffect(() => {
    if (!activeSession) {
      setRealContradictions([]);
      return;
    }

    researchApi
      .getFindings(activeSession.id, { type: 'contradiction' })
      .then((res) => {
        const found = res.results || [];
        setRealContradictions(found);
        if (found.length > 0) {
          setActiveId(found[0].id);
        } else {
          setActiveId('');
        }
      })
      .catch((err) => {
        console.error('Failed to load contradictions:', err);
        setRealContradictions([]);
      });
  }, [activeSession]);

  const isAnalyzed = Boolean(activeSession && (activeSession.dimension_count || 0) > 0);

  // Map real findings
  const getConciseTitle = (title: string, exp: string) => {
    const t = (title || '').toLowerCase();
    const e = (exp || '').toLowerCase();
    if (t.includes('income') || e.includes('income')) {
      return 'Different Income Limits';
    }
    if (t.includes('deadline') || t.includes('date') || e.includes('deadline') || e.includes('submission')) {
      return 'Different Application Deadlines';
    }
    return title ? title.replace(/^Contradiction:\s*/i, '') : 'Source Conflict';
  };

  const items: ContradictionItem[] = realContradictions.map((f: any) => ({
    id: f.id,
    title: f.title,
    conciseTitle: getConciseTitle(f.title, f.explanation || f.description || ''),
    conflictType: f.conflict_type || 'numerical',
    conflictTypeLabel:
      f.conflict_type === 'numerical'
        ? 'Direct Numerical Discrepancy'
        : f.conflict_type === 'temporal'
        ? 'Temporal Validity Discrepancy'
        : 'Procedural Rule Conflict',
    claimA: {
      sourceId: f.source_a_id,
      sourceTitle: f.source_a_title || (f.sources_checked && f.sources_checked[0]) || 'Central Program Notice (AY 2026-27)',
      sourceType: 'pdf',
      authority: f.source_a_filename ? `File: ${f.source_a_filename}` : (f.source_a_title || 'Central Issuing Authority'),
      date: f.source_a_date || '01 October 2026',
      assertion: f.claim_a_assertion || f.title,
      quote: f.claim_a_quote || f.quote_a || f.verbatim_quote || '',
      ref: f.source_a_page ? `Page ${f.source_a_page} • Section 1` : 'Page 1',
    },
    claimB: {
      sourceId: f.source_b_id,
      sourceTitle: f.source_b_title || (f.sources_checked && f.sources_checked[1]) || 'State Addendum (AY 2026-27)',
      sourceType: 'pdf',
      authority: f.source_b_filename ? `File: ${f.source_b_filename}` : (f.source_b_title || 'State Education Directorate'),
      date: f.source_b_date || '04 October 2026',
      assertion: f.claim_b_assertion || f.opposing_assertion || 'Opposing statutory rule.',
      quote: f.claim_b_quote || f.quote_b || f.opposing_quote || '',
      ref: f.source_b_page ? `Page ${f.source_b_page} • Section 1` : 'Page 1',
    },
    rootCause:
      f.description ||
      f.explanation ||
      'Opposing guidelines issue contradictory requirements for this criterion.',
    reconciliationStep:
      f.reconciliation_step ||
      f.recommended_action ||
      'Confirm with the governing authority which directive takes legal precedence.',
    disposition: f.disposition,
    status: f.status || 'pending',
    rawFinding: f,
  }));

  const activeConflict = items.find((c) => c.id === activeId) || items[0];

  const handleUpdateDisposition = async (newDisposition: string) => {
    if (!activeConflict) return;
    try {
      await researchApi.resolveFinding(activeConflict.id, {
        disposition: newDisposition,
        status: newDisposition === 'undecided' ? 'pending' : 'resolved',
      });
      setRealContradictions((prev) =>
        prev.map((f) => (f.id === activeConflict.id ? { ...f, disposition: newDisposition as any } : f))
      );
      toast({
        type: 'success',
        title: 'Disposition Saved',
        message: `Ruling set to ${newDisposition.replace(/_/g, ' ').toUpperCase()}.`,
      });
    } catch (err) {
      console.error('Failed to update disposition:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Page Header ── */}
      <PageHeader
        title="Source Conflicts"
        subtitle="Side-by-side comparison of differing statements, conflicting numbers, and policy disagreements between reviewed sources."
        icon={<Zap className="w-5 h-5 text-coral" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/resolution')}
            iconRight={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Go to Verification Tasks
          </Button>
        }
      />

      <FeatureExplainer
        title="Source Conflicts & Discrepancies"
        badge="POSSIBLE CONFLICTS"
        badgeColor="coral"
        whatItDoes="Detects direct numerical, policy, or procedural disagreements where two reviewed sources give conflicting information about the same requirement."
        whyItMatters="Following conflicting guidelines can lead to rejected submissions or non-compliance. We present statements side-by-side with exact quotations."
        whereItComesFrom="Cross-comparison between extracted claims with matching subjects and opposing attributes."
        whatYouShouldDo="Review both statements, check publication dates, determine which authority applies to your case, and record an adjudication disposition."
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
              {isAnalyzed ? `${items.length} Conflicts Detected` : 'Draft — Not Analyzed'}
            </span>
          </div>
        </div>
      )}

      {/* ── State 1: No Investigations Exist ── */}
      {sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">No analyzed investigation selected</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Select or create an investigation in My Research and upload multiple sources to compare conflicting claims.
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
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Analysis not run yet</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Add two or more documents or links to this investigation and run analysis to cross-examine conflicting statements.
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

      {/* ── State 3: Analyzed Investigation with Zero Conflicts ── */}
      {activeSession && isAnalyzed && items.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">
              No possible conflicts were detected in the reviewed sources
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              All reviewed sources agree on key figures, conditions, and procedures. No opposing claims were identified.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline-teal"
              size="sm"
              onClick={() => navigate(`/workspace?session=${activeSession.id}`)}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs font-semibold"
            >
              Add More Sources
            </Button>
          </div>
        </Card>
      )}

      {/* ── State 4: Analyzed Investigation with Real Conflicts ── */}
      {activeSession && isAnalyzed && items.length > 0 && activeConflict && (
        <div className="space-y-6">
          {/* Conflict Switcher Tabs if multiple */}
          {items.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {items.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                    activeConflict.id === c.id
                      ? 'bg-coral text-white border-coral shadow-sm'
                      : 'bg-white text-ink-secondary hover:bg-ivory-100 border-ink/10'
                  }`}
                >
                  Conflict #{idx + 1}: {c.conciseTitle}
                </button>
              ))}
            </div>
          )}

          {/* Heading */}
          <div className="bg-white rounded-2xl p-5 border border-coral/30 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-coral/15 text-coral font-mono border border-coral/30">
                {activeConflict.conflictTypeLabel}
              </span>
              <span className="text-xs text-ink-muted">
                Status: <strong className="text-ink">{activeConflict.status}</strong>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-ink">
              {activeConflict.conciseTitle}
            </h3>
            <p className="text-xs text-ink-secondary">
              {activeConflict.title}
            </p>
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Claim A */}
            <div className="bg-white rounded-2xl p-6 border-2 border-teal/40 shadow-sm flex flex-col justify-between space-y-4 text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-ink/8 pb-2.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
                    STATEMENT A
                  </span>
                  <span className="text-xs text-ink-muted font-mono">{activeConflict.claimA.date}</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-teal uppercase tracking-wider block">
                    Source Document:
                  </span>
                  <h4 className="text-sm font-bold text-ink mt-0.5">
                    {activeConflict.claimA.sourceTitle}
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">{activeConflict.claimA.authority}</p>
                </div>

                <div className="p-4 rounded-xl bg-teal/5 border border-teal/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal block">
                    Verbatim Quotation:
                  </span>
                  <p className="text-xs text-ink font-medium leading-relaxed italic">
                    "{activeConflict.claimA.quote}"
                  </p>
                  <span className="text-[10px] font-mono text-ink-muted block mt-1">
                    {activeConflict.claimA.ref}
                  </span>
                </div>
              </div>

              {activeConflict.claimA.sourceId && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectSourceId(activeConflict.claimA.sourceId!);
                    setHighlightQuote(activeConflict.claimA.quote);
                  }}
                  className="text-xs font-bold text-teal hover:underline flex items-center gap-1 pt-2 border-t border-ink/5"
                >
                  <Eye className="w-3.5 h-3.5" /> View Original Text Excerpt
                </button>
              )}
            </div>

            {/* Claim B */}
            <div className="bg-white rounded-2xl p-6 border-2 border-coral/40 shadow-sm flex flex-col justify-between space-y-4 text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-ink/8 pb-2.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-coral text-white font-mono">
                    STATEMENT B
                  </span>
                  <span className="text-xs text-ink-muted font-mono">{activeConflict.claimB.date}</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-coral uppercase tracking-wider block">
                    Source Document:
                  </span>
                  <h4 className="text-sm font-bold text-ink mt-0.5">
                    {activeConflict.claimB.sourceTitle}
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">{activeConflict.claimB.authority}</p>
                </div>

                <div className="p-4 rounded-xl bg-coral/5 border border-coral/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-coral block">
                    Verbatim Quotation:
                  </span>
                  <p className="text-xs text-ink font-medium leading-relaxed italic">
                    "{activeConflict.claimB.quote}"
                  </p>
                  <span className="text-[10px] font-mono text-ink-muted block mt-1">
                    {activeConflict.claimB.ref}
                  </span>
                </div>
              </div>

              {activeConflict.claimB.sourceId && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectSourceId(activeConflict.claimB.sourceId!);
                    setHighlightQuote(activeConflict.claimB.quote);
                  }}
                  className="text-xs font-bold text-coral hover:underline flex items-center gap-1 pt-2 border-t border-ink/5"
                >
                  <Eye className="w-3.5 h-3.5" /> View Original Text Excerpt
                </button>
              )}
            </div>
          </div>

          {/* Root Cause & Recommended Action */}
          <div className="bg-white rounded-2xl p-6 border border-ink/8 shadow-sm space-y-4">
            <div className="space-y-1 border-b border-ink/8 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal">
                Why do these sources disagree?
              </span>
              <p className="text-sm text-ink-secondary leading-relaxed mt-1">
                {activeConflict.rootCause}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-ivory-50 border border-ink/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-teal block">
                  Recommended Verification Action:
                </span>
                <p className="text-xs text-ink mt-0.5">{activeConflict.reconciliationStep}</p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/resolution')}
                iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                className="bg-teal hover:bg-teal-dark text-white text-xs font-bold shrink-0"
              >
                Go to Verification Tasks
              </Button>
            </div>

            {/* Formal Adjudication Disposition */}
            <div className="pt-2 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink block">
                Assign Precedence Ruling / Disposition:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { key: 'source_a_takes_precedence', label: 'Source A Prevails' },
                  { key: 'source_b_takes_precedence', label: 'Source B Prevails' },
                  { key: 'dual_applicability', label: 'Dual Jurisdiction Applies' },
                  { key: 'undecided', label: 'Keep Open / Unverified' },
                ].map((disp) => (
                  <button
                    key={disp.key}
                    type="button"
                    onClick={() => handleUpdateDisposition(disp.key)}
                    className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                      activeConflict.disposition === disp.key
                        ? 'bg-teal text-white border-teal shadow-sm'
                        : 'bg-ivory-100 text-ink-secondary border-ink/10 hover:bg-ivory-200'
                    }`}
                  >
                    {disp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Preview Drawer for Quotation Inspection */}
      <SourcePreviewDrawer
        sourceId={inspectSourceId}
        highlightQuote={highlightQuote}
        onClose={() => {
          setInspectSourceId(null);
          setHighlightQuote(undefined);
        }}
      />
    </div>
  );
};
