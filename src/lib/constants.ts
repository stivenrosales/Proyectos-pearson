import { KanbanColumn } from '@/types';

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'Pendiente', name: 'Pendiente', color: '#6b7280' },
  { id: 'En progreso', name: 'En progreso', color: '#3b82f6' },
  { id: 'En revisión', name: 'En revisión', color: '#eab308' },
  { id: 'Completado', name: 'Completado', color: '#22c55e' },
];

export const STATUS_COLORS: Record<string, string> = {
  'En progreso': '#22c55e',
  'En revisión': '#eab308',
  'Terminado': '#16a34a',
  'Interrumpido': '#ef4444',
  'En pausa': '#3b82f6',
};

export const TASK_TYPE_COLORS: Record<string, string> = {
  'Pearson': '#3b82f6',
  'Cliente': '#eab308',
  'Aprobación Universidad': '#22c55e',
};

export const TASK_STATUS_OPTIONS = [
  'Pendiente',
  'En progreso',
  'En revisión',
  'Completado',
] as const;

export const TASK_BLOQUE_OPTIONS = [
  '1° Bloque',
  '2° Bloque',
  '3° Bloque',
  '4° Bloque',
  '5° Bloque',
  '6° Bloque',
] as const;

export const TASK_TIPO_OPTIONS = [
  'Pearson',
  'Cliente',
  'Aprobación Universidad',
] as const;

export const PROJECT_STATUS_OPTIONS = [
  'En progreso',
  'En revisión',
  'En pausa',
  'Terminado',
  'Interrumpido',
] as const;
