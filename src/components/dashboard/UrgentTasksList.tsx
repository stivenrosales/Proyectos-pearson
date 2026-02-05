'use client';

import { AlertTriangle, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { Task } from '@/types';
import { formatDate, getDaysRemaining } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface UrgentTasksListProps {
  tasks: (Task & { projectName: string })[];
  onSelectProject: (projectId: string) => void;
}

export function UrgentTasksList({ tasks, onSelectProject }: UrgentTasksListProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 h-full">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          Tareas que requieren atención
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
          <p className="text-white/70 font-medium">¡Todo al día!</p>
          <p className="text-white/40 text-sm mt-1">
            No tienes tareas vencidas o urgentes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 h-full">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        Tareas que requieren atención
        <span className="ml-auto text-sm font-normal text-white/40">
          {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </h2>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {tasks.map((task) => {
          const daysRemaining = getDaysRemaining(task.fechaLimite);
          const isOverdue = daysRemaining !== null && daysRemaining < 0;
          const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 2;

          let statusText = '';
          let statusColor = '';

          if (isOverdue) {
            const daysOverdue = Math.abs(daysRemaining!);
            statusText = daysOverdue === 1 ? 'Venció ayer' : `Venció hace ${daysOverdue} días`;
            statusColor = 'text-red-400';
          } else if (isUrgent) {
            if (daysRemaining === 0) {
              statusText = 'Vence hoy';
            } else if (daysRemaining === 1) {
              statusText = 'Vence mañana';
            } else {
              statusText = `Vence en ${daysRemaining} días`;
            }
            statusColor = 'text-yellow-400';
          }

          return (
            <button
              key={task.id}
              onClick={() => task.proyectoId && onSelectProject(task.proyectoId)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] group',
                isOverdue
                  ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                  : 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isOverdue ? (
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-white truncate">
                      {task.nombreTarea}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/50 truncate">
                      {task.projectName}
                    </span>
                    <span className="text-white/20">•</span>
                    <span className={cn('text-xs font-medium', statusColor)}>
                      {statusText}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
