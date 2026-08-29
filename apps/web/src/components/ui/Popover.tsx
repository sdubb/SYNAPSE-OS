import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  position?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  className?: string;
}

export function Popover({ trigger, content, position = 'bottom-start', className }: PopoverProps) {
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

  const positionClasses = {
    'bottom-start': 'top-full left-0 mt-2',
    'bottom-end': 'top-full right-0 mt-2',
    'top-start': 'bottom-full left-0 mb-2',
    'top-end': 'bottom-full right-0 mb-2',
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl p-3 animate-fade-in text-sm text-slate-200 min-w-[200px]',
            positionClasses[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
