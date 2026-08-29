import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  action,
  className,
}: EmptyStateProps) {
  // Check if icon is a component or an element
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComponent = icon as LucideIcon;
    return <IconComponent className="w-10 h-10 text-slate-500 stroke-[1.5]" />;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/40',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-inner">
        {renderIcon()}
      </div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
      {!action && (actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3 mt-6">
          {actionLabel && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={actionIcon}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
