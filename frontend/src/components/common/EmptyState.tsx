import { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState = ({
  icon, title, description, action, secondaryAction, className, size = 'md',
}: EmptyStateProps) => {
  const paddings = { sm: 'py-10', md: 'py-16', lg: 'py-24' };
  const iconSizes = { sm: 'w-12 h-12', md: 'w-16 h-16', lg: 'w-20 h-20' };
  const titleSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' };

  return (
    <div className={clsx('flex flex-col items-center justify-center text-center px-6', paddings[size], className)}>
      {icon && (
        <div className={clsx('rounded-3xl bg-teal/6 flex items-center justify-center text-teal/50 mb-5', iconSizes[size])}>
          {icon}
        </div>
      )}
      <h3 className={clsx('font-bold text-ink mb-2', titleSizes[size])}>{title}</h3>
      {description && (
        <p className="text-sm text-ink-secondary max-w-xs leading-relaxed mb-6">{description}</p>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {action && (
          <Button variant="primary" onClick={action.onClick} icon={action.icon}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};
