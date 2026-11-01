import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { FileEdit, Calendar, Plus, AlertCircle, CheckCircle2, Hash } from 'lucide-react';
import { IngestResponse } from '@/lib/api/researchApi';

interface ManualTextFormProps {
  onIngest: (payload: { title: string; text: string; publication_date?: string }) => Promise<IngestResponse>;
  loading?: boolean;
}

export const ManualTextForm = ({ onIngest, loading = false }: ManualTextFormProps) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [pubDate, setPubDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Live stats
  const { wordCount, charCount } = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return { wordCount: words, charCount: text.length };
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please provide text content or reference excerpts.');
      return;
    }
    setError(null);
    setSuccess(false);

    try {
      const res = await onIngest({
        title: title.trim() || 'Manual Research Note',
        text: text.trim(),
        publication_date: pubDate.trim() || undefined,
      });

      if (res.created_count > 0) {
        setSuccess(true);
        setTitle('');
        setText('');
        setPubDate('');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to ingest manual text.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-ink/8">
        <div>
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-teal" />
            Manual Intelligence & Hearing Excerpts
          </h4>
          <p className="text-xs text-ink-muted mt-0.5">
            Add offline regulatory notes, meeting minutes, interview transcripts, or leaked memos into the evidence pool.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-ink-muted bg-ivory-200 px-3 py-1 rounded-full border border-ink/8">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Document / Excerpt Title"
          placeholder="e.g., State Advisory Council Hearing Notes"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          hint="Identifies this source across gap and contradiction analyses."
          disabled={loading}
        />

        <Input
          label="Publication / Observation Date (Optional)"
          type="date"
          value={pubDate}
          onChange={(e) => setPubDate(e.target.value)}
          icon={<Calendar className="w-4 h-4" />}
          hint="Crucial for chronological contradiction ordering and staleness detection."
          disabled={loading}
        />
      </div>

      <Textarea
        label="Raw Content or Transcript (Required)"
        placeholder="Paste full text, excerpts, clauses, or verbatim testimony here..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
          if (success) setSuccess(false);
        }}
        rows={6}
        required
        disabled={loading}
      />

      {error && (
        <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-coral text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-teal/10 border border-teal/20 rounded-xl text-teal text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Manual evidence source successfully ingested and fingerprinted.</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-ink-muted flex items-center gap-1">
          <Hash className="w-3.5 h-3.5" />
          SHA-256 fingerprint generated automatically upon submission
        </span>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          icon={<Plus className="w-4 h-4" />}
          disabled={loading || !text.trim()}
        >
          Add Manual Source
        </Button>
      </div>
    </form>
  );
};
