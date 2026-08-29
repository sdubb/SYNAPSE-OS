import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  glow?: 'cyan' | 'purple' | 'emerald' | 'rose' | 'none';
  variant?: 'default' | 'elevated' | 'subtle' | 'outline';
}

export function Card({
  className,
  hoverEffect = false,
  glow = 'none',
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const variantClasses = {
    default: 'bg-slate-900/90 border-slate-800',
    elevated: 'bg-slate-850 border-slate-700/80 shadow-lg',
    subtle: 'bg-slate-950/60 border-slate-850',
    outline: 'bg-transparent border-slate-800',
  };

  const glowClasses = {
    none: '',
    cyan: 'shadow-glow-cyan border-cyan-500/30',
    purple: 'shadow-glow-purple border-purple-500/30',
    emerald: 'shadow-glow-emerald border-emerald-500/30',
    rose: 'shadow-glow-rose border-rose-500/30',
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all text-slate-100',
        variantClasses[variant],
        glowClasses[glow],
        hoverEffect && 'hover:border-slate-600 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 flex flex-col space-y-1.5 border-b border-slate-800/80', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold tracking-tight text-white', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-slate-400', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('p-4 px-5 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
}
