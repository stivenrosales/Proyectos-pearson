'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  CheckCircle2,
  Building2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

interface MonthlyProjectsCalendarProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  projects: Project[];
}

type UrgencyLevel = 'overdue' | 'today' | 'urgent' | 'normal' | 'completed';

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  overdue: 'bg-red-500',
  today: 'bg-orange-500',
  urgent: 'bg-yellow-500',
  normal: 'bg-blue-500',
  completed: 'bg-green-500',
};

const URGENCY_TEXT_COLORS: Record<UrgencyLevel, string> = {
  overdue: 'text-red-400',
  today: 'text-orange-400',
  urgent: 'text-yellow-400',
  normal: 'text-blue-400',
  completed: 'text-green-400',
};

export function MonthlyProjectsCalendar({
  projects,
  onSelectProject,
}: MonthlyProjectsCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate current month/year based on offset
  const currentDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date;
  }, [monthOffset]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get urgency level for a project
  const getProjectUrgency = (project: Project): UrgencyLevel => {
    if (project.estadoManual === 'Terminado') return 'completed';
    if (!project.fechaPrometida) return 'normal';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(project.fechaPrometida);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) return 'overdue';
    if (daysUntil === 0) return 'today';
    if (daysUntil <= 7) return 'urgent';
    return 'normal';
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First day of the month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Last day of the month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Get day of week for first day (0=Sun, adjust for Mon start)
    const startDayOfWeek = firstDayOfMonth.getDay();
    const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = adjustedStart - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        dayNumber: date.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isPast: date < today,
        projects: projects.filter((p) => p.fechaPrometida === dateStr),
      });
    }

    // Days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
        projects: projects.filter((p) => p.fechaPrometida === dateStr),
      });
    }

    // Days from next month to complete grid (6 weeks = 42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        isPast: false,
        projects: projects.filter((p) => p.fechaPrometida === dateStr),
      });
    }

    return days;
  }, [currentYear, currentMonth, projects]);

  // Projects for the selected day
  const selectedDayProjects = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    return projects.filter((p) => p.fechaPrometida === selectedDateStr);
  }, [selectedDate, projects]);

  // Monthly statistics
  const monthlyStats = useMemo(() => {
    const monthProjects = projects.filter((p) => {
      if (!p.fechaPrometida) return false;
      const date = new Date(p.fechaPrometida);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalPending = monthProjects.reduce(
      (sum, p) => sum + (p.pagoRestante || 0),
      0
    );

    return {
      count: monthProjects.length,
      totalPending,
    };
  }, [projects, currentMonth, currentYear]);

  // Month label
  const getMonthLabel = () => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${monthNames[currentMonth]} ${currentYear}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get urgency label
  const getUrgencyLabel = (project: Project) => {
    const urgency = getProjectUrgency(project);
    if (urgency === 'completed') return 'Completado';
    if (urgency === 'overdue') {
      const days = Math.abs(
        Math.ceil(
          (new Date(project.fechaPrometida!).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      return `Vencido hace ${days} día${days > 1 ? 's' : ''}`;
    }
    if (urgency === 'today') return 'Vence hoy';
    if (urgency === 'urgent') {
      const days = Math.ceil(
        (new Date(project.fechaPrometida!).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return `Vence en ${days} día${days > 1 ? 's' : ''}`;
    }
    return '';
  };

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Calendario de Proyectos</h2>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthOffset(0)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                monthOffset === 0
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              Hoy
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMonthOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="min-w-[140px] text-center text-sm font-medium text-white">
                {getMonthLabel()}
              </span>

              <button
                onClick={() => setMonthOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Names Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-medium text-white/40 py-2"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isSelected = selectedDate?.getTime() === day.date.getTime();
            const hasProjects = day.projects.length > 0;

            return (
              <motion.button
                key={index}
                onClick={() => setSelectedDate(isSelected ? null : day.date)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative p-2 rounded-lg border transition-all min-h-[60px] flex flex-col items-center',
                  isSelected
                    ? 'bg-purple-500/20 border-purple-500/40'
                    : day.isToday
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : day.isCurrentMonth
                    ? day.isPast
                      ? 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-transparent border-transparent opacity-30'
                )}
              >
                {/* Day Number */}
                <span
                  className={cn(
                    'text-sm font-medium',
                    day.isToday
                      ? 'text-blue-400'
                      : day.isCurrentMonth
                      ? day.isPast
                        ? 'text-white/40'
                        : 'text-white'
                      : 'text-white/30'
                  )}
                >
                  {day.dayNumber}
                </span>

                {/* Project Indicators */}
                {hasProjects && (
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center max-w-full">
                    {day.projects.slice(0, 3).map((project) => (
                      <div
                        key={project.id}
                        className={cn(
                          'w-2 h-2 rounded-full',
                          URGENCY_COLORS[getProjectUrgency(project)]
                        )}
                        title={project.clienteNombre}
                      />
                    ))}
                    {day.projects.length > 3 && (
                      <span className="text-[8px] text-white/50">
                        +{day.projects.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Project Count Badge */}
                {day.projects.length > 0 && (
                  <div
                    className={cn(
                      'absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                      day.projects.some((p) => getProjectUrgency(p) === 'overdue')
                        ? 'bg-red-500 text-white'
                        : day.projects.some((p) => getProjectUrgency(p) === 'today')
                        ? 'bg-orange-500 text-white'
                        : 'bg-purple-500 text-white'
                    )}
                  >
                    {day.projects.length}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Projects Panel */}
      <AnimatePresence>
        {selectedDate && selectedDayProjects.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white/70">
                  Proyectos del{' '}
                  {selectedDate.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {selectedDayProjects.map((project) => {
                  const urgency = getProjectUrgency(project);
                  return (
                    <motion.button
                      key={project.id}
                      onClick={() => onSelectProject(project.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ x: 4 }}
                      className={cn(
                        'w-full p-3 rounded-xl text-left transition-all',
                        'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn('w-2 h-2 rounded-full', URGENCY_COLORS[urgency])}
                            />
                            <span className="font-medium text-white truncate">
                              {project.clienteNombre}
                            </span>
                          </div>

                          {project.universidad && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-white/50">
                              <Building2 className="w-3 h-3" />
                              <span>{project.universidad}</span>
                            </div>
                          )}

                          {urgency !== 'normal' && (
                            <div
                              className={cn(
                                'flex items-center gap-1 mt-1 text-xs',
                                URGENCY_TEXT_COLORS[urgency]
                              )}
                            >
                              {urgency === 'completed' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              <span>{getUrgencyLabel(project)}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          {project.pagoRestante && project.pagoRestante > 0 ? (
                            <div className="flex items-center gap-1 text-yellow-400">
                              <DollarSign className="w-3 h-3" />
                              <span className="text-sm font-medium">
                                {formatCurrency(project.pagoRestante)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="text-xs">Pagado</span>
                            </div>
                          )}

                          {/* Progress */}
                          <div className="mt-1">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full transition-all"
                                style={{ width: `${project.progreso}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-white/40">
                              {project.progreso}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer with Monthly Stats */}
      <div className="p-4 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">
                <span className="font-semibold text-white">{monthlyStats.count}</span> proyectos
                este mes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-white/60">Por cobrar:</span>
            <span className="font-semibold text-yellow-400">
              {formatCurrency(monthlyStats.totalPending)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-white/40">Vencido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[10px] text-white/40">Hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-white/40">Urgente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-white/40">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-white/40">Completado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
