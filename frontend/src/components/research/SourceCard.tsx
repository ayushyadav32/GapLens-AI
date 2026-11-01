import { useState } from 'react';
import { SourceDocument } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  Globe,
  FileEdit,
  Eye,
  Trash2,
  Calendar,
  Layers,
  Hash,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface SourceCardProps {
  source: SourceDocument;
  onInspect: (source: SourceDocument) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdateCategory?: (id: string, category: 'reference' | 'evidence') => Promise<void>;
  loading?: boolean;
}

export const SourceCard = ({ source, onInspect, onDelete, onUpdateCategory, loading = false }: SourceCardProps) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const copyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(source.content_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${source.title}" from this investigation?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(source.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const isDemo = source.metadata?.disclaimer === 'ILLUSTRATIVE DEMO DATA — NOT A VERIFIED REAL-WORLD SOURCE';

  const getTypeIcon = () => {
    switch (source.source_type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-coral" />;
      case 'url':
        return <Globe className="w-4 h-4 text-teal" />;
      case 'manual':
        return <FileEdit className="w-4 h-4 text-gold" />;
      default:
        return <FileText className="w-4 h-4 text-ink-muted" />;
    }
  };

  const getTypeBadge = () => {
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

  return (
    <div className="bg-white rounded-2xl border border-ink/8 hover:border-teal/30 p-4 transition-all duration-200 shadow-sm hover:shadow-card flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {getTypeBadge()}
            {source.document_category === 'evidence' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 uppercase tracking-wider">
                Supporting Evidence
              </span>
            ) : source.document_category === 'uncertain' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider animate-pulse">
                Please choose document type
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-200 uppercase tracking-wider">
                Reference / Guideline
              </span>
            )}
            {onUpdateCategory && (
              <select
                value={source.document_category === 'evidence' ? 'evidence' : source.document_category === 'uncertain' ? '' : 'reference'}
                onChange={(e) => {
                  const val = e.target.value as 'reference' | 'evidence';
                  if (val) onUpdateCategory(source.id, val);
                }}
                className="text-[11px] font-semibold bg-ivory-100 border border-ink/15 rounded px-2 py-0.5 text-ink hover:border-teal focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
                title="Change document classification"
              >
                {source.document_category === 'uncertain' && (
                  <option value="" disabled>
                    Choose type...
                  </option>
                )}
                <option value="reference">Reference / Guideline</option>
                <option value="evidence">Supporting Evidence</option>
              </select>
            )}
            {source.evidence_type && (
              <span className="text-[10px] text-ink-muted bg-ivory-200 px-1.5 py-0.5 rounded font-mono">
                {source.evidence_type.replace(/_/g, ' ')}
              </span>
            )}
            {isDemo && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold/15 text-gold border border-gold/30 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-gold" />
                Demo Source
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                source.extraction_status === 'READY'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : source.extraction_status === 'FAILED'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  source.extraction_status === 'READY'
                    ? 'bg-emerald-500'
                    : source.extraction_status === 'FAILED'
                    ? 'bg-rose-500'
                    : 'bg-amber-500 animate-ping'
                }`}
              />
              {source.extraction_status}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-ink line-clamp-2 hover:text-teal transition-colors">
          {source.title}
        </h3>

        {/* URL Link or filename */}
        {source.original_url && (
          <a
            href={source.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal hover:underline flex items-center gap-1 truncate font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{source.original_url}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        )}
      </div>

      {/* Meta Stats & Date */}
      <div className="space-y-2.5 pt-2 border-t border-ink/5 text-xs text-ink-muted">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-ink-muted" />
            <span>{source.page_count} {source.page_count === 1 ? 'page' : 'pages'}</span>
            <span>·</span>
            <span>{source.word_count.toLocaleString()} words</span>
          </span>

          {source.publication_date && (
            <span className="flex items-center gap-1 font-medium text-ink-secondary">
              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
              <span>{source.publication_date}</span>
            </span>
          )}
        </div>

        {/* SHA-256 fingerprint */}
        <div className="flex items-center justify-between bg-ivory-100 px-2.5 py-1.5 rounded-lg border border-ink/5 font-mono text-[11px]">
          <span className="flex items-center gap-1 text-ink-muted truncate">
            <Hash className="w-3 h-3 shrink-0 text-teal" />
            <span className="truncate">SHA: {source.content_hash.slice(0, 16)}...</span>
          </span>
          <button
            type="button"
            onClick={copyHash}
            title="Copy full SHA-256 hash"
            className="text-ink-muted hover:text-teal p-0.5 rounded transition-colors"
          >
            {copiedHash ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline-teal"
          size="sm"
          onClick={() => onInspect(source)}
          icon={<Eye className="w-3.5 h-3.5" />}
        >
          Inspect Evidence
        </Button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || loading}
          title="Remove source"
          className="p-2 text-ink-muted hover:text-coral hover:bg-coral/10 rounded-xl transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
