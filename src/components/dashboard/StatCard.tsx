'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: 'red' | 'yellow' | 'blue' | 'green' | 'gray' | 'purple';
  subtitle?: string;
}

const colorStyles = {
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: 'text-red-400',
    value: 'text-red-400',
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: 'text-yellow-400',
    value: 'text-yellow-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: 'text-blue-400',
    value: 'text-blue-400',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: 'text-green-400',
    value: 'text-green-400',
  },
  gray: {
    bg: 'bg-white/5',
    border: 'border-white/10',
    icon: 'text-white/50',
    value: 'text-white',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'text-purple-400',
    value: 'text-purple-400',
  },
};

export function StatCard({ icon, label, value, color, subtitle }: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      className={cn(
        'rounded-xl p-4 backdrop-blur-xl border transition-all hover:scale-[1.02]',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', styles.bg)}>
          <div className={styles.icon}>{icon}</div>
        </div>
      </div>
      <div className="mt-3">
        <p className={cn('text-3xl font-bold', styles.value)}>{value}</p>
        <p className="text-white/50 text-sm mt-1">{label}</p>
        {subtitle && (
          <p className="text-white/30 text-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
