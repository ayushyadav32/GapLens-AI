import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  GitBranch,
  Zap,
  Clock,
  CheckSquare,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { ResearchSession, SourceDocument } from '@/types';

interface PriorityIntelligenceQueueProps {
  session: ResearchSession | null;
  sources: SourceDocument[];
}

interface PriorityItem {
  id: string;
  type: 'gap' | 'contradiction' | 'temporal' | 'task';
  title: string;
  sourceTitle: string;
  severity: 'critical' | 'high' | 'medium';
  detail: string;
  route: string;
}

export const PriorityIntelligenceQueue = ({ session, sources }: PriorityIntelligenceQueueProps) => {
  const navigate = useNavigate();

  const isDemo = sources.some(
    (s) => s.metadata?.disclaimer === 'ILLUSTRATIVE DEMO DATA — NOT A VERIFIED REAL-WORLD SOURCE'
  );

  // If demo investigation or sources are loaded, generate structured findings
  const items: PriorityItem[] = isDemo
    ? [
        {
          id: 'item-1',
          type: 'contradiction',
          title: 'Income Ceiling Conflict (6.0 LPA vs 8.0 LPA)',
          sourceTitle: 'State Higher Ed Council vs Central Ministry Guidelines',
          severity: 'critical',
          detail:
            'State Notification restricts applicant eligibility to 6.0 LPA, directly rejecting Central 8.0 LPA provision.',
          route: '/contradictions',
        },
        {
          id: 'item-2',
          type: 'gap',
          title: 'Missing Domicile Magistrate Countersignature Mandate',
          sourceTitle: 'Central Circular F.No. 14-02/2026-NSG',
          severity: 'high',
          detail:
            'Central circular fails to specify whether 7-year continuous residency affidavits require Executive Magistrate countersignature.',
          route: '/gaps',
        },
        {
          id: 'item-3',
          type: 'temporal',
          title: 'Stale Submission Protocol (Physical Dossier Claim)',
          sourceTitle: 'National Student Advisory Portal (Nov 2023 Archive)',
          severity: 'medium',
          detail:
            'Advisory post states offline paper dossiers are accepted, superseded by 2025 mandatory National Scholarship Portal directive.',
          route: '/temporal',
        },
        {
          id: 'item-4',
          type: 'task',
          title: 'Verification Action: Reconcile State Income Ceiling',
          sourceTitle: 'State Collegiate Education Directorate',
          severity: 'high',
          detail:
            'Issue statutory clarification request regarding whether State quota supersedes Central Ministry scholarship budget.',
          route: '/resolution',
        },
      ]
    : sources.length > 0
    ? [
        {
          id: 'item-sources-ready',
          type: 'gap',
          title: 'Corpus Indexed — Awaiting Milestone 5 Gap Decomposition',
          sourceTitle: `${sources.length} Verified Sources Active`,
          severity: 'medium',
          detail:
            'Documents successfully extracted and cryptographically fingerprinted. Ready for automated contradiction matching.',
          route: '/gaps',
        },
      ]
    : [];

  return (
    <div className="bg-white rounded-3xl p-5 border border-ink/8 shadow-card flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink/8 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-coral animate-ping" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-coral">
              OBSERVATORY SURVEILLANCE
            </span>
            <h3 className="text-xs font-bold text-ink flex items-center gap-1.5 mt-0.5">
              <ShieldAlert className="w-3.5 h-3.5 text-coral" />
              Priority Intelligence Queue
            </h3>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-coral/10 text-coral border border-coral/20">
          {items.length} Active Findings
        </span>
      </div>

      {/* Items List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] app-scroll pr-1">
        {items.length > 0 ? (
          items.map((item) => {
            const isCritical = item.severity === 'critical';
            const isHigh = item.severity === 'high';

            return (
              <div
                key={item.id}
                onClick={() => navigate(item.route)}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer group hover:scale-[1.01] ${
                  isCritical
                    ? 'bg-coral/5 border-coral/30 hover:border-coral/60'
                    : isHigh
                    ? 'bg-gold/5 border-gold/30 hover:border-gold/60'
                    : 'bg-ivory-100 border-ink/8 hover:border-teal/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isCritical
                        ? 'bg-coral text-white'
                        : isHigh
                        ? 'bg-gold text-navy'
                        : 'bg-teal text-white'
                    }`}
                  >
                    {item.type === 'contradiction' && <Zap className="w-2.5 h-2.5" />}
                    {item.type === 'gap' && <GitBranch className="w-2.5 h-2.5" />}
                    {item.type === 'temporal' && <Clock className="w-2.5 h-2.5" />}
                    {item.type === 'task' && <CheckSquare className="w-2.5 h-2.5" />}
                    {item.type}
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1 group-hover:text-teal transition-colors">
                    Review <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>

                <h4 className="text-xs font-bold text-ink group-hover:text-teal transition-colors leading-tight">
                  {item.title}
                </h4>

                <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed line-clamp-2">
                  {item.detail}
                </p>

                <p className="text-[10px] text-ink-muted mt-1.5 font-mono truncate">
                  Ref: {item.sourceTitle}
                </p>
              </div>
            );
          })
        ) : (
          <div className="h-48 flex flex-col items-center justify-center p-6 text-center text-ink-muted space-y-1">
            <ShieldAlert className="w-8 h-8 text-ink-muted/30 mb-1" />
            <p className="text-xs font-bold text-ink">Intelligence Queue Clear</p>
            <p className="text-[11px] max-w-xs">
              Once documents are analyzed, conflicting claims and digital dark spots will appear here in order of critical priority.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-ink/8 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => navigate('/gaps')}
          className="text-teal font-bold hover:underline flex items-center gap-1 text-xs"
        >
          View Full Intelligence Radar <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
