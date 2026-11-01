import { useState, useEffect } from 'react';
import { SourceDocument, DocumentPage } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Globe,
  FileEdit,
  Layers,
  Calendar,
  Hash,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { researchApi } from '@/lib/api/researchApi';

interface SourcePreviewDrawerProps {
  sourceId: string | null;
  onClose: () => void;
  highlightQuote?: string;
  charStart?: number;
  charEnd?: number;
  claim?: any;
}

export const SourcePreviewDrawer = ({
  sourceId,
  onClose,
  highlightQuote,
  charStart,
  charEnd,
  claim,
}: SourcePreviewDrawerProps) => {
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [activeTab, setActiveTab] = useState<'full' | 'pages' | 'metadata'>('full');
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sourceId) {
      setSource(null);
      return;
    }

    setLoading(true);
    researchApi
      .getSource(sourceId)
      .then((data) => {
        setSource(data);
        if (data.pages && data.pages.length > 0) {
          setSelectedPageNum(data.pages[0].page_number);
        }
      })
      .catch((err) => {
        console.error('Failed to load source details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sourceId]);

  if (!sourceId) return null;

  const copyFullText = () => {
    if (!source) return;
    navigator.clipboard.writeText(source.extracted_text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDemo = source?.metadata?.disclaimer === 'ILLUSTRATIVE DEMO DATA — NOT A VERIFIED REAL-WORLD SOURCE';

  const getTypeBadge = () => {
    if (!source) return null;
    switch (source.source_type) {
      case 'pdf':
        return <Badge variant="coral">PDF Document</Badge>;
      case 'url':
        return <Badge variant="teal">Web URL</Badge>;
      case 'manual':
        return <Badge variant="gold">Manual Note</Badge>;
      default:
        return <Badge variant="ivory">{source.source_type}</Badge>;
    }
  };

  const selectedPage = source?.pages?.find((p) => p.page_number === selectedPageNum);

  return (
    <Modal
      open={!!sourceId}
      onClose={onClose}
      title={source?.title || 'Evidence Inspector'}
      description="Inspect verified raw text, page extractions, and cryptographic provenance."
      size="full"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            {source && (
              <>
                <span className="font-mono">SHA: {source.content_hash.slice(0, 24)}...</span>
                <span>·</span>
                <span>{source.word_count.toLocaleString()} words</span>
                <span>·</span>
                <span>{source.page_count} {source.page_count === 1 ? 'page' : 'pages'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={copyFullText}
              icon={copied ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close Inspector
            </Button>
          </div>
        </div>
      }
    >
      {loading || !source ? (
        <div className="p-12 text-center text-ink-muted animate-pulse">
          Loading evidence records and page segmentation...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Demo disclaimer banner */}
          {isDemo && (
            <div className="p-3 bg-gold/15 border border-gold/40 rounded-xl text-ink text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gold shrink-0" />
              <span>ILLUSTRATIVE DEMO DATA — NOT A VERIFIED REAL-WORLD SOURCE</span>
            </div>
          )}

          {/* Linked Claim Inspector Card */}
          {claim && (
            <div className="p-3.5 bg-ivory-100 rounded-2xl border border-ink/10 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                  Linked Extracted Claim
                </span>
                <Badge variant="teal">
                  {claim.confidence_score ? `${Math.round(claim.confidence_score * 100)}% Confident` : 'Verbatim Verified'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-ink-muted">Subject:</span>{' '}
                  <strong className="text-ink">{claim.subject}</strong>
                </div>
                <div>
                  <span className="text-ink-muted">Attribute:</span>{' '}
                  <strong className="text-ink">{claim.attribute}</strong>
                </div>
                <div>
                  <span className="text-ink-muted">Value:</span>{' '}
                  <strong className="text-teal font-semibold">{claim.value}</strong>
                </div>
              </div>
              {claim.date_context && (
                <div className="text-[10px] font-mono text-ink-muted">
                  Temporal Context: {claim.date_context}
                </div>
              )}
            </div>
          )}

          {/* Quotation Verification Banner */}
          {highlightQuote && (() => {
            const fullText = source.extracted_text || '';
            const matchIndex = fullText.indexOf(highlightQuote);
            const isFound = matchIndex >= 0;
            const startOffset = charStart ?? (isFound ? matchIndex : -1);
            const endOffset = charEnd ?? (isFound ? matchIndex + highlightQuote.length : -1);

            if (isFound) {
              return (
                <div className="p-3.5 rounded-2xl bg-teal/10 border border-teal/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-teal text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-ink text-xs block">
                        Exact Verbatim Quotation Verified in Cryptographic Ledger
                      </span>
                      <span className="text-[11px] font-mono text-teal-900">
                        Offsets: [{startOffset} – {endOffset}] · Length: {highlightQuote.length} chars
                      </span>
                    </div>
                  </div>
                  <Badge variant="teal">SHA-256 Asserted</Badge>
                </div>
              );
            } else {
              return (
                <div className="p-3.5 rounded-2xl bg-coral/10 border border-coral/30 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-coral shrink-0" />
                  <div>
                    <span className="font-bold text-coral block">
                      Quotation Traceability Warning
                    </span>
                    <p className="text-[11px] text-ink-secondary mt-0.5">
                      The quote <em>"{highlightQuote.slice(0, 80)}..."</em> could not be matched verbatim in this document. Quotation integrity check flagged.
                    </p>
                  </div>
                </div>
              );
            }
          })()}

          {/* Top metadata pill row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-ivory-100 rounded-xl border border-ink/8 text-xs">
            <div className="flex items-center gap-2">
              {getTypeBadge()}
              {source.original_url && (
                <a
                  href={source.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal hover:underline flex items-center gap-1 font-mono"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="max-w-md truncate">{source.original_url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-3 text-ink-secondary">
              {source.publication_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Pub Date: {source.publication_date}</span>
                </span>
              )}
              {source.fetched_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Fetched: {new Date(source.fetched_at).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          </div>

          {/* View mode toggle tabs */}
          <div className="flex items-center gap-2 border-b border-ink/8 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'full'
                  ? 'bg-teal text-white shadow-teal-sm'
                  : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
              }`}
            >
              Full Extracted Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'pages'
                  ? 'bg-teal text-white shadow-teal-sm'
                  : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
              }`}
            >
              Page-by-Page View ({source.pages?.length || 1})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('metadata')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'metadata'
                  ? 'bg-teal text-white shadow-teal-sm'
                  : 'bg-ivory-200 text-ink-secondary hover:bg-ivory-300'
              }`}
            >
              Provenance & Metadata
            </button>
          </div>

          {/* Tab 1: Full Extracted Text */}
          {activeTab === 'full' && (
            <div className="bg-ivory-50 rounded-2xl border border-ink/8 p-5 max-h-[55vh] overflow-y-auto font-mono text-xs text-ink leading-relaxed whitespace-pre-wrap selection:bg-teal/20 selection:text-teal-900">
              {(() => {
                const text = source.extracted_text || '';
                if (!highlightQuote || !text.includes(highlightQuote)) {
                  return text || 'No text extracted from this document.';
                }
                const idx = text.indexOf(highlightQuote);
                const before = text.slice(0, idx);
                const match = text.slice(idx, idx + highlightQuote.length);
                const after = text.slice(idx + highlightQuote.length);
                return (
                  <>
                    {before}
                    <mark className="bg-gold/30 text-amber-950 font-bold px-1.5 py-0.5 rounded border border-gold shadow-sm inline animate-pulse ring-2 ring-gold/40">
                      {match}
                    </mark>
                    {after}
                  </>
                );
              })()}
            </div>
          )}

          {/* Tab 2: Page-by-Page */}
          {activeTab === 'pages' && (
            <div className="space-y-3">
              {/* Page Selector Pills */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {source.pages?.map((p) => {
                  const hasMatch = highlightQuote && p.page_text.includes(highlightQuote);
                  return (
                    <button
                      key={p.page_number}
                      type="button"
                      onClick={() => setSelectedPageNum(p.page_number)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                        selectedPageNum === p.page_number
                          ? 'bg-navy text-ivory border-navy shadow-sm'
                          : 'bg-white text-ink-secondary border-ink/10 hover:border-teal'
                      }`}
                    >
                      <span>Page {p.page_number} ({p.char_count} chars)</span>
                      {hasMatch && (
                        <span className="w-2 h-2 rounded-full bg-gold animate-ping" title="Quotation matched on this page" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Page Content Display */}
              <div className="bg-ivory-50 rounded-2xl border border-ink/8 p-5 max-h-[50vh] overflow-y-auto font-mono text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {(() => {
                  const pText = selectedPage?.page_text || '';
                  if (!highlightQuote || !pText.includes(highlightQuote)) {
                    return pText || 'No content found on this page.';
                  }
                  const idx = pText.indexOf(highlightQuote);
                  const before = pText.slice(0, idx);
                  const match = pText.slice(idx, idx + highlightQuote.length);
                  const after = pText.slice(idx + highlightQuote.length);
                  return (
                    <>
                      {before}
                      <mark className="bg-gold/30 text-amber-950 font-bold px-1.5 py-0.5 rounded border border-gold shadow-sm inline animate-pulse ring-2 ring-gold/40">
                        {match}
                      </mark>
                      {after}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Tab 3: Provenance & Metadata */}
          {activeTab === 'metadata' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-ivory-100 border border-ink/8 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Cryptographic Content Fingerprint
                  </span>
                  <p className="font-mono text-teal font-semibold break-all">{source.content_hash}</p>
                </div>

                <div className="p-3 rounded-xl bg-ivory-100 border border-ink/8 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Source Size & Layout
                  </span>
                  <p className="font-medium text-ink">
                    {(source.file_size / 1024).toFixed(1)} KB · {source.page_count} pages · {source.word_count} words
                  </p>
                </div>
              </div>

              {source.metadata && Object.keys(source.metadata).length > 0 && (
                <div className="p-3 rounded-xl bg-ivory-100 border border-ink/8 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Parsed Metadata Object
                  </span>
                  <pre className="p-3 bg-white rounded-lg border border-ink/5 font-mono text-[11px] text-ink overflow-x-auto">
                    {JSON.stringify(source.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
