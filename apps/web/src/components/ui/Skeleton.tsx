import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'circle' | 'text';
}

export function Skeleton({
  variant = 'default',
  className,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    default: 'rounded-md',
    text: 'h-4 w-full rounded',
    circle: 'rounded-full',
    card: 'rounded-xl h-32 w-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-800/60 border border-slate-700/20',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
