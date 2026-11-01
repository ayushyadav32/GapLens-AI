import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, subtitle, icon, actions, className }: PageHeaderProps) => (
  <div className={clsx('flex items-start justify-between gap-4 flex-wrap', className)}>
    <div className="flex items-start gap-4 min-w-0">
      {icon && (
        <div className="w-11 h-11 bg-teal/10 rounded-xl flex items-center justify-center text-teal shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
  </div>
);
