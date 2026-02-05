'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'custom';
  color?: string;
  className?: string;
}

const variantStyles = {
  default: 'bg-white/10 text-white/80 border-white/10',
  success: 'bg-green-500/20 text-green-300 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-300 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  custom: '',
};

export function Badge({ children, variant = 'default', color, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        variant !== 'custom' && variantStyles[variant],
        className
      )}
      style={
        color
          ? {
              backgroundColor: `${color}20`,
              color: color,
              borderColor: `${color}40`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
