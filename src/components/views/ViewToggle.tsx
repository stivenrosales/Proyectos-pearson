'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'kanban' | 'list';

interface ViewToggleProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
}

export function ViewToggle({ currentView, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
      <button
        type="button"
        onClick={() => onChange('kanban')}
        className={cn(
          'p-2 rounded-lg transition-all duration-200',
          currentView === 'kanban'
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
        )}
        title="Vista Kanban"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'p-2 rounded-lg transition-all duration-200',
          currentView === 'list'
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
        )}
        title="Vista Lista"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
