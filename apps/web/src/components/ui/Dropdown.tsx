import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: (DropdownItem | { divider: true; key: string })[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 w-56 rounded-lg bg-slate-900 border border-slate-700/80 shadow-2xl py-1 text-sm text-slate-200 animate-slide-up focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item) => {
            if ('divider' in item && item.divider && !('label' in item)) {
              return <div key={item.key} className="my-1 border-t border-slate-800" />;
            }

            const menuItem = item as DropdownItem;
            return (
              <button
                key={menuItem.key}
                disabled={menuItem.disabled}
                onClick={() => {
                  if (!menuItem.disabled) {
                    menuItem.onClick?.();
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer select-none',
                  menuItem.danger
                    ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  menuItem.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {menuItem.icon && <span className="w-4 h-4 shrink-0 text-slate-400">{menuItem.icon}</span>}
                  <span>{menuItem.label}</span>
                </div>
                {menuItem.shortcut && (
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                    {menuItem.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
