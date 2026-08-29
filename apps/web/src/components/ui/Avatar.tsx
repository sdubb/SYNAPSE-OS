import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'offline' | 'away';
  className?: string;
}

export function Avatar({ src, name, size = 'md', status, className }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const statusColorClasses = {
    online: 'bg-emerald-500 ring-slate-900',
    busy: 'bg-rose-500 ring-slate-900',
    offline: 'bg-slate-500 ring-slate-900',
    away: 'bg-amber-500 ring-slate-900',
  };

  // Generate deterministic gradient background based on name
  const getGradientByName = (str: string) => {
    const gradients = [
      'from-cyan-600 to-blue-600',
      'from-purple-600 to-indigo-600',
      'from-emerald-600 to-teal-600',
      'from-rose-600 to-pink-600',
      'from-amber-600 to-orange-600',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className={cn('relative inline-block shrink-0', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold text-white overflow-hidden select-none border border-slate-700/80 shadow-sm',
          sizeClasses[size],
          !src || imageError ? `bg-gradient-to-br ${getGradientByName(name)}` : 'bg-slate-800'
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2',
            statusSizeClasses[size],
            statusColorClasses[status]
          )}
        />
      )}
    </div>
  );
}
