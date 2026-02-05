'use client';

import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

// Generate a consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-purple-500',
    'bg-blue-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-orange-500',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);

  if (!initials) return null;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium text-white shadow-lg',
        colorClass,
        sizeStyles[size],
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ names, max = 3, size = 'sm' }: AvatarGroupProps) {
  const visibleNames = names.slice(0, max);
  const remainingCount = names.length - max;

  return (
    <div className="flex items-center -space-x-2">
      {visibleNames.map((name, index) => (
        <Avatar
          key={`${name}-${index}`}
          name={name}
          size={size}
          className="ring-2 ring-slate-800"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium',
            'bg-white/10 text-white/70 ring-2 ring-slate-800',
            sizeStyles[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
