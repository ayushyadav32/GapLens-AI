import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const Dropdown = ({
  options, value, onChange, placeholder = 'Select…', label, error, disabled, className,
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={clsx('w-full', className)} ref={ref}>
      {label && <label className="label">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'input text-left flex items-center justify-between gap-2',
          error && 'input-error',
          !selected && 'text-ink-muted',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={clsx('w-4 h-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl shadow-modal border border-ink/8 overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left',
                'hover:bg-ivory-100 transition-colors',
                opt.disabled && 'opacity-40 cursor-not-allowed',
                value === opt.value && 'text-teal font-semibold',
              )}
              role="option"
              aria-selected={value === opt.value}
            >
              {opt.icon && <span className="shrink-0 text-ink-muted">{opt.icon}</span>}
              <span className="flex-1">
                <span className="block">{opt.label}</span>
                {opt.description && <span className="text-xs text-ink-muted font-normal">{opt.description}</span>}
              </span>
              {value === opt.value && <Check className="w-4 h-4 text-teal shrink-0" />}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-coral font-medium">{error}</p>}
    </div>
  );
};
