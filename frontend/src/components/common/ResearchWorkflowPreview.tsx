import { Search, FileText, Globe, GitBranch, Zap, Clock, CheckCircle2 } from 'lucide-react';

export const ResearchWorkflowPreview = ({ className = '' }: { className?: string }) => {
  return (
    <div
      className={`bg-[#111C25] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl text-left space-y-5 select-none ${className}`}
    >
      {/* Window Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-coral/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-gold/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-teal inline-block" />
          </div>
          <span className="text-xs font-mono text-white/50 ml-2">gaplens://research-studio</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal/20 text-teal border border-teal/40">
          Live Analysis Preview
        </span>
      </div>

      {/* Step 1: Research Question */}
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
        <div className="flex items-center gap-2 text-teal text-xs font-bold uppercase tracking-wider">
          <Search className="w-3.5 h-3.5 text-teal" />
          <span>Step 1: Research Question</span>
        </div>
        <p className="text-sm font-semibold text-white leading-snug">
          &ldquo;What should a student verify before applying for this scholarship for the 2026–27 academic year?&rdquo;
        </p>
      </div>

      {/* Step 2: Ingested Sources */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
          Step 2: Reviewed Sources (3 Processed)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal shrink-0" />
            <div className="truncate">
              <p className="font-semibold text-white truncate text-[11px]">Central_Guidelines.pdf</p>
              <span className="text-[10px] text-teal font-mono">14 Pages Verified</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gold shrink-0" />
            <div className="truncate">
              <p className="font-semibold text-white truncate text-[11px]">State_Higher_Ed_Portal</p>
              <span className="text-[10px] text-gold font-mono">Web Notice (URL)</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <p className="font-semibold text-white truncate text-[11px]">Affidavit_Mandate.pdf</p>
              <span className="text-[10px] text-amber-400 font-mono">Income Annexure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Actual Findings Detected */}
      <div className="space-y-2.5 pt-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
          Step 4: Real Research Intelligence Detected
        </span>

        {/* Finding 1: Information Gap */}
        <div className="p-3 rounded-2xl bg-teal/10 border border-teal/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal">
              <GitBranch className="w-3.5 h-3.5 text-teal" />
              Information Gap
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal/20 text-teal font-bold uppercase">
              Not Found in Reviewed Sources
            </span>
          </div>
          <p className="text-xs text-white/90 font-medium">
            No document specifies whether continuous residency requires an Executive Magistrate countersignature.
          </p>
        </div>

        {/* Finding 2: Direct Contradiction */}
        <div className="p-3 rounded-2xl bg-coral/10 border border-coral/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-coral">
              <Zap className="w-3.5 h-3.5 text-coral" />
              Source Conflict
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-coral/20 text-coral font-bold uppercase">
              Contradiction
            </span>
          </div>
          <p className="text-xs text-white/90 font-medium">
            State Council restricts income ceiling to <strong>6.0 LPA</strong>, directly conflicting with Central circular stating <strong>8.0 LPA</strong>.
          </p>
        </div>

        {/* Finding 3: Outdated Source Warning */}
        <div className="p-3 rounded-2xl bg-gold/10 border border-gold/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold">
              <Clock className="w-3.5 h-3.5 text-gold" />
              Outdated Cycle Warning
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold/20 text-gold font-bold uppercase">
              Dated: 2024–25
            </span>
          </div>
          <p className="text-xs text-white/90 font-medium">
            Renewal affidavit references superseded 2024–25 notification. Requires verification for current 2026–27 cycle.
          </p>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-white/70">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal" />
          <span>Actionable Verification Checklist: <strong>3 priority tasks generated</strong></span>
        </span>
        <span className="text-teal font-mono text-[11px] font-bold">100% Source-Backed</span>
      </div>
    </div>
  );
};
