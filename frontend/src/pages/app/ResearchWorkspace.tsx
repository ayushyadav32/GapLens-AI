import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  Search,
  Plus,
  Globe,
  FileEdit,
  FileText,
  AlertTriangle,
  FolderOpen,
  Edit3,
  Trash2,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  BookOpen,
  UploadCloud,
  Sparkles,
} from 'lucide-react';

import { ResearchSession, SourceDocument } from '@/types';
import { researchApi } from '@/lib/api/researchApi';
import { QuestionComposerModal } from '@/components/research/QuestionComposerModal';
import { UrlIngestionForm } from '@/components/research/UrlIngestionForm';
import { PdfIngestionDropzone } from '@/components/research/PdfIngestionDropzone';
import { ManualTextForm } from '@/components/research/ManualTextForm';
import { SourceCard } from '@/components/research/SourceCard';
import { SourcePreviewDrawer } from '@/components/research/SourcePreviewDrawer';
import { AIAnalysisConsole } from '@/components/research/AIAnalysisConsole';
import { ResearchResultsView } from '@/components/research/ResearchResultsView';
import { useToast } from '@/context/ToastContext';

export const ResearchWorkspace = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentSessionId = params.get('session');

  // State
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'create' | 'edit'>('create');
  const [inspectSourceId, setInspectSourceId] = useState<string | null>(null);

  // Ingestion tab & library filter
  const [ingestionTab, setIngestionTab] = useState<'pdf' | 'url' | 'manual'>('pdf');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'reference' | 'evidence' | 'pdf' | 'url' | 'manual'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle action=new trigger from global navigation
  useEffect(() => {
    if (params.get('action') === 'new') {
      setComposerMode('create');
      setIsComposerOpen(true);
      const newParams = new URLSearchParams(params);
      newParams.delete('action');
      setParams(newParams, { replace: true });
    }
  }, [params]);

  // Auto-scroll to central document upload if hash is present
  useEffect(() => {
    if (window.location.hash === '#central-document-upload') {
      setTimeout(() => {
        document.getElementById('central-document-upload')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [currentSessionId]);

  // 1. Fetch all sessions on mount
  const loadSessions = async (targetId?: string) => {
    try {
      const res = await researchApi.getSessions();
      setSessions(res.results);

      let active = res.results.find((s) => s.id === (targetId || currentSessionId));
      if (!active && res.results.length > 0) {
        active = res.results[0];
      }

      if (active) {
        setParams({ session: active.id }, { replace: true });
        await loadSessionDetails(active.id);
      } else {
        setCurrentSession(null);
        setSources([]);
      }
    } catch (err) {
      console.error('Failed to load research sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch specific session details & sources
  const loadSessionDetails = async (sessionId: string) => {
    try {
      const [sessionData, sourcesData] = await Promise.all([
        researchApi.getSession(sessionId),
        researchApi.getSources(sessionId),
      ]);
      setCurrentSession(sessionData);
      setSources(sourcesData.sources);
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [currentSessionId]);

  // 3. Handle Session Creation
  const handleCreateSession = async (payload: {
    title: string;
    query: string;
    objective: string;
    context: string;
  }) => {
    setLoading(true);
    try {
      const newSession = await researchApi.createSession(payload);
      setParams({ session: newSession.id });
      await loadSessions(newSession.id);
    } catch (err) {
      console.error('Session creation failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 3b. Handle Session Update (Edit Question)
  const handleUpdateSession = async (payload: {
    title: string;
    query: string;
    objective: string;
    context: string;
  }) => {
    if (!currentSession) return;
    setLoading(true);
    try {
      const updated = await researchApi.updateSession(currentSession.id, payload);
      setCurrentSession(updated);
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast({
        type: 'success',
        title: 'Research Question Updated',
        message: 'Your research question and parameters were successfully updated.',
      });
    } catch (err: any) {
      console.error('Session update failed:', err);
      toast({
        type: 'error',
        title: 'Update Failed',
        message: err?.response?.data?.error || 'Could not update research question.',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 4. Ingestion Handlers
  const handleIngestUrls = async (urls: string[]) => {
    if (!currentSession) throw new Error('No active session.');
    setIngesting(true);
    try {
      const res = await researchApi.ingestUrls(currentSession.id, urls);
      await loadSessionDetails(currentSession.id);
      return res;
    } finally {
      setIngesting(false);
    }
  };

  const handleIngestPdfs = async (files: File[]) => {
    if (!currentSession) throw new Error('No active session.');
    setIngesting(true);
    try {
      const res = await researchApi.ingestPdfs(currentSession.id, files);
      await loadSessionDetails(currentSession.id);
      return res;
    } finally {
      setIngesting(false);
    }
  };

  const handleIngestManual = async (payload: { title: string; text: string; publication_date?: string }) => {
    if (!currentSession) throw new Error('No active session.');
    setIngesting(true);
    try {
      const res = await researchApi.ingestManualText(currentSession.id, payload);
      await loadSessionDetails(currentSession.id);
      return res;
    } finally {
      setIngesting(false);
    }
  };

  const handleUpdateSourceCategory = async (sourceId: string, category: 'reference' | 'evidence') => {
    try {
      await researchApi.updateSource(sourceId, { document_category: category });
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, document_category: category } : s))
      );
      if (currentSession) {
        await loadSessionDetails(currentSession.id);
      }
    } catch (err) {
      console.error('Failed to update source category:', err);
    }
  };

  // 5. Source Delete Handler
  const handleDeleteSource = async (sourceId: string) => {
    if (!currentSession) return;
    try {
      await researchApi.deleteSource(sourceId);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      if (currentSession) {
        await loadSessionDetails(currentSession.id);
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  // 6. Session Delete Handler
  const handleDeleteSession = async () => {
    if (!currentSession) return;
    if (!confirm(`Are you sure you want to delete research "${currentSession.title}"?`)) return;
    setLoading(true);
    try {
      await researchApi.deleteSession(currentSession.id);
      await loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setLoading(false);
    }
  };

  const readySources = sources.filter((s) => s.extraction_status === 'READY');
  const referenceSources = sources.filter((s) => s.document_category === 'reference');
  const evidenceSources = sources.filter((s) => s.document_category === 'evidence');
  const uncertainSources = sources.filter((s) => s.document_category === 'uncertain' || (!s.document_category && s.document_category !== 'reference' && s.document_category !== 'evidence'));
  const hasResults = Boolean(currentSession?.dimension_count && currentSession.dimension_count > 0);

  // Detect mismatch between inquiry text and uploaded document corpus
  const isScopeMismatch = Boolean(
    currentSession?.query?.toLowerCase().includes('national merit') &&
    sources.some(
      (s) =>
        s.title.toLowerCase().includes('example merit') ||
        (s.extracted_text && s.extracted_text.toLowerCase().includes('example merit scholarship'))
    )
  );

  const handleAlignQuestionToEMS = async () => {
    if (!currentSession) return;
    await handleUpdateSession({
      title: 'Example Merit Scholarship (EMS) Eligibility & Compliance Verification',
      query:
        'What are the hidden compliance criteria, conflicting family income limits, and missing verification mandates across State and Central guidelines for the Example Merit Scholarship (EMS) AY 2026-27?',
      objective:
        'Detect conflicting eligibility ceilings between central circulars and state notices, uncover missing documentation mandates, and flag outdated application timelines for EMS AY 2026-27.',
      context:
        'Evaluating official Example Merit Scholarship (EMS) guidelines against applicant supporting documentation for Academic Year 2026-27.',
    });
  };

  // Filtered source list
  const filteredSources = sources.filter((s) => {
    let matchesFilter = true;
    if (libraryFilter === 'reference') {
      matchesFilter = s.document_category === 'reference';
    } else if (libraryFilter === 'evidence') {
      matchesFilter = s.document_category === 'evidence';
    } else if (libraryFilter !== 'all') {
      matchesFilter = s.source_type === libraryFilter;
    }
    const matchesSearch =
      searchQuery === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.original_url && s.original_url.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (loading && !currentSession && sessions.length === 0) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingState message="Loading Research Workspace..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <PageHeader
        title="My Research Workspace"
        subtitle="Follow the 4 guided steps below: define your question, upload documents or websites, analyze information, and view source-verified findings."
        icon={<Search className="w-5 h-5 text-teal" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setComposerMode('create');
              setIsComposerOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
            className="bg-teal hover:bg-teal-dark text-white font-bold"
          >
            Create Investigation
          </Button>
        }
      />

      {/* ── Empty State When No Research Exists ──────────────────────── */}
      {!currentSession && sessions.length === 0 && (
        <Card variant="default" padding="lg" className="border-teal/20 bg-white">
          <div className="text-center py-12 px-4 max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center mx-auto shadow-sm">
              <Search className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-ink">
                Your Research Workspace Is Empty
              </h2>
              <p className="text-base text-ink-secondary leading-relaxed">
                Enter a research question and upload documents or web links to find what's missing, contradictory, or outdated.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-ivory-100 border border-ink/8 text-left space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-teal">
                Example Research Question
              </span>
              <p className="text-sm font-medium text-ink italic">
                "What should a student verify before applying for this scholarship for the 2026–27 academic year?"
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setComposerMode('create');
                setIsComposerOpen(true);
              }}
              icon={<Plus className="w-5 h-5" />}
              className="bg-teal hover:bg-teal-dark text-white font-bold px-8 py-3.5 shadow-teal text-base"
            >
              Create Investigation
            </Button>
          </div>
        </Card>
      )}

      {/* ── Active Investigation: 4-Step Guided Workflow ────────────── */}
      {currentSession && (
        <div className="space-y-8">
          {/* ════════════════════════════════════════════════════════════
              STEP 1: What do you want to research?
             ════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-teal/20 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/8 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
                    Step 1
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal">
                    Inquiry Definition
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
                  Step 1: What do you want to research?
                </h3>
              </div>

              {/* Session Switcher Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {sessions.length > 1 && (
                  <div className="flex items-center gap-2 bg-ivory-100 px-3 py-1.5 rounded-xl border border-ink/10 text-xs">
                    <FolderOpen className="w-4 h-4 text-teal shrink-0" />
                    <span className="text-ink-muted text-[11px] font-medium hidden sm:inline">Topic:</span>
                    <select
                      value={currentSession.id}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setParams({ session: selId });
                        loadSessionDetails(selId);
                      }}
                      className="bg-transparent font-bold text-ink text-xs focus:outline-none cursor-pointer pr-2"
                    >
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.source_count} sources)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Button
                  variant="outline-teal"
                  size="sm"
                  onClick={() => {
                    setComposerMode('edit');
                    setIsComposerOpen(true);
                  }}
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  className="text-xs font-semibold"
                >
                  Edit Question
                </Button>

                <button
                  type="button"
                  onClick={handleDeleteSession}
                  title="Delete current research"
                  className="p-2 text-ink-muted hover:text-coral hover:bg-coral/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Research Question Card */}
            <div className="p-5 rounded-xl bg-ivory-50 border border-teal/15 space-y-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal">
                  Active Research Question
                </span>
                <p className="text-base sm:text-lg font-bold text-ink leading-relaxed mt-1">
                  "{currentSession.query}"
                </p>
              </div>

              {currentSession.objective && (
                <div className="pt-2.5 border-t border-ink/5">
                  <span className="text-xs font-semibold text-ink-muted">
                    Objective:
                  </span>
                  <p className="text-sm text-ink-secondary mt-0.5">
                    {currentSession.objective}
                  </p>
                </div>
              )}

              {/* Guidance Text */}
              <div className="pt-2 border-t border-ink/5 flex items-start gap-2 text-xs text-ink-muted">
                <Info className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> A good research question focuses on specific rules, criteria, timelines, or requirements. GapLens AI checks your sources to identify what is directly stated, what is omitted, and where sources disagree.
                </span>
              </div>
            </div>

            {/* Research Scope & Corpus Alignment Advisory */}
            {isScopeMismatch && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded font-mono">
                        Scope & Corpus Alignment Advisory
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-ink">
                      Active inquiry specifies "National Merit Scholarship 2026", but reviewed guidelines define "Example Merit Scholarship (EMS) AY 2026-27".
                    </p>
                    <p className="text-xs text-ink-secondary leading-relaxed">
                      All claim extractions, contradiction comparisons, and gap detections below reflect the rules in your uploaded EMS documents. You can align your inquiry statement with this corpus or edit it manually.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200">
                  <Button
                    variant="outline-teal"
                    size="sm"
                    onClick={() => {
                      setComposerMode('edit');
                      setIsComposerOpen(true);
                    }}
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold bg-white"
                  >
                    Edit Question Manually
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAlignQuestionToEMS}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
                  >
                    Align Question to EMS (AY 2026-27)
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              STEP 2: Add Your Research Documents (Central Document Upload)
             ════════════════════════════════════════════════════════════ */}
          <div
            id="central-document-upload"
            className="bg-white rounded-2xl border border-teal/20 shadow-sm p-6 sm:p-8 space-y-6 scroll-mt-20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/8 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
                    Step 2
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal">
                    Central Document Ingestion
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
                  Step 2: Add Your Research Documents
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Upload all documents related to your research here. This includes official guidelines, circulars, certificates, reports and other supporting evidence.
                </p>
              </div>

              {/* Strict Mathematical Live Document Counters */}
              <div className="flex flex-wrap items-center gap-2 bg-ivory-100 p-2.5 rounded-xl border border-ink/10 text-xs">
                <span className="font-bold text-ink">
                  Total Documents: <span className="font-mono text-teal">{sources.length}</span>
                </span>
                <span className="text-ink-muted">|</span>
                <span className="font-semibold text-teal-dark">
                  Reference Documents: <span className="font-mono font-bold text-teal">{referenceSources.length}</span>
                </span>
                <span className="text-ink-muted">|</span>
                <span className="font-semibold text-purple-900">
                  Supporting Evidence: <span className="font-mono font-bold text-purple-700">{evidenceSources.length}</span>
                </span>
                {uncertainSources.length > 0 && (
                  <>
                    <span className="text-ink-muted">|</span>
                    <span className="font-semibold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                      Unclassified: <span className="font-mono font-bold text-amber-700">{uncertainSources.length}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Ingestion Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIngestionTab('pdf')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  ingestionTab === 'pdf'
                    ? 'bg-teal text-white shadow-teal-sm'
                    : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Upload PDF Documents
              </button>

              <button
                type="button"
                onClick={() => setIngestionTab('url')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  ingestionTab === 'url'
                    ? 'bg-teal text-white shadow-teal-sm'
                    : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
                }`}
              >
                <Globe className="w-4 h-4" />
                Add Website URL
              </button>

              <button
                type="button"
                onClick={() => setIngestionTab('manual')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  ingestionTab === 'manual'
                    ? 'bg-teal text-white shadow-teal-sm'
                    : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                Paste Text
              </button>
            </div>

            {/* Ingestion Forms */}
            <div className="p-5 rounded-2xl bg-ivory-50 border border-ink/8">
              {ingestionTab === 'pdf' && (
                <PdfIngestionDropzone onIngest={handleIngestPdfs} loading={ingesting} />
              )}
              {ingestionTab === 'url' && (
                <UrlIngestionForm onIngest={handleIngestUrls} loading={ingesting} />
              )}
              {ingestionTab === 'manual' && (
                <ManualTextForm onIngest={handleIngestManual} loading={ingesting} />
              )}
            </div>

            {/* Sources List */}
            <div className="space-y-4 pt-4 border-t border-ink/8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal" />
                  Added Documents & Sources ({sources.length})
                </h4>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      placeholder="Search added sources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-ink/10 focus:outline-none focus:ring-2 focus:ring-teal w-44"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-ivory-200 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setLibraryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        libraryFilter === 'all' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      All ({sources.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryFilter('reference')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        libraryFilter === 'reference' ? 'bg-white text-teal shadow-sm font-bold' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Reference ({referenceSources.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryFilter('evidence')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        libraryFilter === 'evidence' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Evidence ({evidenceSources.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryFilter('pdf')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        libraryFilter === 'pdf' ? 'bg-white text-teal shadow-sm' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      PDFs ({sources.filter((s) => s.source_type === 'pdf').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryFilter('url')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        libraryFilter === 'url' ? 'bg-white text-teal shadow-sm' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Websites ({sources.filter((s) => s.source_type === 'url').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryFilter('manual')}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        libraryFilter === 'manual' ? 'bg-white text-teal shadow-sm' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Pasted ({sources.filter((s) => s.source_type === 'manual').length})
                    </button>
                  </div>
                </div>
              </div>

              {filteredSources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSources.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onInspect={(s) => setInspectSourceId(s.id)}
                      onDelete={handleDeleteSource}
                      onUpdateCategory={handleUpdateSourceCategory}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-ivory-50 border border-dashed border-ink/15 text-center space-y-2">
                  <p className="text-sm font-semibold text-ink">
                    {sources.length === 0
                      ? 'No documents or websites added yet.'
                      : 'No sources match the selected filter.'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {sources.length === 0
                      ? 'Upload a PDF or add a website URL using the tabs above to begin building your evidence.'
                      : 'Try clearing your search query or selecting "All".'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              STEP 3: Analyze Your Research
             ════════════════════════════════════════════════════════════ */}
          <AIAnalysisConsole
            session={currentSession}
            sourcesCount={readySources.length}
            onAnalysisComplete={async () => {
              await loadSessionDetails(currentSession.id);
            }}
          />

          {/* ════════════════════════════════════════════════════════════
              STEP 4: Your Research Results
             ════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal text-white font-mono">
                Step 4
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                Step 4: Your Research Results & Evidence Checklist
              </h3>
            </div>

            {hasResults ? (
              <ResearchResultsView
                session={currentSession}
                sources={sources}
                onInspectSource={(sourceId) => setInspectSourceId(sourceId)}
                onRefresh={async () => {
                  await loadSessionDetails(currentSession.id);
                }}
              />
            ) : (
              <div className="p-10 rounded-2xl bg-white border border-teal/20 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h4 className="text-base font-bold text-ink">
                    Analysis Not Yet Executed
                  </h4>
                  <p className="text-sm text-ink-secondary leading-relaxed">
                    Click <strong>"Analyze Information"</strong> in Step 3 above to extract key claims, discover potential gaps, detect contradictory statements, and generate your verification checklist.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals & Drawers ─────────────────────────────────────────── */}
      <QuestionComposerModal
        open={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        initialData={composerMode === 'edit' ? currentSession || undefined : undefined}
        onSubmit={composerMode === 'edit' ? handleUpdateSession : handleCreateSession}
      />

      <SourcePreviewDrawer
        sourceId={inspectSourceId}
        onClose={() => setInspectSourceId(null)}
      />
    </div>
  );
};
