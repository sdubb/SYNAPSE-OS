import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  position?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  position = 'right',
  size = 'md',
  children,
  footer,
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    right: {
      sm: 'max-w-xs',
      md: 'max-w-md',
      lg: 'max-w-xl',
      xl: 'max-w-2xl',
      full: 'max-w-full',
    },
    left: {
      sm: 'max-w-xs',
      md: 'max-w-md',
      lg: 'max-w-xl',
      xl: 'max-w-2xl',
      full: 'max-w-full',
    },
    bottom: {
      sm: 'max-h-64',
      md: 'max-h-96',
      lg: 'max-h-[60vh]',
      xl: 'max-h-[80vh]',
      full: 'max-h-screen',
    },
  };

  const positionClasses = {
    right: 'inset-y-0 right-0 h-full border-l border-slate-800 animate-slide-in-right',
    left: 'inset-y-0 left-0 h-full border-r border-slate-800 animate-slide-up',
    bottom: 'inset-x-0 bottom-0 w-full border-t border-slate-800 rounded-t-2xl animate-slide-up',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          'fixed bg-slate-900 shadow-2xl flex flex-col z-10 w-full',
          positionClasses[position],
          position === 'bottom' ? sizeClasses.bottom[size] : sizeClasses[position][size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-200 text-sm">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-slate-950/70 border-t border-slate-800 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
