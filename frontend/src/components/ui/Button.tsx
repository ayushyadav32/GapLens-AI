import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'outline-teal' | 'outline-ivory' | 'gold' | 'danger' | 'secondary';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:       'bg-teal text-white hover:bg-teal-400 shadow-teal-sm hover:shadow-teal focus:ring-teal/40',
  ghost:         'bg-transparent text-ink-secondary hover:bg-ink/5 focus:ring-ink/10',
  'outline-teal':'border border-teal text-teal bg-transparent hover:bg-teal/5 focus:ring-teal/30',
  'outline-ivory':'border border-white/20 text-white bg-transparent hover:bg-white/10 focus:ring-white/20',
  gold:          'bg-gold text-navy hover:bg-gold-light shadow-gold-sm focus:ring-gold/30',
  danger:        'bg-coral text-white hover:bg-coral-dark focus:ring-coral/30',
  secondary:     'bg-ivory-200 text-ink hover:bg-ivory-300 focus:ring-ink/10',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-2   text-sm   gap-1.5',
  md: 'px-5   py-2.5 text-sm   gap-2',
  lg: 'px-6   py-3   text-base gap-2',
  xl: 'px-8   py-3.5 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, children, className, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold rounded-xl',
        'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        'hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  ),
);
Button.displayName = 'Button';
