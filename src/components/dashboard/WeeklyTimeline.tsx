'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';

interface WeeklyTimelineProps {
  tasks: (Task & { projectName: string })[];
  onSelectTask: (projectId: string, taskId: string) => void;
}

interface DayColumn {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isPast: boolean;
  tasks: (Task & { projectName: string })[];
}

export function WeeklyTimeline({ tasks, onSelectTask }: WeeklyTimelineProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Generate week days based on offset
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from Monday of the current week + offset
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
    startOfWeek.setDate(today.getDate() + diff + (weekOffset * 7));

    const days: DayColumn[] = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter((task) => {
        if (!task.fechaLimite) return false;
        return task.fechaLimite === dateStr;
      });

      days.push({
        date,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: date.getTime() === today.getTime(),
        isPast: date.getTime() < today.getTime(),
        tasks: dayTasks,
      });
    }

    return days;
  }, [weekOffset, tasks]);

  // Get overdue tasks that are BEFORE the current visible week (not just before today)
  const overdueTasks = useMemo(() => {
    if (weekDays.length === 0) return [];

    const weekStartStr = weekDays[0].date.toISOString().split('T')[0];

    return tasks.filter((task) => {
      if (!task.fechaLimite || task.estado === 'Completado') return false;
      // Compare strings directly (YYYY-MM-DD format) to avoid timezone issues
      return task.fechaLimite < weekStartStr;
    });
  }, [tasks, weekDays]);

  // Tasks for selected day or all tasks for the week
  const displayTasks = useMemo(() => {
    if (selectedDay) {
      const selectedDateStr = selectedDay.toISOString().split('T')[0];
      return tasks.filter((task) => task.fechaLimite === selectedDateStr);
    }
    // Show all tasks for this week (using date strings to avoid timezone issues)
    const weekStartStr = weekDays[0].date.toISOString().split('T')[0];
    const weekEndStr = weekDays[6].date.toISOString().split('T')[0];
    return tasks.filter((task) => {
      if (!task.fechaLimite) return false;
      // Compare strings directly (YYYY-MM-DD format)
      return task.fechaLimite >= weekStartStr && task.fechaLimite <= weekEndStr;
    });
  }, [selectedDay, tasks, weekDays]);

  const getWeekLabel = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.monthName === end.monthName) {
      return `${start.dayNumber} - ${end.dayNumber} ${start.monthName}`;
    }
    return `${start.dayNumber} ${start.monthName} - ${end.dayNumber} ${end.monthName}`;
  };

  const getTaskColor = (task: Task & { projectName: string }) => {
    if (task.estado === 'Completado') return 'bg-green-500';
    if (!task.fechaLimite) return 'bg-gray-500';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.fechaLimite);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return 'bg-red-500';
    if (daysUntil === 0) return 'bg-orange-500';
    if (daysUntil <= 2) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Timeline Semanal</h2>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(0)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                weekOffset === 0
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              Hoy
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-white min-w-[140px] text-center">
              {getWeekLabel()}
            </span>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overdue Badge */}
        {overdueTasks.length > 0 && weekOffset >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">
              {overdueTasks.length} {overdueTasks.length === 1 ? 'tarea vencida' : 'tareas vencidas'}
            </span>
            <button
              onClick={() => setWeekOffset(-1)}
              className="ml-auto text-xs text-red-400 hover:text-red-300 underline"
            >
              Ver semana anterior
            </button>
          </motion.div>
        )}
      </div>

      {/* Week Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const hasCompletedTasks = day.tasks.some(t => t.estado === 'Completado');
            const hasOverdueTasks = day.isPast && day.tasks.some(t => t.estado !== 'Completado');
            const isSelected = selectedDay?.getTime() === day.date.getTime();

            return (
              <motion.button
                key={index}
                onClick={() => setSelectedDay(isSelected ? null : day.date)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'relative p-3 rounded-xl border transition-all min-h-[100px] flex flex-col',
                  isSelected
                    ? 'bg-purple-500/20 border-purple-500/40'
                    : day.isToday
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : day.isPast
                    ? 'bg-white/[0.02] border-white/5'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                {/* Day Header */}
                <div className="text-center mb-2">
                  <p className={cn(
                    'text-xs font-medium',
                    day.isToday ? 'text-blue-400' : day.isPast ? 'text-white/30' : 'text-white/50'
                  )}>
                    {day.dayName}
                  </p>
                  <p className={cn(
                    'text-lg font-bold',
                    day.isToday ? 'text-blue-400' : day.isPast ? 'text-white/40' : 'text-white'
                  )}>
                    {day.dayNumber}
                  </p>
                </div>

                {/* Task Dots */}
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {day.tasks.slice(0, 4).map((task, taskIndex) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: taskIndex * 0.05 }}
                      className={cn(
                        'h-2 rounded-full',
                        getTaskColor(task),
                        task.estado === 'Completado' ? 'opacity-50' : 'opacity-100'
                      )}
                      title={task.nombreTarea}
                    />
                  ))}
                  {day.tasks.length > 4 && (
                    <p className="text-[10px] text-white/40 text-center">
                      +{day.tasks.length - 4} más
                    </p>
                  )}
                </div>

                {/* Task Count Badge */}
                {day.tasks.length > 0 && (
                  <div className={cn(
                    'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    hasOverdueTasks
                      ? 'bg-red-500 text-white'
                      : hasCompletedTasks && day.tasks.every(t => t.estado === 'Completado')
                      ? 'bg-green-500 text-white'
                      : 'bg-purple-500 text-white'
                  )}>
                    {day.tasks.length}
                  </div>
                )}

                {/* Today indicator */}
                {day.isToday && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Task List Section */}
      <div className="border-t border-white/10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/70">
              {selectedDay
                ? `Tareas del ${selectedDay.getDate()} de ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedDay.getMonth()]}`
                : 'Tareas de esta semana'}
            </h3>
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Ver toda la semana
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay?.toISOString() || 'all'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2 max-h-[300px] overflow-y-auto pr-2"
            >
              {displayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400/50 mb-2" />
                  <p className="text-white/50 text-sm">
                    {selectedDay ? 'No hay tareas para este día' : 'No hay tareas esta semana'}
                  </p>
                </div>
              ) : (
                displayTasks.map((task, index) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDate = task.fechaLimite ? new Date(task.fechaLimite) : null;
                  if (dueDate) dueDate.setHours(0, 0, 0, 0);

                  const daysUntil = dueDate
                    ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  const isOverdue = daysUntil !== null && daysUntil < 0;
                  const isToday = daysUntil === 0;
                  const isUrgent = daysUntil !== null && daysUntil > 0 && daysUntil <= 2;

                  return (
                    <motion.button
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => task.proyectoId && onSelectTask(task.proyectoId, task.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01] group',
                        task.estado === 'Completado'
                          ? 'bg-green-500/5 border-green-500/10'
                          : isOverdue
                          ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                          : isToday
                          ? 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'
                          : isUrgent
                          ? 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status indicator */}
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                          getTaskColor(task)
                        )} />

                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            task.estado === 'Completado' ? 'text-white/50 line-through' : 'text-white'
                          )}>
                            {task.nombreTarea}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-white/40 truncate">
                              {task.projectName}
                            </span>
                            {task.fechaLimite && (
                              <>
                                <span className="text-white/20">•</span>
                                <span className={cn(
                                  'text-xs font-medium flex items-center gap-1',
                                  task.estado === 'Completado'
                                    ? 'text-green-400'
                                    : isOverdue
                                    ? 'text-red-400'
                                    : isToday
                                    ? 'text-orange-400'
                                    : isUrgent
                                    ? 'text-yellow-400'
                                    : 'text-white/50'
                                )}>
                                  {task.estado === 'Completado' ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Completada
                                    </>
                                  ) : isOverdue ? (
                                    <>
                                      <AlertTriangle className="w-3 h-3" />
                                      Venció hace {Math.abs(daysUntil!)} {Math.abs(daysUntil!) === 1 ? 'día' : 'días'}
                                    </>
                                  ) : isToday ? (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      Vence hoy
                                    </>
                                  ) : isUrgent ? (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      Vence en {daysUntil} {daysUntil === 1 ? 'día' : 'días'}
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="w-3 h-3" />
                                      {new Date(task.fechaLimite).toLocaleDateString('es-ES', {
                                        weekday: 'short',
                                        day: 'numeric'
                                      })}
                                    </>
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Estado badge */}
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
                          task.estado === 'Completado'
                            ? 'bg-green-500/20 text-green-300'
                            : task.estado === 'En progreso'
                            ? 'bg-blue-500/20 text-blue-300'
                            : task.estado === 'En revisión'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-white/10 text-white/50'
                        )}>
                          {task.estado}
                        </span>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-4 text-[10px] text-white/40">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Vencida</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>Hoy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Urgente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 opacity-50" />
            <span>Completada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
