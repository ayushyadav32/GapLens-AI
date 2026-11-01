import { clsx } from 'clsx';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'spinner' | 'dots' | 'skeleton-page';
}

export const LoadingState = ({
  message = 'Loading…',
  size = 'md',
  className,
  variant = 'spinner',
}: LoadingStateProps) => {
  const spinnerSizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

  if (variant === 'skeleton-page') {
    return (
      <div className={clsx('space-y-4 p-6', className)}>
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-4 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="space-y-3 mt-6">
          {[1,2,3,4].map(i => <div key={i} className={clsx('skeleton h-20 rounded-xl', i % 2 === 0 && 'opacity-60')} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <div
        className={clsx(
          'border-2 border-teal/20 border-t-teal rounded-full animate-spin',
          spinnerSizes[size],
        )}
        role="status"
        aria-label={message}
      />
      {message && (
        <p className={clsx('text-ink-secondary font-medium', textSizes[size])}>{message}</p>
      )}
    </div>
  );
};

// ── Full-page loading ─────────────────────────────────────────────────────────
export const PageLoader = ({ message = 'Loading GapLens AI…' }: { message?: string }) => (
  <div className="fixed inset-0 bg-ivory flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-2 border-teal/20 border-t-teal rounded-full animate-spin" />
      <p className="text-sm text-ink-secondary font-medium">{message}</p>
    </div>
  </div>
);
