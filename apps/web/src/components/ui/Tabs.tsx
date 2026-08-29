import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: 'pills' | 'underline' | 'segmented';
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode | number | string;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: 'pills' | 'underline' | 'segmented';
  children?: React.ReactNode;
  className?: string;

  // Simple array prop support
  tabs?: TabItem[];
  activeTab?: string;
  onChange?: (tab: string) => void;
}

export function Tabs({
  value,
  defaultValue = '',
  onValueChange,
  variant = 'segmented',
  children,
  className,
  tabs,
  activeTab: controlledActiveTab,
  onChange,
}: TabsProps) {
  const isArrayMode = Boolean(tabs && tabs.length > 0);
  const effectiveValue = controlledActiveTab !== undefined ? controlledActiveTab : value;
  const initialDefault = defaultValue || (tabs && tabs[0]?.id) || '';

  const [internalTab, setInternalTab] = useState(initialDefault);
  const activeTab = effectiveValue !== undefined ? effectiveValue : internalTab;

  const setActiveTab = (newTab: string) => {
    if (effectiveValue === undefined) {
      setInternalTab(newTab);
    }
    onValueChange?.(newTab);
    onChange?.(newTab);
  };

  if (isArrayMode && tabs) {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg w-fit', className)}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer select-none',
                isActive
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      <div className={cn('w-full flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsList must be used inside Tabs');

  const listClasses = {
    segmented: 'inline-flex items-center p-1 bg-slate-900/80 border border-slate-800 rounded-lg',
    pills: 'inline-flex items-center gap-1 bg-transparent',
    underline: 'inline-flex items-center border-b border-slate-800 w-full gap-4',
  };

  return <div className={cn(listClasses[ctx.variant], className)}>{children}</div>;
}

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export function TabTrigger({ value, children, className, icon, badge, disabled }: TabTriggerProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabTrigger must be used inside Tabs');

  const isActive = ctx.activeTab === value;

  const triggerStyles = {
    segmented: cn(
      'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer select-none',
      isActive
        ? 'bg-slate-800 text-cyan-400 font-semibold shadow-inner-glow'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
    ),
    pills: cn(
      'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 cursor-pointer select-none',
      isActive
        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    ),
    underline: cn(
      'pb-2 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer select-none',
      isActive
        ? 'border-cyan-400 text-cyan-400 font-semibold'
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
    ),
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => ctx.setActiveTab(value)}
      className={cn(triggerStyles[ctx.variant], disabled && 'opacity-50 pointer-events-none', className)}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge && <span className="ml-1">{badge}</span>}
    </button>
  );
}

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabContent must be used inside Tabs');

  if (ctx.activeTab !== value) return null;

  return <div className={cn('pt-3 outline-none animate-fade-in', className)}>{children}</div>;
}
