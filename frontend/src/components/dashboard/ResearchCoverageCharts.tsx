import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { Layers, PieChart as PieIcon, BarChart3, ShieldCheck, AlertCircle } from 'lucide-react';
import { SourceDocument, ResearchSession, DashboardStats } from '@/types';

interface ResearchCoverageChartsProps {
  session: ResearchSession | null;
  sources: SourceDocument[];
  dashboardStats?: DashboardStats | null;
}

const TYPE_COLORS: Record<string, string> = {
  pdf: '#E47767', // Coral
  url: '#087F83', // Teal
  manual: '#D59A55', // Champagne Gold
};

export const ResearchCoverageCharts = ({ session, sources, dashboardStats }: ResearchCoverageChartsProps) => {
  // 1. Source Type Distribution
  const typeDistribution = useMemo(() => {
    if (sources.length > 0) {
      const counts: Record<string, number> = { pdf: 0, url: 0, manual: 0 };
      sources.forEach((s) => {
        counts[s.source_type] = (counts[s.source_type] || 0) + 1;
      });

      return [
        { name: 'PDF Documents', value: counts.pdf, color: TYPE_COLORS.pdf, type: 'pdf' },
        { name: 'Web URLs', value: counts.url, color: TYPE_COLORS.url, type: 'url' },
        { name: 'Manual Notes', value: counts.manual, color: TYPE_COLORS.manual, type: 'manual' },
      ].filter((item) => item.value > 0);
    }

    if (dashboardStats && dashboardStats.total_sources > 0) {
      const b = dashboardStats.source_type_breakdown;
      return [
        { name: 'PDF Documents', value: b.pdf || 0, color: TYPE_COLORS.pdf, type: 'pdf' },
        { name: 'Web URLs', value: b.url || 0, color: TYPE_COLORS.url, type: 'url' },
        { name: 'Manual Notes', value: b.manual || 0, color: TYPE_COLORS.manual, type: 'manual' },
      ].filter((item) => item.value > 0);
    }

    return [];
  }, [sources, dashboardStats]);

  // 2. Evidence Density Volume by Source
  const densityData = useMemo(() => {
    if (sources.length === 0) return [];
    return sources.map((s) => ({
      name: s.title.length > 20 ? s.title.slice(0, 18) + '...' : s.title,
      words: s.word_count,
      pages: s.page_count,
      type: s.source_type,
    }));
  }, [sources]);

  // 3. Simulated/Projected Intelligence Severity Breakdown based on session state
  const severityData = useMemo(() => {
    if (sources.length === 0) return [];
    return [
      { name: 'Critical Gap', count: sources.length > 2 ? 1 : 0, color: '#E47767' },
      { name: 'Cross-Contradiction', count: sources.length > 1 ? 1 : 0, color: '#D59A55' },
      { name: 'Temporal Staleness', count: sources.some((s) => s.publication_date?.startsWith('2023')) ? 1 : 0, color: '#D59A55' },
      { name: 'Verified Claims', count: sources.length * 3, color: '#087F83' },
    ];
  }, [sources]);

  const hasData = sources.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Chart 1: Source Ingestion Vectors ── */}
      <div className="bg-white rounded-3xl p-5 border border-ink/8 shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-ink/8 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
              INGESTION VECTORS
            </span>
            <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 mt-0.5">
              <PieIcon className="w-3.5 h-3.5 text-teal" />
              Source Ingestion Taxonomy
            </h4>
          </div>
          <span className="text-[11px] font-mono font-semibold text-ink-muted">
            {sources.length} Total Sources
          </span>
        </div>

        <div className="py-4 h-56 flex items-center justify-center">
          {hasData && typeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const pct = ((data.value / sources.length) * 100).toFixed(0);
                      return (
                        <div className="bg-navy text-white text-xs p-2.5 rounded-xl shadow-xl border border-white/10">
                          <p className="font-bold">{data.name}</p>
                          <p className="text-teal font-mono mt-0.5">
                            {data.value} source(s) ({pct}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center p-6 text-ink-muted space-y-1">
              <PieIcon className="w-8 h-8 mx-auto text-ink-muted/30 mb-1" />
              <p className="text-xs font-bold text-ink">No Source Breakdown Available</p>
              <p className="text-[11px] max-w-xs">Ingest PDFs, web URLs, or transcripts to visualize source diversity.</p>
            </div>
          )}
        </div>

        {/* Legend */}
        {hasData && (
          <div className="flex items-center justify-around pt-3 border-t border-ink/8 text-[11px] text-ink-secondary">
            {typeDistribution.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span>
                  {d.name}: <strong>{d.value}</strong>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chart 2: Evidence Volume & Word Density ── */}
      <div className="bg-white rounded-3xl p-5 border border-ink/8 shadow-card flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-ink/8 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
              EVIDENCE DENSITY
            </span>
            <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 mt-0.5">
              <BarChart3 className="w-3.5 h-3.5 text-teal" />
              Extracted Word Volume by Document
            </h4>
          </div>
          <span className="text-[11px] font-mono font-semibold text-ink-muted">
            {sources.reduce((a, b) => a + b.word_count, 0).toLocaleString()} Total Words
          </span>
        </div>

        <div className="py-4 h-56 flex items-center justify-center">
          {hasData && densityData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={densityData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#17252B10" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#687579' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#687579' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-navy text-white text-xs p-2.5 rounded-xl shadow-xl border border-white/10 font-mono">
                          <p className="font-bold font-sans text-teal">{data.name}</p>
                          <p className="mt-1">{data.words.toLocaleString()} extracted words</p>
                          <p className="text-white/60">{data.pages} document pages</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="words" fill="#087F83" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center p-6 text-ink-muted space-y-1">
              <BarChart3 className="w-8 h-8 mx-auto text-ink-muted/30 mb-1" />
              <p className="text-xs font-bold text-ink">Evidence Volume Idle</p>
              <p className="text-[11px] max-w-xs">Text densities will populate as documents and circulars are ingested.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        {hasData && (
          <div className="pt-3 border-t border-ink/8 flex items-center justify-between text-[11px] text-ink-muted font-mono">
            <span>Granular Page-Level Text Parsing Active</span>
            <span className="text-teal font-semibold">PyMuPDF + BeautifulSoup</span>
          </div>
        )}
      </div>
    </div>
  );
};
