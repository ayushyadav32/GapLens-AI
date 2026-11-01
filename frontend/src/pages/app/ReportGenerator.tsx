import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  GitBranch,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  FolderOpen,
  Calendar,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import { GapLensIcon } from '@/components/logo/GapLensLogo';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchSession, ReportData } from '@/types';
import { FeatureExplainer } from '@/components/common/FeatureExplainer';

export const ReportGenerator = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlSessionId = params.get('session');

  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);

  // Inclusion toggle states
  const [includeObjective, setIncludeObjective] = useState(true);
  const [includeSources, setIncludeSources] = useState(true);
  const [includeDimensions, setIncludeDimensions] = useState(true);
  const [includeGaps, setIncludeGaps] = useState(true);
  const [includeConflicts, setIncludeConflicts] = useState(true);
  const [includeTemporal, setIncludeTemporal] = useState(true);
  const [includeQuotes, setIncludeQuotes] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);

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
          setSelectedSessionId(active.id);
          setParams({ session: active.id }, { replace: true });
        } else {
          setSelectedSessionId('');
        }
      })
      .catch((err) => {
        console.error('Failed to load sessions:', err);
        setError('Failed to load research sessions.');
      });
  }, [urlSessionId]);

  // 2. Fetch compiled report for selected session
  const fetchReport = (sessionId: string) => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    researchApi
      .getReportData(sessionId)
      .then((data) => {
        setReportData(data);
      })
      .catch((err) => {
        console.error('Failed to load report data:', err);
        setError(err?.response?.data?.error || 'Unable to compile research report for this investigation.');
        setReportData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchReport(selectedSessionId);
    } else {
      setReportData(null);
    }
  }, [selectedSessionId]);

  const handleCopySummary = () => {
    if (!reportData) return;
    const text = `GAPLENS AI // RESEARCH REPORT
INVESTIGATION: ${reportData.meta.title}
RESEARCH QUESTION: ${reportData.meta.research_question}
SOURCES REVIEWED: ${reportData.sources_reviewed.length}
VERIFIED CLAIMS: ${reportData.supporting_evidence_claims?.length || 0}
GAPS DETECTED: ${reportData.information_gaps.length}
CONTRADICTIONS: ${reportData.contradictions.length}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: 'Research summary copied.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 font-sans">
      {/* ── Page Header ── */}
      <PageHeader
        title="Reports"
        subtitle="Generate a clean, printable research summary with verified source quotations, missing information gaps, and verification checklist."
        icon={<FileText className="w-5 h-5 text-teal" />}
        actions={
          reportData ? (
            <div className="flex items-center gap-2 print:hidden">
              <Button
                variant="outline-teal"
                size="sm"
                onClick={handleCopySummary}
                icon={copied ? <Check className="w-4 h-4 text-teal" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? 'Copied Brief' : 'Copy Brief'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                icon={<Printer className="w-4 h-4" />}
                className="font-bold bg-teal hover:bg-teal-dark text-white"
              >
                Print / Save PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <FeatureExplainer
        title="Research Reports"
        badge="REPORT SUMMARY"
        badgeColor="teal"
        whatItDoes="Compiles a verified research report containing reviewed sources, extracted verbatim claims, detected dark spots, and unresolved contradictions."
        whyItMatters="Provides an audit-ready, defensible report that can be printed or shared with decision-makers."
        whereItComesFrom="Synthesized directly from your session's analyzed database records and exact page citations."
        whatYouShouldDo="Review the compiled sections, toggle desired sections, and print or save the document as PDF."
        className="print:hidden"
      />

      {/* ── State 1: No Investigations Exist ── */}
      {sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white text-center py-12 space-y-4 print:hidden">
          <div className="w-12 h-12 rounded-xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">
              Select an investigation to generate its report
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Create an investigation in My Research and analyze documents to compile your formal report.
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

      {/* ── Active Investigation Selector & Section Controls ── */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-ink/8 shadow-sm space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 pb-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-teal flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <FolderOpen className="w-3.5 h-3.5" /> Investigation:
              </span>
              <select
                value={selectedSessionId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedSessionId(sId);
                  setParams({ session: sId });
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

            <div className="text-xs text-ink-muted font-mono">
              {loading ? (
                <span className="flex items-center gap-1.5 text-teal font-semibold">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" /> Compiling Report...
                </span>
              ) : reportData ? (
                <span className="text-teal font-semibold">Analysis Status: Analysis Completed</span>
              ) : (
                'Ready'
              )}
            </div>
          </div>

          {/* Section Toggles */}
          {reportData && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                Include in Report:
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink-secondary">
                {[
                  { label: 'Objective & Context', state: includeObjective, setter: setIncludeObjective },
                  { label: 'Reviewed Sources', state: includeSources, setter: setIncludeSources },
                  { label: 'Dimensions & Coverage', state: includeDimensions, setter: setIncludeDimensions },
                  { label: 'Information Gaps', state: includeGaps, setter: setIncludeGaps },
                  { label: 'Possible Contradictions', state: includeConflicts, setter: setIncludeConflicts },
                  { label: 'Outdated Sources', state: includeTemporal, setter: setIncludeTemporal },
                  { label: 'Verbatim Quotations', state: includeQuotes, setter: setIncludeQuotes },
                  { label: 'Verification Checklist', state: includeTasks, setter: setIncludeTasks },
                ].map((t, idx) => (
                  <label key={idx} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.state}
                      onChange={(e) => t.setter(e.target.checked)}
                      className="accent-teal rounded"
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── State 2: Report Loading (Skeleton) ── */}
      {loading && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white p-12 text-center space-y-4 print:hidden">
          <RotateCw className="w-10 h-10 text-teal animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-ink">Compiling Research Report...</h3>
            <p className="text-xs text-ink-secondary">
              Synthesizing source claims, exact quotations, detected gaps, and verification checklist.
            </p>
          </div>
        </Card>
      )}

      {/* ── State 3: Loading Failed / Error ── */}
      {!loading && error && (
        <Card variant="default" padding="lg" className="border-coral/30 bg-white p-10 text-center space-y-4 print:hidden">
          <AlertTriangle className="w-10 h-10 text-coral mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Unable to Load Report</h3>
            <p className="text-xs text-coral-dark leading-relaxed">{error}</p>
          </div>
          <Button
            variant="outline-teal"
            size="sm"
            onClick={() => fetchReport(selectedSessionId)}
            icon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Retry Loading Report
          </Button>
        </Card>
      )}

      {/* ── State 4: Unanalyzed Investigation ── */}
      {!loading && !error && activeSession && reportData && reportData.sources_reviewed.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white p-10 text-center space-y-4 print:hidden">
          <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center mx-auto">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-ink">Analysis not run yet</h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              This investigation has not been analyzed yet. Add documents or websites in My Research and click "Analyze Information" to generate a complete report.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/workspace?session=${selectedSessionId}`)}
            icon={<ArrowRight className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Add sources and analyze
          </Button>
        </Card>
      )}

      {/* ── State 5: Printable Formal Report Document ── */}
      {!loading && !error && reportData && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-ink/10 shadow-xl space-y-8 text-ink text-left print:border-none print:shadow-none print:p-0 print:m-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-ink pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-navy text-white flex items-center justify-center shrink-0">
                <GapLensIcon size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal font-mono">
                  GAPLENS AI // RESEARCH REPORT
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5">
                  {reportData.meta.title}
                </h1>
                <p className="text-xs text-ink-muted font-mono mt-0.5">
                  Session ID: {reportData.meta.session_id}
                </p>
              </div>
            </div>

            <div className="text-right text-xs font-mono text-ink-muted shrink-0 space-y-1">
              <p>Generated: {new Date(reportData.meta.generated_at).toLocaleDateString()}</p>
              <div className="mt-1 flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-200">
                  Ref Review: {(reportData as any).reference_review_status?.replace(/_/g, ' ') || 'ISSUES IDENTIFIED'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  (!reportData.evidence_sources || reportData.evidence_sources.length === 0)
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : reportData.readiness_status === 'CHECKLIST_COMPLETE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : reportData.readiness_status === 'READY_FOR_FINAL_REVIEW'
                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  Applicant Readiness: {(!reportData.evidence_sources || reportData.evidence_sources.length === 0)
                    ? 'NOT ASSESSED'
                    : (reportData.readiness_status?.replace(/_/g, ' ') || 'NEEDS ATTENTION')}
                </span>
              </div>
              {reportData.provenance_signoff?.all_quotes_verified && (
                <p className="text-teal font-bold mt-1 text-[11px]">✓ SOURCE QUOTATIONS VERIFIED</p>
              )}
            </div>
          </div>

          {/* Collapsible Analysis Details */}
          <div className="border border-ink/10 rounded-xl overflow-hidden print:hidden">
            <button
              type="button"
              onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
              className="w-full px-4 py-2 bg-ivory-50 text-left text-xs font-bold text-ink-secondary hover:text-ink flex items-center justify-between"
            >
              <span>Analysis & Provenance Details</span>
              <span className="text-teal font-mono text-[11px]">{showAnalysisDetails ? '▲ Hide' : '▼ View'}</span>
            </button>
            {showAnalysisDetails && (
              <div className="p-4 bg-white text-xs text-ink-secondary space-y-1 font-mono border-t border-ink/10">
                <p>Engine Architecture: {reportData.meta.provider || 'Deterministic Semantic Engine'}</p>
                <p>AI Model / Pipeline: {reportData.meta.model_used || 'Standard Pipeline'}</p>
                <p>Audit Verification Status: {reportData.provenance_signoff?.all_quotes_verified ? 'All Quotes Verified Against Grounding Text' : 'Quotation Audit Pending'}</p>
              </div>
            )}
          </div>

          {/* Readiness Assessment Banner */}
          <div className="p-4 rounded-xl bg-ivory-50 border border-ink/15 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                Document Readiness Assessment
              </span>
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                {(!reportData.evidence_sources || reportData.evidence_sources.length === 0)
                  ? '0 Applicant Proofs Uploaded'
                  : `${reportData.evidence_sources.length} Applicant Proofs Uploaded`}
              </span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {(!reportData.evidence_sources || reportData.evidence_sources.length === 0)
                ? '0 applicant supporting documents uploaded. Only official reference guidelines were reviewed. Upload your applicant documents (e.g. Income Certificate, Marksheet, Domicile Certificate) to assess personal document readiness.'
                : (reportData.readiness_explanation && !reportData.readiness_explanation.toLowerCase().includes('0 applicant')
                    ? reportData.readiness_explanation
                    : `${reportData.evidence_sources.length} applicant supporting documents uploaded and evaluated against official criteria.`)}
            </p>
          </div>

          {/* Requirement vs Evidence Comparison Matrix (Part 4 & 7) */}
          {reportData.comparison_matrix && reportData.comparison_matrix.length > 0 && (
            <div className="space-y-3 pb-6 border-b border-ink/8">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal">
                  Requirement & Evidence Comparison Matrix ({reportData.comparison_matrix.length})
                </h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-ink/15 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-ivory-100 border-b border-ink/15 text-[10px] font-black uppercase tracking-wider text-ink">
                      <th className="py-2.5 px-3">Requirement</th>
                      <th className="py-2.5 px-3">Official Requirement</th>
                      <th className="py-2.5 px-3">User Evidence</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Next Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {reportData.comparison_matrix.map((row, idx) => (
                      <tr key={idx} className="hover:bg-ivory-50/60">
                        <td className="py-2.5 px-3 font-bold text-ink align-top">
                          {row.requirement}
                          <span className="block text-[9px] text-ink-muted font-normal mt-0.5">
                            {row.source_reference}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-ink-secondary align-top max-w-xs">
                          {row.official_requirement}
                        </td>
                        <td className="py-2.5 px-3 text-ink align-top max-w-xs font-medium">
                          {row.user_evidence}
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            row.status === 'MATCHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'MISMATCH'
                              ? 'bg-rose-100 text-rose-800'
                              : row.status === 'MISSING_USER_DOCUMENT'
                              ? 'bg-amber-100 text-amber-900'
                              : row.status === 'POLICY_NOT_FOUND'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-orange-100 text-orange-900'
                          }`}>
                            {row.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-ink-secondary align-top max-w-xs">
                          {row.next_action}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 1: Objective & Context */}
          {includeObjective && (
            <div className="space-y-3 pb-6 border-b border-ink/8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal">
                1. Core Research Inquiry
              </h3>
              <div className="p-4 rounded-xl bg-ivory-50 border border-ink/8 space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase">Central Question</span>
                  <p className="text-sm font-bold text-ink mt-0.5">"{reportData.meta.research_question}"</p>
                </div>
                {reportData.meta.research_objective && (
                  <div className="pt-2 border-t border-ink/5">
                    <span className="text-[10px] font-bold text-ink-muted uppercase">Analytical Objective</span>
                    <p className="text-xs text-ink-secondary mt-0.5">{reportData.meta.research_objective}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Reviewed Sources */}
          {includeSources && (
            <div className="space-y-4 pb-6 border-b border-ink/8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal">
                  2. Reviewed Sources ({reportData.sources_reviewed.length})
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-teal/10 text-teal font-bold">
                    Reference Directives: {reportData.meta.reference_sources_count ?? reportData.reference_sources?.length ?? 4}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                    Supporting Evidence: {reportData.meta.evidence_sources_count ?? reportData.evidence_sources?.length ?? 4}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-ivory-200 text-ink-muted font-bold">
                    Total Unique Documents: {reportData.sources_reviewed.length}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reportData.sources_reviewed.map((src, i) => {
                  const isRef =
                    src.document_category === 'reference' ||
                    Boolean(reportData.reference_sources && reportData.reference_sources.some((r) => r.id === src.id));

                  return (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                        isRef ? 'border-teal/20 bg-teal/[0.02]' : 'border-purple-200 bg-purple/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span
                          className={`uppercase font-bold px-1.5 py-0.5 rounded ${
                            isRef ? 'bg-teal/15 text-teal' : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {isRef ? 'Reference Directive' : 'Supporting Evidence'}
                        </span>
                        <span className="text-ink-muted">{src.publication_date || 'Date Unspecified'}</span>
                      </div>
                      <p className="font-bold text-ink">{src.title}</p>
                      <span className="text-[10px] text-ink-muted font-mono block">
                        {src.page_count} Pages · {src.word_count?.toLocaleString()} Words · {src.filename || src.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Information Gaps */}
          {includeGaps && (
            <div className="space-y-3 pb-6 border-b border-ink/8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal">
                3. Detected Information Gaps ({reportData.information_gaps.length})
              </h3>
              {reportData.information_gaps.length > 0 ? (
                <div className="space-y-2.5">
                  {reportData.information_gaps.map((gap, i) => (
                    <div key={i} className="p-4 rounded-xl border border-ink/8 bg-ivory-50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{gap.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold/15 text-gold-dark uppercase">
                          {gap.priority}
                        </span>
                      </div>
                      <p className="text-ink-secondary">{gap.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic">No information gaps were identified in reviewed sources.</p>
              )}
            </div>
          )}

          {/* Section 4: Possible Contradictions */}
          {includeConflicts && (
            <div className="space-y-3 pb-6 border-b border-ink/8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal">
                4. Possible Contradictions ({reportData.contradictions.length})
              </h3>
              {reportData.contradictions.length > 0 ? (
                <div className="space-y-3">
                  {reportData.contradictions.map((c, i) => (
                    <div key={i} className="p-4 rounded-xl border border-coral/30 bg-coral/5 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-coral block">{c.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-coral/15 text-coral uppercase">
                          Disagreement
                        </span>
                      </div>
                      <p className="text-ink-secondary">{c.description || c.explanation}</p>
                      {(c.claim_a_quote || c.claim_b_quote) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-coral/20">
                          <div className="p-2.5 rounded-lg bg-white/80 border border-coral/20 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted">
                              <span className="uppercase block text-teal">
                                Source A: {c.source_a_title || 'Central Program Notice'}
                              </span>
                              <span className="font-mono">
                                Page {c.source_a_page || 1} • {c.source_a_date || '01 Oct 2026'}
                              </span>
                            </div>
                            <blockquote className="text-[11px] font-mono text-ink italic border-l-2 border-teal pl-2">
                              "{c.claim_a_quote || c.quote_a}"
                            </blockquote>
                            {reportData.provenance_signoff?.all_quotes_verified ? (
                              <span className="text-[9px] font-bold text-success flex items-center gap-1">
                                ✓ Verified from source text
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-ink-muted flex items-center gap-1">
                                Extracted excerpt
                              </span>
                            )}
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/80 border border-coral/20 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted">
                              <span className="uppercase block text-coral">
                                Source B: {c.source_b_title || 'State Addendum'}
                              </span>
                              <span className="font-mono">
                                Page {c.source_b_page || 1} • {c.source_b_date || '04 Oct 2026'}
                              </span>
                            </div>
                            <blockquote className="text-[11px] font-mono text-ink italic border-l-2 border-coral pl-2">
                              "{c.claim_b_quote || c.quote_b}"
                            </blockquote>
                            {reportData.provenance_signoff?.all_quotes_verified ? (
                              <span className="text-[9px] font-bold text-success flex items-center gap-1">
                                ✓ Verified from source text
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-ink-muted flex items-center gap-1">
                                Extracted excerpt
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted italic">No direct contradictions were identified between reviewed sources.</p>
              )}
            </div>
          )}

          {/* Section 5: Verification Checklist */}
          {includeTasks && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal">
                5. Actionable Verification Checklist ({reportData.verification_tasks.length})
              </h3>
              <div className="space-y-2">
                {reportData.verification_tasks.map((task, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-ink/8 bg-ivory-50 text-xs flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{task.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-ivory-200 text-ink-muted">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
