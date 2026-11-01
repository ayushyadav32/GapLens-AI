import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'teal' | 'gold' | 'coral' | 'success' | 'warning' | 'critical' | 'navy' | 'ivory'
  | 'severity-critical' | 'severity-high' | 'severity-medium' | 'severity-low';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  teal:              'badge-teal',
  gold:              'badge-gold',
  coral:             'badge-coral',
  success:           'badge-success',
  warning:           'badge-warning',
  critical:          'badge-critical',
  navy:              'badge-navy',
  ivory:             'badge-ivory',
  'severity-critical': 'badge-critical',
  'severity-high':     'badge-high',
  'severity-medium':   'badge-medium',
  'severity-low':      'badge-low',
};

const dotColors: Partial<Record<BadgeVariant, string>> = {
  teal:              'bg-teal',
  gold:              'bg-gold',
  coral:             'bg-coral',
  success:           'bg-success',
  warning:           'bg-warning',
  critical:          'bg-critical',
  'severity-critical': 'bg-critical',
  'severity-high':     'bg-coral',
  'severity-medium':   'bg-warning',
  'severity-low':      'bg-teal',
};

export const Badge = ({ variant = 'ivory', dot, className, children, ...rest }: BadgeProps) => (
  <span className={clsx('badge', variantClasses[variant], className)} {...rest}>
    {dot && dotColors[variant] && (
      <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
    )}
    {children}
  </span>
);
