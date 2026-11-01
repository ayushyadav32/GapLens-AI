import { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { researchApi } from '@/lib/api/researchApi';
import { ResearchRequirement } from '@/types';

interface EvidenceUploadModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  targetRequirement?: ResearchRequirement | null;
  onSuccess: () => Promise<void>;
}

export const EvidenceUploadModal = ({
  open,
  onClose,
  sessionId,
  targetRequirement,
  onSuccess,
}: EvidenceUploadModalProps) => {
  const [mode, setMode] = useState<'pdf' | 'manual'>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<string>(
    targetRequirement?.required_evidence_type || 'income_certificate'
  );
  const [manualTitle, setManualTitle] = useState(
    targetRequirement ? `Proof for ${targetRequirement.name}` : ''
  );
  const [manualText, setManualText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'pdf') {
        if (!selectedFile) {
          setError('Please select a PDF file to upload.');
          setSubmitting(false);
          return;
        }

        if (targetRequirement) {
          const formData = new FormData();
          formData.append('source_type', 'pdf');
          formData.append('evidence_type', evidenceType);
          formData.append('file', selectedFile);
          await researchApi.resolveRequirementWithEvidence(targetRequirement.id, formData);
        } else {
          await researchApi.ingestEvidencePdfs(sessionId, [selectedFile], evidenceType);
        }
      } else {
        if (!manualText.trim()) {
          setError('Please enter the text content of your supporting document.');
          setSubmitting(false);
          return;
        }

        if (targetRequirement) {
          await researchApi.resolveRequirementWithEvidence(targetRequirement.id, {
            source_type: 'manual',
            evidence_type: evidenceType,
            title: manualTitle || `Evidence: ${targetRequirement.name}`,
            text: manualText,
          });
        } else {
          await researchApi.ingestEvidenceManual(sessionId, {
            title: manualTitle || 'Supporting Evidence Document',
            text: manualText,
            evidenceType,
          });
        }
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Evidence upload failed:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to submit evidence document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl border border-teal/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-navy to-teal-900 text-white flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-teal text-white">
                Supporting Evidence
              </span>
              {targetRequirement && (
                <span className="text-xs text-teal-200">
                  Target: {targetRequirement.name}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Upload Your Supporting Documents
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            Upload the documents you currently have. GapLens AI will compare them against the identified requirements and show what is available, missing, inconsistent or needs verification.
          </p>

          {/* Mode Selector */}
          <div className="flex rounded-lg bg-ivory-100 p-1 border border-ink/10">
            <button
              type="button"
              onClick={() => setMode('pdf')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${
                mode === 'pdf' ? 'bg-white text-teal shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              PDF Document
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${
                mode === 'manual' ? 'bg-white text-teal shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <FileText className="w-4 h-4" />
              Direct Text Entry
            </button>
          </div>

          {/* Document Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
              Evidence Category
            </label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 bg-ivory-50 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:bg-white"
            >
              <option value="income_certificate">Income Certificate (Revenue Authority / Tahsil)</option>
              <option value="domicile_certificate">State Domicile / Residence Certificate</option>
              <option value="marksheet">Class 12 Marksheet & Percentile Certificate</option>
              <option value="bonafide_certificate">Bonafide Institutional Enrollment Certificate</option>
              <option value="circular_addendum">Official Clarification / Renewal Circular Addendum</option>
              <option value="general_evidence">Other Applicant Supporting Evidence</option>
            </select>
          </div>

          {mode === 'pdf' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Select PDF File
              </label>
              <div className="border-2 border-dashed border-teal/30 hover:border-teal rounded-xl p-6 text-center bg-ivory-50 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="evidence-file-input"
                />
                <label
                  htmlFor="evidence-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-teal/10 text-teal flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  {selectedFile ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-teal break-all">{selectedFile.name}</p>
                      <p className="text-xs text-ink-muted">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose different file
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-ink">Choose a PDF certificate or document</p>
                      <p className="text-xs text-ink-muted">PDF files up to 25MB supported</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  Document Title
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Income Certificate - Tahsildar Verified"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 bg-ivory-50 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  Document Content / Extracted Certificate Text
                </label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={4}
                  placeholder="Paste the certificate details, issuing authority name, certificate number, date, and verified numbers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 bg-ivory-50 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-teal focus:bg-white"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Provenance assurance */}
          <div className="flex items-center gap-2 text-[11px] text-ink-muted bg-ivory-100 p-2.5 rounded-lg border border-ink/10">
            <Shield className="w-4 h-4 text-teal shrink-0" />
            <span>
              Your supporting evidence is analyzed securely within your private investigation session. It is never mixed with public demo data or external sources.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-teal hover:bg-teal-700 text-white font-bold"
            >
              {submitting ? 'Comparing Evidence...' : 'Submit & Re-evaluate'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
