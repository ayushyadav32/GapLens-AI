import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'teal' | 'gold' | 'coral';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
const variantClasses = {
  default: 'card',
  hover:   'card-hover',
  teal:    'card-teal',
  gold:    'card-gold',
  coral:   'card-coral',
};

export const Card = ({ variant = 'default', padding = 'md', className, children, ...rest }: CardProps) => (
  <div className={clsx(variantClasses[variant], paddingClasses[padding], className)} {...rest}>
    {children}
  </div>
);

// ── MetricCard ────────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  accentColor?: 'teal' | 'gold' | 'coral' | 'success';
  className?: string;
}

const accentBg = { teal: 'bg-teal/10', gold: 'bg-gold/10', coral: 'bg-coral/10', success: 'bg-success/10' };
const accentText = { teal: 'text-teal', gold: 'text-gold', coral: 'text-coral', success: 'text-success' };

export const MetricCard = ({
  label, value, delta, deltaDirection = 'neutral', icon, accentColor = 'teal', className,
}: MetricCardProps) => (
  <div className={clsx('metric-card', className)}>
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="metric-label">{label}</p>
        <p className="metric-value mt-1">{value}</p>
        {delta && (
          <p className={clsx('mt-1 text-xs font-semibold',
            deltaDirection === 'up'   && 'metric-delta-up',
            deltaDirection === 'down' && 'metric-delta-down',
            deltaDirection === 'neutral' && 'text-ink-muted',
          )}>
            {delta}
          </p>
        )}
      </div>
      {icon && (
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
          accentBg[accentColor], accentText[accentColor],
        )}>
          {icon}
        </div>
      )}
    </div>
  </div>
);
