import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: React.ReactNode;
  helperText?: string;
  isMonospace?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, isMonospace = false, id, rows = 4, ...props }, ref) => {
    const textareaId =
      id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-slate-300">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            'w-full bg-slate-900/90 text-slate-100 placeholder:text-slate-500 text-sm rounded-md border border-slate-700/80 p-3 outline-none transition-all resize-y',
            'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:bg-slate-900',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isMonospace && 'font-mono text-xs leading-relaxed',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
