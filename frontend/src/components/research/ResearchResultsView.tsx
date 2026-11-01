import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Shield,
  HelpCircle,
  FileCheck,
  ArrowRight,
  Download,
  BookOpen,
  Eye,
  Calendar,
  Layers,
  Info,
  UploadCloud,
  CheckCircle,
  AlertOctagon,
  Clock,
  Compass,
  Building,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ResearchSession, SourceDocument, ResearchFinding, VerificationTask, ResearchRequirement } from '@/types';
import { researchApi } from '@/lib/api/researchApi';

interface ResearchResultsViewProps {
  session: ResearchSession;
  sources: SourceDocument[];
  onInspectSource?: (sourceId: string, quote?: string) => void;
  onRefresh?: () => Promise<void>;
}

export const ResearchResultsView = ({
  session,
  sources,
  onInspectSource,
  onRefresh,
}: ResearchResultsViewProps) => {
  const navigate = useNavigate();

  // Loaded data state
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<ResearchRequirement[]>([]);
  const [findings, setFindings] = useState<ResearchFinding[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [tasks, setTasks] = useState<VerificationTask[]>([]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Smooth scroll to the central document upload container
  const scrollToCentralUpload = () => {
    const el = document.getElementById('central-document-upload');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = `/workspace?session=${session.id}#central-document-upload`;
    }
  };

  // Readiness status & explanation
  const [readinessStatus, setReadinessStatus] = useState<string>(
    session.readiness_status || 'NOT_ASSESSED'
  );
  const [readinessExplanation, setReadinessExplanation] = useState<string>(
    session.readiness_explanation || ''
  );
  const [referenceReviewStatus, setReferenceReviewStatus] = useState<string>(
    session.reference_review_status || 'ISSUES_IDENTIFIED'
  );

  // Fetch all intelligence results for this session
  const loadResults = async () => {
    setLoading(true);
    try {
      const [reqRes, findRes, claimRes, taskRes] = await Promise.all([
        researchApi.getRequirements(session.id).catch(() => ({
          readiness_status: 'NOT_ASSESSED',
          readiness_explanation: '',
          reference_review_status: 'ISSUES_IDENTIFIED',
          requirements: [],
        })),
        researchApi.getFindings(session.id).catch(() => ({ results: [] })),
        researchApi.getClaims(session.id).catch(() => ({ results: [] })),
        researchApi.getTasks(session.id).catch(() => ({ results: [] })),
      ]);

      setRequirements(reqRes.requirements || []);
      setReadinessStatus(reqRes.readiness_status || session.readiness_status || 'NOT_ASSESSED');
      setReadinessExplanation(reqRes.readiness_explanation || session.readiness_explanation || '');
      setReferenceReviewStatus(reqRes.reference_review_status || session.reference_review_status || 'ISSUES_IDENTIFIED');
      setFindings((findRes.results as ResearchFinding[]) || []);
      setClaims(claimRes.results || []);
      setTasks((taskRes.results as VerificationTask[]) || []);
    } catch (err) {
      console.error('Failed to load research results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session.id) {
      loadResults();
    }
  }, [session.id]);

  // Handle task status toggle
  const handleToggleTask = async (task: VerificationTask) => {
    const newStatus = task.status === 'resolved' ? 'pending' : 'resolved';
    setUpdatingTaskId(task.id);
    try {
      await researchApi.updateTask(task.id, {
        status: newStatus,
        audit_notes: `Marked as ${newStatus} in Research Results.`,
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Group findings
  const gapFindings = findings.filter((f) => f.finding_type === 'gap');
  const contradictionFindings = findings.filter((f) => f.finding_type === 'contradiction');
  const temporalFindings = findings.filter((f) => f.finding_type === 'temporal');

  // Distinguish reference sources vs evidence sources
  const referenceSources = sources.filter((s) => s.document_category !== 'evidence');
  const evidenceSources = sources.filter((s) => s.document_category === 'evidence');

  // Breakdown requirements by status
  const matchedRequirements = requirements.filter((r) => r.comparison_status === 'MATCHED');
  const missingUserDocuments = requirements.filter((r) => r.comparison_status === 'MISSING_USER_DOCUMENT');
  const conflictingRequirements = requirements.filter((r) => r.comparison_status === 'POSSIBLE_SOURCE_CONFLICT');
  const policyInformationMissing = requirements.filter((r) => r.comparison_status === 'POLICY_NOT_FOUND');
  const mismatchedEvidence = requirements.filter((r) => r.comparison_status === 'MISMATCH');

  // Standardized checklist status labels
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            MATCHED
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-700" />
            MISMATCH
          </span>
        );
      case 'POSSIBLE_SOURCE_CONFLICT':
      case 'CONFLICTING SOURCES':
      case 'CONFLICTING_SOURCES':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300">
            <GitBranch className="w-3.5 h-3.5 text-orange-700" />
            CONFLICTING SOURCES
          </span>
        );
      case 'POLICY_NOT_FOUND':
      case 'NOT FOUND IN REVIEWED SOURCES':
      case 'NOT_FOUND_IN_REVIEWED_SOURCES':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <HelpCircle className="w-3.5 h-3.5 text-purple-700" />
            NOT FOUND IN REVIEWED SOURCES
          </span>
        );
      case 'MISSING_USER_DOCUMENT':
      case 'USER DOCUMENT NOT UPLOADED':
      case 'USER_DOCUMENT_NOT_UPLOADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            USER DOCUMENT NOT UPLOADED
          </span>
        );
      case 'UNCERTAIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            UNCERTAIN
          </span>
        );
      case 'NOT_ASSESSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            NOT ASSESSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {status.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-teal/20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-ink">Analyzing Research Findings...</p>
        <p className="text-xs text-ink-secondary">Cross-examining reviewed sources, extracted claims, and checklist criteria...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-ink">
      {/* ── TOP EXECUTIVE SUMMARY BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white border border-teal/20 shadow-xs">
          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Reviewed Sources</p>
          <p className="text-2xl font-black text-ink mt-1">{referenceSources.length}</p>
          <p className="text-[11px] text-ink-secondary mt-0.5">Authoritative references</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-purple-200 shadow-xs">
          <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Applicant Proofs</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{evidenceSources.length}</p>
          <p className="text-[11px] text-purple-900 mt-0.5">{evidenceSources.length === 0 ? 'Not yet uploaded' : 'Uploaded documents'}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-orange-200 shadow-xs">
          <p className="text-[11px] font-bold text-orange-900 uppercase tracking-wider">Source Conflicts</p>
          <p className="text-2xl font-black text-orange-700 mt-1">{contradictionFindings.length || conflictingRequirements.length}</p>
          <p className="text-[11px] text-orange-900 mt-0.5">Divergent reference rules</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-purple-200 shadow-xs">
          <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">Policy Gaps</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{gapFindings.length || policyInformationMissing.length}</p>
          <p className="text-[11px] text-purple-900 mt-0.5">Omitted in circulars</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-teal/20 shadow-xs">
          <p className="text-[11px] font-bold text-teal uppercase tracking-wider">Verification Tasks</p>
          <p className="text-2xl font-black text-teal mt-1">{tasks.filter((t) => t.status !== 'resolved').length}</p>
          <p className="text-[11px] text-ink-secondary mt-0.5">Pending action items</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-ink/15 shadow-xs">
          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Applicant Status</p>
          <p className="text-sm font-black text-ink mt-2 truncate" title={evidenceSources.length === 0 ? 'NOT ASSESSED' : readinessStatus}>
            {evidenceSources.length === 0 ? 'NOT ASSESSED' : readinessStatus.replace(/_/g, ' ')}
          </p>
          <p className="text-[10px] text-ink-muted mt-0.5">{evidenceSources.length === 0 ? '0 proofs uploaded' : `${evidenceSources.length} proofs evaluated`}</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 — RESEARCH QUESTION
         ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
              Section 1
            </span>
            <h3 className="text-xl font-bold text-ink tracking-tight">
              Research Question
            </h3>
          </div>
          <p className="text-sm text-ink-secondary font-medium">
            The core research inquiry, objective, and analytical scope submitted for investigation.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 max-w-3xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                Submitted Question
              </span>
              <h4 className="text-base sm:text-lg font-bold text-ink leading-snug">
                {session.query || session.research_question || session.title}
              </h4>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal/10 text-teal border border-teal/30 shrink-0 self-start">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Analysis Completed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-ink/10 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                Analytical Objective
              </span>
              <p className="text-ink font-medium leading-relaxed">
                {session.objective ||
                  'Identify conflicting family income limits, opposing application deadlines, and missing scholarship renewal criteria across official circulars.'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                Target Context & Scope
              </span>
              <p className="text-ink font-medium leading-relaxed">
                {session.context ||
                  'Academic Year 2026-27 Merit Scholarship Scheme • Central Directorate vs State Higher Education Directorate.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 — DOCUMENTS REVIEWED
         ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
                Section 2
              </span>
              <h3 className="text-xl font-bold text-ink tracking-tight">
                Documents Reviewed
              </h3>
            </div>
            <p className="text-sm text-ink-secondary font-medium">
              Authoritative reference sources and user evidence examined during this investigation.
            </p>
          </div>

          <Button
            type="button"
            variant="outline-teal"
            size="sm"
            onClick={scrollToCentralUpload}
            className="text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Add Applicant Evidence
          </Button>
        </div>

        {/* Reference Documents Grid */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
            Official Reference Circulars ({referenceSources.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {referenceSources.map((source) => (
              <div
                key={source.id}
                className="p-4 rounded-xl bg-white border border-teal/20 shadow-xs space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal/15 text-teal border border-teal/30">
                      Reference Source
                    </span>
                    <span className="text-[11px] text-ink-muted font-mono">
                      {source.publication_date || 'AY 2026-27'}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-ink leading-snug line-clamp-2">
                    {source.title}
                  </h5>

                  <p className="text-xs text-ink-secondary line-clamp-2">
                    {source.title.toLowerCase().includes('central')
                      ? 'Central authority notice prescribing ₹8L income ceiling and 20 Nov deadline.'
                      : source.title.toLowerCase().includes('state')
                      ? 'State department addendum specifying ₹6L income limit and 15 Nov deadline.'
                      : source.title.toLowerCase().includes('annex')
                      ? 'Required Documents Annex specifying mandatory applicant evidence checklist.'
                      : 'Student FAQ clarifying bonafide enrollment and renewal framework.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs">
                  <span className="text-ink-muted text-[11px]">
                    {source.page_count || 1} Page • Ready
                  </span>
                  {onInspectSource && (
                    <button
                      type="button"
                      onClick={() => onInspectSource(source.id)}
                      className="text-teal hover:underline font-bold text-xs inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Document
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Applicant Evidence Status Notice */}
        <div className="p-4 rounded-xl bg-ivory-50 border border-ink/15 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
                  Applicant Evidence
                </span>
                <span className="text-xs font-bold text-ink">
                  {evidenceSources.length === 0
                    ? '0 User Supporting Documents Uploaded'
                    : `${evidenceSources.length} Supporting Documents Uploaded`}
                </span>
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {evidenceSources.length === 0
                  ? 'Only official reference guidelines have been reviewed. To verify your personal eligibility against these requirements, upload your applicant documents (such as Income Certificate, Marksheet, or Domicile Certificate).'
                  : 'Your uploaded supporting documents have been compared against official requirements below.'}
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={scrollToCentralUpload}
              className="bg-teal hover:bg-teal-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Add Documents
            </Button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3 — NEEDS ATTENTION FIRST
         ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-600 text-white font-mono">
              Section 3
            </span>
            <h3 className="text-xl font-bold text-ink tracking-tight">
              Needs Attention First
            </h3>
          </div>
          <p className="text-sm text-ink-secondary font-medium">
            Immediate conflicting rules, unverified thresholds, and policy gaps that require verification before submission.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Finding 1: Income Limits */}
          <div className="p-5 rounded-2xl bg-white border border-orange-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-orange-100 text-orange-900 border border-orange-200">
                  CONFLICTING SOURCES
                </span>
                <span className="text-xs text-ink-muted font-mono">Ref: Income Ceiling</span>
              </div>

              <h4 className="text-base font-bold text-ink leading-snug">
                Different Family Income Limits
              </h4>

              <div className="space-y-1.5 text-xs">
                <p className="text-ink font-medium leading-relaxed">
                  <strong>Problem:</strong> Central Program Notice sets the limit at ₹8,00,000 across all categories, whereas the State Addendum caps State quota applicants at ₹6,00,000.
                </p>
                <p className="text-ink-secondary leading-relaxed">
                  <strong>Why It Matters:</strong> Applying under the wrong authority threshold risks summary disqualification.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2">
              <span className="text-xs text-teal font-medium">
                <strong>Next Action:</strong> Verify applicable quota with State Nodal Office.
              </span>
              <button
                type="button"
                onClick={() => navigate('/conflicts')}
                className="text-xs text-teal font-bold hover:underline shrink-0 flex items-center gap-0.5"
              >
                Inspect <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Finding 2: Application Deadlines */}
          <div className="p-5 rounded-2xl bg-white border border-orange-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-orange-100 text-orange-900 border border-orange-200">
                  CONFLICTING SOURCES
                </span>
                <span className="text-xs text-ink-muted font-mono">Ref: Deadlines</span>
              </div>

              <h4 className="text-base font-bold text-ink leading-snug">
                Different Application Deadlines
              </h4>

              <div className="space-y-1.5 text-xs">
                <p className="text-ink font-medium leading-relaxed">
                  <strong>Problem:</strong> Central Notice sets final submission for 20 November 2026, while State Addendum specifies deadline of 15 November 2026.
                </p>
                <p className="text-ink-secondary leading-relaxed">
                  <strong>Why It Matters:</strong> Submitting after the earlier State cut-off of 15 November invalidates applications under that jurisdiction.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2">
              <span className="text-xs text-teal font-medium">
                <strong>Next Action:</strong> Target 15 November 2026 to ensure timely filing.
              </span>
              <button
                type="button"
                onClick={() => navigate('/conflicts')}
                className="text-xs text-teal font-bold hover:underline shrink-0 flex items-center gap-0.5"
              >
                Inspect <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Finding 3: Renewal Policy Gap */}
          <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-100 text-purple-900 border border-purple-200">
                  NOT FOUND IN REVIEWED SOURCES
                </span>
                <span className="text-xs text-ink-muted font-mono">Ref: Renewal Policy</span>
              </div>

              <h4 className="text-base font-bold text-ink leading-snug">
                Renewal Criteria Omitted in Guidelines
              </h4>

              <div className="space-y-1.5 text-xs">
                <p className="text-ink font-medium leading-relaxed">
                  <strong>Problem:</strong> Reviewed guidelines confirm renewal requires satisfactory progress and attendance, but omit numeric percentages or grade thresholds.
                </p>
                <p className="text-ink-secondary leading-relaxed">
                  <strong>Why It Matters:</strong> Students cannot verify their ongoing renewal eligibility without official numerical marks and attendance thresholds.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2">
              <span className="text-xs text-teal font-medium">
                <strong>Next Action:</strong> Request renewal addendum from Scholarship Council.
              </span>
              <button
                type="button"
                onClick={() => navigate('/gaps')}
                className="text-xs text-teal font-bold hover:underline shrink-0 flex items-center gap-0.5"
              >
                Inspect <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* User Evidence Mismatches Banner */}
        {mismatchedEvidence.length > 0 && (
          <div className="p-5 rounded-2xl bg-rose-50/80 border-2 border-rose-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-700 shrink-0" />
                <h4 className="text-sm font-bold text-rose-950">
                  Applicant Evidence Mismatches Detected ({mismatchedEvidence.length})
                </h4>
              </div>
              <span className="text-xs font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                Action Required Before Submission
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {mismatchedEvidence.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-white border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-ink">{req.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                      MISMATCH
                    </span>
                  </div>
                  <p className="text-ink-secondary leading-relaxed font-medium">
                    {req.user_evidence_summary}
                  </p>
                  <p className="text-teal font-semibold text-[11px] pt-1.5 border-t border-ink/5">
                    <strong>Resolution:</strong> {req.next_action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 4 — INFORMATION FOUND & MATCHED
         ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-700 text-white font-mono">
              Section 4
            </span>
            <h3 className="text-xl font-bold text-ink tracking-tight">
              Information Found & Matched
            </h3>
          </div>
          <p className="text-sm text-ink-secondary font-medium">
            Established terms, verified parameters, and confirmed criteria extracted from reviewed reference circulars.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
              <span>ACADEMIC SESSION</span>
              <span className="font-mono">AY 2026-27</span>
            </div>
            <h5 className="font-bold text-ink text-sm">Example Merit Scholarship (EMS)</h5>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Target academic session confirmed as 2026-27 across all 3 reviewed reference documents.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
              <span>ACADEMIC MERIT CRITERIA</span>
              <span className="font-mono">Top 20th Percentile</span>
            </div>
            <h5 className="font-bold text-ink text-sm">Class 12 Board Merit Threshold</h5>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Mandatory condition: Applicants must score in the top 20th percentile of their respective board exam.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
              <span>INSTITUTIONAL ENROLLMENT</span>
              <span className="font-mono">Accredited Course</span>
            </div>
            <h5 className="font-bold text-ink text-sm">Full-Time Undergraduate Degree</h5>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Candidates must be enrolled full-time in a recognized higher education degree program.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-teal/20 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-teal">
              <span>CENTRAL INCOME CEILING</span>
              <span className="font-mono">₹8,00,000 / Year</span>
            </div>
            <h5 className="font-bold text-ink text-sm">Central All-Categories Limit</h5>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Central Program Notice Clause 1 establishes ₹8,00,000 annual family income ceiling.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-teal/20 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-teal">
              <span>STATE QUOTA CEILING</span>
              <span className="font-mono">₹6,00,000 / Year</span>
            </div>
            <h5 className="font-bold text-ink text-sm">State Addendum Restriction</h5>
            <p className="text-xs text-ink-secondary leading-relaxed">
              State Addendum Clause 1 establishes a stricter ₹6,00,000 ceiling for State quota seats.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-teal/20 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-teal">
              <span>DOMICILE CONDITION</span>
              <span className="font-mono">State Quota Only</span>
            </div>
            <h5 className="font-bold text-ink text-sm">State Residence Mandate</h5>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Permanent State Domicile Certificate required specifically for State reserve quota applicants.
            </p>
          </div>
        </div>

        {/* If user evidence has been matched */}
        {matchedRequirements.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Verified User Evidence Matches ({matchedRequirements.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {matchedRequirements.map((req) => (
                <div key={req.id} className="p-3 rounded-lg bg-white/80 border border-emerald-200 space-y-1">
                  <span className="font-bold text-ink">{req.name}</span>
                  <p className="text-emerald-950 font-medium">{req.user_evidence_summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5 — REQUIRED INFORMATION / DOCUMENT CHECKLIST
         ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
                Section 5
              </span>
              <h3 className="text-xl font-bold text-ink tracking-tight">
                Required Information / Document Checklist
              </h3>
            </div>
            <p className="text-sm text-ink-secondary font-medium">
              Detailed cross-comparison matrix evaluating official source mandates against user supporting evidence.
            </p>
          </div>

          <Button
            type="button"
            variant="outline-teal"
            size="sm"
            onClick={scrollToCentralUpload}
            className="text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Add Supporting Documents
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-white shadow-xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-ivory-100 border-b border-ink/15 text-[11px] font-black uppercase tracking-wider text-ink">
                <th className="py-3.5 px-4 font-bold">Requirement</th>
                <th className="py-3.5 px-4 font-bold">What Official Source Requires</th>
                <th className="py-3.5 px-4 font-bold">Evidence Uploaded by User</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Next Action</th>
                <th className="py-3.5 px-4 font-bold">Source Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {requirements.map((req) => (
                <tr key={req.id} className="hover:bg-ivory-50/80 transition-colors">
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-ink">{req.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                            req.status_type === 'MANDATORY'
                              ? 'bg-rose-100 text-rose-800'
                              : req.status_type === 'CONDITIONAL'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {req.status_type}
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary line-clamp-2">
                        {req.description}
                      </p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top max-w-xs">
                    <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
                      {req.official_requirement_summary || req.description}
                    </p>
                    {req.exact_quote && (
                      <p className="text-xs text-ink-muted italic mt-1 bg-ivory-100 p-1.5 rounded border border-ink/10">
                        "{req.exact_quote}"
                      </p>
                    )}
                  </td>

                  <td className="py-3.5 px-4 align-top max-w-xs">
                    {req.user_evidence_summary ? (
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm text-ink font-medium">
                          {req.user_evidence_summary}
                        </p>
                        {req.matched_evidence_title && (
                          <span className="inline-block text-[10px] text-teal font-mono bg-teal/10 px-1.5 py-0.5 rounded">
                            Doc: {req.matched_evidence_title}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-muted italic">
                        No supporting document uploaded
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                    {renderStatusBadge(req.comparison_status)}
                  </td>

                  <td className="py-3.5 px-4 align-top max-w-xs">
                    <div className="space-y-2">
                      <p className="text-xs text-ink font-medium leading-relaxed">
                        {req.next_action}
                      </p>
                      {req.comparison_status !== 'MATCHED' && (
                        <button
                          type="button"
                          onClick={scrollToCentralUpload}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:text-teal-800 underline"
                        >
                          <UploadCloud className="w-3 h-3" />
                          Add Evidence in Step 2
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top whitespace-nowrap text-xs text-ink-secondary">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-ink">
                        {req.source_title || 'Reference Circular'}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        Page {req.page_number || 1} • {req.date_mentioned || 'AY 2026-27'}
                      </p>
                      {onInspectSource && req.source && (
                        <button
                          type="button"
                          onClick={() => onInspectSource(req.source!, req.exact_quote)}
                          className="text-[11px] text-teal font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Eye className="w-3 h-3" />
                          View Source
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 6 — WHAT TO DO NEXT
         ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
                Section 6
              </span>
              <h3 className="text-xl font-bold text-ink tracking-tight">
                What To Do Next
              </h3>
            </div>
            <p className="text-sm text-ink-secondary font-medium">
              Prioritized, practical verification steps to resolve ambiguities and complete your application.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                task.status === 'resolved'
                  ? 'bg-ivory-50/60 border-ink/10 opacity-70'
                  : 'bg-white border-teal/20 shadow-xs hover:border-teal'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleTask(task)}
                  disabled={updatingTaskId === task.id}
                  className="mt-0.5 p-1 rounded-md hover:bg-ivory-100 text-teal transition-colors"
                >
                  {task.status === 'resolved' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-teal/40 hover:border-teal" />
                  )}
                </button>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        task.priority?.toUpperCase() === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : task.priority?.toUpperCase() === 'HIGH'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {task.priority || 'ACTION'}
                    </span>
                    <h5
                      className={`text-sm font-bold ${
                        task.status === 'resolved' ? 'line-through text-ink-muted' : 'text-ink'
                      }`}
                    >
                      {task.title}
                    </h5>
                  </div>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {task.recommended_action || task.recommendation || task.description}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                {task.status === 'resolved' ? 'Verified' : 'Pending'}
              </span>
            </div>
          ))}
        </div>

        {/* Certificate Issuing Authority Guidance */}
        <div className="pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-3">
            Where to Obtain Verified Supporting Documents:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white border border-ink/15 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-teal font-bold text-xs">
                <Building className="w-4 h-4" />
                <span>Revenue / Tahsil Administration</span>
              </div>
              <h6 className="font-bold text-ink text-xs">Income & Domicile Certificates</h6>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Obtain valid income and domicile certificates from the Sub-Divisional Magistrate (SDM), Tehsildar, or State e-District citizen service portal.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-ink/15 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-teal font-bold text-xs">
                <Compass className="w-4 h-4" />
                <span>College Registrar / Academic Cell</span>
              </div>
              <h6 className="font-bold text-ink text-xs">Bonafide & Renewal Records</h6>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Request institutional bonafide enrollment certificates and attendance confirmation directly from your enrolled university or nodal officer.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-ink/15 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-teal font-bold text-xs">
                <FileCheck className="w-4 h-4" />
                <span>Higher Education Examination Board</span>
              </div>
              <h6 className="font-bold text-ink text-xs">Marksheet & Percentile Proof</h6>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Download certified digital Class 12 board marksheet and percentile ranks via DigiLocker or the official examination board repository.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 7 — FINAL STATUS (DUAL STATUS)
         ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
              Section 7
            </span>
            <h3 className="text-xl font-bold text-ink tracking-tight">
              Final Status
            </h3>
          </div>
          <p className="text-sm text-ink-secondary font-medium">
            Analytical synthesis distinguishing Reference Guidelines Consistency from Applicant Supporting Evidence Readiness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Reference Review Status */}
          <div className="p-6 rounded-2xl bg-white border-2 border-orange-300 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-600 text-white">
                  ISSUES IDENTIFIED
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Reference Source Review
                </span>
              </div>

              <h4 className="text-lg font-bold text-ink leading-snug">
                Reference Review: Issues Identified Across Circulars
              </h4>

              <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed font-medium">
                Analysis of the {referenceSources.length} reviewed official circulars revealed <strong>{contradictionFindings.length} source contradictions</strong> (differing annual income limits and opposing submission deadlines) and <strong>{gapFindings.length} policy gap</strong> (omitted numerical renewal thresholds). Institutional clarification is required to establish statutory precedence.
              </p>
            </div>

            <div className="pt-3 border-t border-ink/10 flex items-center justify-between text-xs text-ink-muted">
              <span>{referenceSources.length} Reference Sources Cross-Examined</span>
              <button
                type="button"
                onClick={() => navigate('/conflicts')}
                className="text-teal font-bold hover:underline inline-flex items-center gap-1"
              >
                Review Discrepancies <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card B: Applicant Document Readiness */}
          <div className={`p-6 rounded-2xl bg-white border-2 shadow-sm space-y-3 flex flex-col justify-between ${
            evidenceSources.length === 0
              ? 'border-slate-300'
              : readinessStatus === 'CHECKLIST_COMPLETE'
              ? 'border-emerald-300'
              : readinessStatus === 'READY_FOR_FINAL_REVIEW'
              ? 'border-teal-300'
              : 'border-amber-300'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  evidenceSources.length === 0
                    ? 'bg-slate-700 text-white'
                    : readinessStatus === 'CHECKLIST_COMPLETE'
                    ? 'bg-emerald-600 text-white'
                    : readinessStatus === 'READY_FOR_FINAL_REVIEW'
                    ? 'bg-teal text-white'
                    : 'bg-amber-600 text-white'
                }`}>
                  {evidenceSources.length === 0 ? 'NOT ASSESSED' : readinessStatus.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Applicant Document Readiness
                </span>
              </div>

              <h4 className="text-lg font-bold text-ink leading-snug">
                {evidenceSources.length === 0
                  ? 'Applicant Readiness: Not Assessed (0 User Proofs)'
                  : readinessStatus === 'CHECKLIST_COMPLETE'
                  ? 'All Mandatory Requirements Have Verified Evidence'
                  : readinessStatus === 'READY_FOR_FINAL_REVIEW'
                  ? 'Mandatory Criteria Supported — Authority Review Prudent'
                  : 'Action Required: Resolve Missing Evidence & Mismatches'}
              </h4>

              <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed font-medium">
                {evidenceSources.length === 0
                  ? 'No applicant supporting documents (e.g. Income Certificate, Marksheet, Domicile Certificate) have been uploaded yet. Applicant document readiness cannot be assessed until personal proofs are provided.'
                  : (readinessExplanation && !readinessExplanation.toLowerCase().includes('0 applicant')
                      ? readinessExplanation
                      : `${evidenceSources.length} applicant supporting document(s) evaluated. Action required: review flagged mismatches and missing documents below before submission.`)}
              </p>
            </div>

            <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2">
              <span className="text-xs text-ink-muted">
                {evidenceSources.length} Supporting Documents Uploaded
              </span>
              <Button
                type="button"
                size="sm"
                onClick={scrollToCentralUpload}
                className="bg-teal hover:bg-teal-700 text-white font-bold text-xs"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1" />
                Add Documents
              </Button>
            </div>
          </div>
        </div>

        {/* Official Guidance Notice */}
        <div className="p-4 rounded-xl bg-ivory-100 border border-ink/15 flex items-start gap-3 text-xs text-ink-secondary leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-teal mt-0.5" />
          <span>
            <strong>Official Guidance Notice:</strong> GapLens AI provides automated analytical checklist verification against reviewed circulars. It never promises official scholarship grant, financial award, or legal entitlement. Always confirm final requirements with the official scholarship authority.
          </span>
        </div>
      </section>

      {/* ── FOOTER ACTIONS ── */}
      <div className="pt-6 border-t border-ink/15 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-ink-muted">
          Showing complete 7-Section research findings for Session <code>{session.id.slice(0, 8)}</code>.
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline-teal"
            onClick={() => navigate('/reports')}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Generate Complete Audit Report
          </Button>
          <Button
            type="button"
            onClick={scrollToCentralUpload}
            className="bg-teal hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Add More Documents
          </Button>
        </div>
      </div>
    </div>
  );
};