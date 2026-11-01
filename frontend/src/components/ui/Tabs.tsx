import { ReactNode, useState } from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export const Tabs = ({ tabs, activeKey, onChange, variant = 'underline', className }: TabsProps) => (
  <div
    className={clsx(
      variant === 'underline' && 'flex gap-1 border-b border-ink/8',
      variant === 'pill' && 'flex gap-1 p-1 bg-ivory-200 rounded-xl w-fit',
      className,
    )}
    role="tablist"
  >
    {tabs.map((tab) => (
      <button
        key={tab.key}
        role="tab"
        aria-selected={activeKey === tab.key}
        disabled={tab.disabled}
        onClick={() => onChange(tab.key)}
        className={clsx(
          'inline-flex items-center gap-2 font-medium text-sm transition-all duration-200 select-none',
          tab.disabled && 'opacity-40 cursor-not-allowed',
          // Underline variant
          variant === 'underline' && [
            'px-4 py-2.5 border-b-2 -mb-px',
            activeKey === tab.key
              ? 'text-teal border-teal'
              : 'text-ink-secondary border-transparent hover:text-ink hover:border-ink/20',
          ],
          // Pill variant
          variant === 'pill' && [
            'px-4 py-2 rounded-lg',
            activeKey === tab.key
              ? 'bg-white text-ink shadow-sm'
              : 'text-ink-secondary hover:text-ink',
          ],
        )}
      >
        {tab.icon && <span className="shrink-0">{tab.icon}</span>}
        {tab.label}
        {tab.count !== undefined && (
          <span className={clsx(
            'px-1.5 py-0.5 rounded-full text-xs font-bold',
            activeKey === tab.key ? 'bg-teal/15 text-teal' : 'bg-ink/8 text-ink-muted',
          )}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ── Tab Panel ─────────────────────────────────────────────────────────────────
interface TabPanelProps {
  activeKey: string;
  tabKey: string;
  children: ReactNode;
}

export const TabPanel = ({ activeKey, tabKey, children }: TabPanelProps) => {
  if (activeKey !== tabKey) return null;
  return <div role="tabpanel">{children}</div>;
};

// ── useTabs hook ──────────────────────────────────────────────────────────────
export const useTabs = (initial: string) => {
  const [activeKey, setActiveKey] = useState(initial);
  return { activeKey, onChange: setActiveKey };
};
