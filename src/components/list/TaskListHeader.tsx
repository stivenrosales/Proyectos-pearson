'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortColumn = 'nombreTarea' | 'estado' | 'bloque' | 'tipoTarea' | 'fechaLimite' | 'responsable';
export type SortDirection = 'asc' | 'desc';

interface TaskListHeaderProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}

interface ColumnConfig {
  key: SortColumn | 'acciones';
  label: string;
  width: string;
  sortable: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'nombreTarea', label: 'Tarea', width: 'flex-1 min-w-[200px]', sortable: true },
  { key: 'estado', label: 'Estado', width: 'w-[120px]', sortable: true },
  { key: 'bloque', label: 'Bloque', width: 'w-[100px] hidden lg:table-cell', sortable: true },
  { key: 'tipoTarea', label: 'Tipo', width: 'w-[140px] hidden lg:table-cell', sortable: true },
  { key: 'fechaLimite', label: 'Fecha', width: 'w-[120px]', sortable: true },
  { key: 'responsable', label: 'Responsables', width: 'w-[140px] hidden md:table-cell', sortable: true },
  { key: 'acciones', label: '', width: 'w-[80px]', sortable: false },
];

export function TaskListHeader({ sortColumn, sortDirection, onSort }: TaskListHeaderProps) {
  const handleClick = (column: ColumnConfig) => {
    if (column.sortable && column.key !== 'acciones') {
      onSort(column.key as SortColumn);
    }
  };

  return (
    <div className="flex items-center bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
      {COLUMNS.map((column) => (
        <div
          key={column.key}
          className={cn(
            'px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider',
            column.width,
            column.sortable && 'cursor-pointer hover:bg-white/5 hover:text-white/70 transition-colors',
            sortColumn === column.key && 'text-white/90'
          )}
          onClick={() => handleClick(column)}
        >
          <div className="flex items-center gap-1">
            <span>{column.label}</span>
            {column.sortable && column.key !== 'acciones' && sortColumn === column.key && (
              <span className="text-purple-400">
                {sortDirection === 'asc' ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
