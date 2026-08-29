import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'glow';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading = false,
      leftIcon,
      rightIcon,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isSpinnerActive = isLoading || loading;
    const effectiveLeftIcon = leftIcon || icon;

    const sizeClasses = {
      xs: 'h-7 px-2.5 text-xs rounded',
      sm: 'h-8 px-3 text-xs rounded-md font-medium',
      md: 'h-9 px-4 text-sm rounded-md font-medium',
      lg: 'h-11 px-6 text-base rounded-lg font-medium',
      icon: 'h-9 w-9 p-0 flex items-center justify-center rounded-md',
    };

    const variantClasses = {
      primary:
        'bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 active:bg-cyan-600 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      secondary:
        'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-850 border border-slate-700 hover:border-slate-600 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      outline:
        'bg-transparent text-slate-200 border border-slate-700 hover:border-slate-500 hover:bg-slate-800/60 active:bg-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      ghost:
        'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-slate-400',
      danger:
        'bg-rose-600 text-white font-semibold hover:bg-rose-500 active:bg-rose-700 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      success:
        'bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:bg-emerald-700 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
      glow:
        'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 shadow-glow-cyan transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-400',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinnerActive}
        className={cn(
          'inline-flex items-center justify-center gap-2 select-none outline-none disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isSpinnerActive ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>
        )}
        {children}
        {!isSpinnerActive && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
