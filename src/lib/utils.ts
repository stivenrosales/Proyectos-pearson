import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parsea una fecha string (YYYY-MM-DD) a Date en zona horaria local
 * Evita el problema de UTC que causa desfase de un día
 */
function parseLocalDate(dateValue: string): Date {
  // Si es formato YYYY-MM-DD, parsearlo manualmente para evitar problemas de timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(year, month - 1, day); // month es 0-indexed
  }
  // Fallback para otros formatos
  return new Date(dateValue);
}

export function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return '';
  const date = parseLocalDate(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export function formatDateFull(dateValue: string | null | undefined): string {
  if (!dateValue) return '';
  const date = parseLocalDate(dateValue);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getDaysRemaining(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const date = parseLocalDate(dateValue);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDateColorClass(dateValue: string | null | undefined, isCompleted?: boolean): {
  textColor: string;
  bgColor: string;
} {
  // Si está completado, mostrar en color de éxito
  if (isCompleted) {
    return { textColor: 'text-green-400', bgColor: 'bg-green-500/10' };
  }

  const daysRemaining = getDaysRemaining(dateValue);

  if (daysRemaining === null) {
    return { textColor: 'text-gray-400', bgColor: '' };
  }

  if (daysRemaining < 0) {
    return { textColor: 'text-red-400', bgColor: 'bg-red-500/10' };
  }

  if (daysRemaining <= 2) {
    return { textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/10' };
  }

  return { textColor: 'text-gray-400', bgColor: '' };
}

export function getProgressColor(progress: number): string {
  if (progress < 30) return '#ef4444';
  if (progress <= 70) return '#eab308';
  return '#22c55e';
}

export function parseProgress(progressValue: unknown): number {
  if (typeof progressValue === 'number') return progressValue;
  if (typeof progressValue === 'string') {
    const match = progressValue.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

export function getInitials(name: string | null | undefined): string | null {
  if (!name || name.trim() === '') return null;
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
