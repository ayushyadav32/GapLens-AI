import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface FeatureExplainerProps {
  title: string;
  badge: string;
  badgeColor?: 'teal' | 'gold' | 'coral' | 'blue';
  whatItDoes: string;
  whyItMatters: string;
  whereItComesFrom: string;
  whatYouShouldDo: string;
  className?: string;
  defaultExpanded?: boolean;
}

export const FeatureExplainer: React.FC<FeatureExplainerProps> = ({
  title,
  badge,
  badgeColor = 'teal',
  whatItDoes,
  whyItMatters,
  whereItComesFrom,
  whatYouShouldDo,
  className = '',
  defaultExpanded = false, // Collapsed by default as requested in Part 6
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colorStyles = {
    teal: 'bg-teal/10 border-teal/30 text-teal',
    gold: 'bg-gold/15 border-gold/40 text-gold-dark',
    coral: 'bg-coral/15 border-coral/30 text-coral',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  }[badgeColor];

  return (
    <div
      className={clsx(
        'rounded-xl border transition-all duration-200 overflow-hidden',
        'bg-white/90 border-ink/8 shadow-sm',
        className
      )}
    >
      {/* Compact Unobtrusive Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-ivory-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-teal shrink-0" />
          <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border', colorStyles)}>
            {badge}
          </span>
          <span className="text-xs font-semibold text-ink">
            {title}
          </span>
        </div>

        <button
          type="button"
          className="text-xs text-ink-muted hover:text-teal font-medium flex items-center gap-1 transition-colors"
        >
          <span>{isExpanded ? 'Hide explanation' : 'What is this?'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Explanation (Only when user explicitly clicks) */}
      {isExpanded && (
        <div className="px-5 pb-4 pt-3 border-t border-ink/5 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs bg-ivory-50/50">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted block">
              1. What It Does
            </span>
            <p className="text-ink-secondary leading-relaxed">
              {whatItDoes}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted block">
              2. Why It Matters
            </span>
            <p className="text-ink-secondary leading-relaxed">
              {whyItMatters}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted block">
              3. Where It Comes From
            </span>
            <p className="text-ink-secondary leading-relaxed">
              {whereItComesFrom}
            </p>
          </div>

          <div className="space-y-1 bg-teal/5 p-3 rounded-xl border border-teal/20">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>4. Recommended Next Step</span>
            </span>
            <p className="text-ink font-medium leading-relaxed mt-0.5">
              {whatYouShouldDo}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
