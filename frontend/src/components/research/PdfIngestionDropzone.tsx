import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, FileText, X, AlertCircle, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';
import { IngestResponse } from '@/lib/api/researchApi';

interface PdfIngestionDropzoneProps {
  onIngest: (files: File[]) => Promise<IngestResponse>;
  loading?: boolean;
}

export const PdfIngestionDropzone = ({ onIngest, loading = false }: PdfIngestionDropzoneProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<IngestResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    setResults(null);

    const validPdfs: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        setError(`"${file.name}" is not a PDF. Only PDF documents are supported.`);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 25 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
        return;
      }
      validPdfs.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validPdfs]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select or drop at least one PDF file.');
      return;
    }
    setError(null);
    try {
      const res = await onIngest(selectedFiles);
      setResults(res);
      if (res.created_count > 0) {
        setSelectedFiles([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to ingest PDF document(s).');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-ink/8">
        <div>
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal" />
            PDF Multi-Page Extraction (PyMuPDF Engine)
          </h4>
          <p className="text-xs text-ink-muted mt-0.5">
            Parses official circulars, whitepapers, and reports with page-level textual segmentation and SHA-256 fingerprinting.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          %PDF- Header Verified
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-teal bg-teal/5 scale-[1.01]'
            : 'border-ink/15 hover:border-teal/50 hover:bg-ivory-100 bg-ivory-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal/10 flex items-center justify-center text-teal shadow-teal-sm">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">
              Drop research PDFs here, or <span className="text-teal underline underline-offset-2">browse files</span>
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Supports multi-file uploads up to 25 MB each · Text layer extraction & metadata parsing
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Ready for Ingestion ({selectedFiles.length})
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-ivory-200 border border-ink/8 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-teal shrink-0" />
                  <span className="font-semibold text-ink truncate">{file.name}</span>
                  <span className="text-ink-muted shrink-0 text-[11px]">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="p-1 text-ink-muted hover:text-coral rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-coral text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {results && (
        <div className="space-y-2">
          {results.created_count > 0 && (
            <div className="p-3 bg-teal/10 border border-teal/20 rounded-xl text-teal text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Successfully extracted and indexed <strong>{results.created_count}</strong> PDF document(s).
              </span>
            </div>
          )}

          {results.skipped_duplicates?.length > 0 && (
            <div className="p-2.5 bg-gold/10 border border-gold/20 rounded-xl text-ink text-xs space-y-1">
              <span className="font-bold text-gold">Skipped Duplicate Documents:</span>
              <ul className="list-disc pl-4 text-ink-muted space-y-0.5">
                {results.skipped_duplicates.map((dup, i) => (
                  <li key={i}>{dup.file || 'File'}: {dup.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {results.errors?.length > 0 && (
            <div className="p-2.5 bg-coral/10 border border-coral/20 rounded-xl text-coral text-xs space-y-1">
              <span className="font-bold">Errors Encountered:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {results.errors.map((errItem, i) => (
                  <li key={i}>{errItem.file}: {errItem.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-ink-muted">
          Extracts page-by-page text coordinates & handles multi-column layouts
        </span>
        <Button
          type="button"
          variant="primary"
          size="md"
          loading={loading}
          icon={<Upload className="w-4 h-4" />}
          disabled={loading || selectedFiles.length === 0}
          onClick={handleSubmit}
        >
          Extract & Ingest PDF(s)
        </Button>
      </div>
    </div>
  );
};
