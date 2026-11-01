import React, { useState } from 'react';
import {
  Globe,
  FileText,
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Calendar,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ResearchFinding } from '@/types';
import { researchApi } from '@/lib/api/researchApi';

interface ResolveGapModalProps {
  open: boolean;
  finding: ResearchFinding | null;
  onClose: () => void;
  onResolved?: (updatedFinding: any) => void;
}

export const ResolveGapModal: React.FC<ResolveGapModalProps> = ({
  open,
  finding,
  onClose,
  onResolved,
}) => {
  const [sourceType, setSourceType] = useState<'url' | 'pdf' | 'manual'>('url');
  const [url, setUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');
  const [pubDate, setPubDate] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    resolved: boolean;
    message: string;
    matched_claims_count: number;
    source?: any;
    finding?: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!finding) return null;

  const resetForm = () => {
    setUrl('');
    setPdfFile(null);
    setManualTitle('');
    setManualText('');
    setPubDate('');
    setResolutionNotes('');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      let res;
      if (sourceType === 'pdf') {
        if (!pdfFile) {
          setError('Please select a PDF document to upload.');
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('source_type', 'pdf');
        formData.append('file', pdfFile);
        formData.append('resolution_notes', resolutionNotes);
        res = await researchApi.resolveGapWithEvidence(finding.id, formData);
      } else if (sourceType === 'url') {
        if (!url.trim()) {
          setError('Please provide a valid authoritative URL.');
          setSubmitting(false);
          return;
        }
        res = await researchApi.resolveGapWithEvidence(finding.id, {
          source_type: 'url',
          url: url.trim(),
          resolution_notes: resolutionNotes.trim(),
        });
      } else {
        if (!manualText.trim()) {
          setError('Please enter the manual evidence text.');
          setSubmitting(false);
          return;
        }
        res = await researchApi.resolveGapWithEvidence(finding.id, {
          source_type: 'manual',
          title: manualTitle.trim() || `Resolution Evidence for ${finding.title}`,
          text: manualText.trim(),
          publication_date: pubDate || undefined,
          resolution_notes: resolutionNotes.trim(),
        });
      }

      setResult(res);
      if (onResolved && res.finding) {
        onResolved(res.finding);
      }
    } catch (err: any) {
      console.error('Gap resolution submission failed:', err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to submit evidence and resolve gap.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Evidence-Backed Gap Resolution Engine"
      description="Close informational dark spots by ingesting verified primary evidence. Zero-hallucination substring matching enforces that claims must directly address the target dimension."
      size="lg"
      footer={
        result?.resolved ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-success flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Dimension Coverage Updated in Audit Ledger
            </span>
            <Button variant="primary" size="sm" onClick={handleClose}>
              Done & Refresh Workspace
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={handleSubmit}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Verify & Resolve Gap
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* Finding Overview Header */}
        <div className="p-4 rounded-2xl bg-ivory-100 border border-ink/8 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-coral/15 text-coral border border-coral/30">
              TARGET DARK SPOT // {finding.priority} PRIORITY
            </span>
            {finding.dimension_name && (
              <span className="text-xs font-mono font-semibold text-teal">
                Dimension: {finding.dimension_name}
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-ink">{finding.title}</h4>
          <p className="text-xs text-ink-secondary leading-relaxed font-light">
            {finding.description}
          </p>
        </div>

        {/* Live Result Feedback Card */}
        {result && (
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 ${
              result.resolved
                ? 'bg-teal/10 border-teal/40 text-teal-900 shadow-teal-sm'
                : 'bg-gold/15 border-gold/40 text-ink'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.resolved ? (
                <CheckCircle2 className="w-5 h-5 text-teal shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-ink">
                  {result.resolved
                    ? 'Gap Resolved Successfully via Verified Evidence'
                    : 'Evidence Ingested — Insufficient Dimension Alignment'}
                </h5>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  {result.message}
                </p>
              </div>
            </div>

            {result.source && (
              <div className="p-2.5 bg-white/80 rounded-xl border border-ink/5 text-[11px] font-mono text-ink flex items-center justify-between">
                <span>Ingested: <strong>{result.source.title}</strong></span>
                <span className="text-teal font-semibold">
                  SHA: {result.source.content_hash.slice(0, 16)}...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-coral/10 border border-coral/30 text-coral text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs (hide if already resolved) */}
        {!result?.resolved && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source Mode Tabs */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                Select Evidence Ingestion Vector
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSourceType('url')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    sourceType === 'url'
                      ? 'bg-teal text-white shadow-teal-sm'
                      : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Authoritative Web URL
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('pdf')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    sourceType === 'pdf'
                      ? 'bg-teal text-white shadow-teal-sm'
                      : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  PDF Document Upload
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('manual')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    sourceType === 'manual'
                      ? 'bg-teal text-white shadow-teal-sm'
                      : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
                  }`}
                >
                  <FileEdit className="w-4 h-4" />
                  Manual Text Note
                </button>
              </div>
            </div>

            {/* URL Input */}
            {sourceType === 'url' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink block">
                  Authoritative Web URL
                </label>
                <input
                  type="url"
                  placeholder="https://state-highereducation.gov.in/notifications/merit-addendum-2026"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full p-3 text-xs bg-ivory-50 rounded-xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal font-mono"
                  required
                />
              </div>
            )}

            {/* PDF Input */}
            {sourceType === 'pdf' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink block">
                  PDF Document
                </label>
                <div className="p-6 border-2 border-dashed border-teal/30 rounded-2xl bg-teal/5 text-center space-y-2 cursor-pointer hover:bg-teal/10 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPdfFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="evidence-pdf-upload"
                  />
                  <label htmlFor="evidence-pdf-upload" className="cursor-pointer block space-y-1">
                    <Upload className="w-6 h-6 mx-auto text-teal" />
                    <p className="text-xs font-bold text-ink">
                      {pdfFile ? pdfFile.name : 'Click to select PDF document'}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {pdfFile
                        ? `${(pdfFile.size / 1024).toFixed(1)} KB`
                        : 'PyMuPDF will extract pages and compute SHA-256 fingerprint'}
                    </p>
                  </label>
                </div>
              </div>
            )}

            {/* Manual Text Input */}
            {sourceType === 'manual' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink block">Source Title</label>
                    <input
                      type="text"
                      placeholder="e.g. State Directorate Official Addendum Circular"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full p-2.5 text-xs bg-ivory-50 rounded-xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-teal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink block">Publication Date</label>
                    <input
                      type="date"
                      value={pubDate}
                      onChange={(e) => setPubDate(e.target.value)}
                      className="w-full p-2.5 text-xs bg-ivory-50 rounded-xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-teal"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink block">
                    Authoritative Evidence Text Content
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Paste the relevant statutory clauses or circular text containing verifiable claims..."
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="w-full p-3 text-xs bg-ivory-50 rounded-xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-teal font-mono resize-none leading-relaxed"
                    required
                  />
                </div>
              </div>
            )}

            {/* Substantive Resolution Notes */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-ink block">
                Resolution Reasoning / Substantive Audit Notes
              </label>
              <textarea
                rows={2}
                placeholder="Explain why this ingested evidence definitively satisfies the missing dimension (e.g. 'State Addendum confirms continuous domicile verification procedure via DigiLocker')."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-3 text-xs bg-ivory-50 rounded-xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-teal resize-none"
              />
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
