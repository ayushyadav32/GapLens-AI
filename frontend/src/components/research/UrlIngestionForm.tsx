import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Globe, ShieldCheck, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { IngestResponse } from '@/lib/api/researchApi';

interface UrlIngestionFormProps {
  onIngest: (urls: string[]) => Promise<IngestResponse>;
  loading?: boolean;
}

export const UrlIngestionForm = ({ onIngest, loading = false }: UrlIngestionFormProps) => {
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<IngestResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);

    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      setError('Please enter at least one valid website URL.');
      return;
    }

    // Basic format check
    for (const u of urls) {
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        setError(`Invalid URL "${u}". URLs must start with http:// or https://`);
        return;
      }
    }

    try {
      const res = await onIngest(urls);
      setResults(res);
      if (res.created_count > 0) {
        setUrlInput('');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to ingest URL(s).');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-ink/8">
        <div>
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal" />
            Authoritative Web URL Ingestion
          </h4>
          <p className="text-xs text-ink-muted mt-0.5">
            Extract clean text, article headers, and publication dates directly from government portals, academic repositories, and public documentation.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          SSRF Guard Active
        </div>
      </div>

      <Textarea
        label="Target URLs (one per line)"
        placeholder="https://scholarships.gov.in/guidelines/2026-circular&#10;https://education.state.gov/notifications/merit-criteria"
        value={urlInput}
        onChange={(e) => {
          setUrlInput(e.target.value);
          if (error) setError(null);
        }}
        rows={4}
        hint="Supports multiple URLs. Each address is scanned for SSRF vulnerabilities, redirects are verified, and metadata is parsed."
        disabled={loading}
      />

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
                Successfully ingested <strong>{results.created_count}</strong> web source(s) into this investigation.
              </span>
            </div>
          )}

          {results.skipped_duplicates?.length > 0 && (
            <div className="p-2.5 bg-gold/10 border border-gold/20 rounded-xl text-ink text-xs space-y-1">
              <span className="font-bold text-gold">Skipped Duplicate Sources:</span>
              <ul className="list-disc pl-4 text-ink-muted space-y-0.5">
                {results.skipped_duplicates.map((dup, i) => (
                  <li key={i}>{dup.url || 'URL'}: {dup.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {results.errors?.length > 0 && (
            <div className="p-2.5 bg-coral/10 border border-coral/20 rounded-xl text-coral text-xs space-y-1">
              <span className="font-bold">Errors Encountered:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {results.errors.map((errItem, i) => (
                  <li key={i}>{errItem.url}: {errItem.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-ink-muted">
          Max 10MB per page · Timeout 10s · Strip scripts, navigation & footers
        </span>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          icon={<Plus className="w-4 h-4" />}
          disabled={loading || !urlInput.trim()}
        >
          Ingest Web Sources
        </Button>
      </div>
    </form>
  );
};
