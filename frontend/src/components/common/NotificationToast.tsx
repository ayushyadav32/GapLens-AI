import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/context/ToastContext';
import type { ToastMessage } from '@/types';

const icons = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const styles = {
  success: 'border-success/20 bg-success/5 text-success',
  error:   'border-coral/20  bg-coral/5  text-coral',
  warning: 'border-warning/20 bg-warning/5 text-warning',
  info:    'border-teal/20  bg-teal/5   text-teal',
};

const Toast = ({ toast, dismiss }: { toast: ToastMessage; dismiss: (id: string) => void }) => {
  const Icon = icons[toast.type];

  return (
    <div className={clsx(
      'flex items-start gap-3 w-80 max-w-full',
      'bg-white rounded-2xl shadow-modal border p-4',
      'animate-slide-in-right',
      styles[toast.type],
    )}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="w-6 h-6 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="assertive"
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
};
