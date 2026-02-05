'use client';

import { FolderOpen, Calendar, ArrowRight } from 'lucide-react';
import { Project } from '@/types';
import { formatDate, getDaysRemaining, getProgressColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ProgressRing } from '@/components/ui/ProgressRing';

interface ActiveProjectsGridProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

export function ActiveProjectsGrid({ projects, onSelectProject }: ActiveProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 h-full">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-purple-400" />
          Proyectos activos
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="w-12 h-12 text-white/20 mb-4" />
          <p className="text-white/70">No tienes proyectos activos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 h-full">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-purple-400" />
        Proyectos activos
        <span className="ml-auto text-sm font-normal text-white/40">
          {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
        {projects.map((project) => {
          const daysRemaining = getDaysRemaining(project.fechaPrometida);
          const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 5;
          const isOverdue = daysRemaining !== null && daysRemaining < 0;

          return (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={cn(
                'text-left p-4 rounded-xl border transition-all hover:scale-[1.02] group',
                'bg-white/5 border-white/10 hover:bg-white/10'
              )}
            >
              <div className="flex items-start gap-3">
                <ProgressRing
                  progress={project.progreso}
                  size={44}
                  strokeWidth={4}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {project.clienteNombre}
                  </p>
                  <p className="text-xs text-white/40 truncate mt-0.5">
                    {project.tipoProyecto || project.nombreProyecto}
                  </p>
                  {project.fechaPrometida && (
                    <div className="flex items-center gap-1 mt-2">
                      <Calendar className="w-3 h-3 text-white/30" />
                      <span
                        className={cn(
                          'text-xs',
                          isOverdue ? 'text-red-400' :
                          isUrgent ? 'text-yellow-400' :
                          'text-white/50'
                        )}
                      >
                        {formatDate(project.fechaPrometida)}
                        {isOverdue && ' (vencido)'}
                      </span>
                    </div>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/40">Progreso</span>
                  <span className="text-white/60">{project.progreso}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${project.progreso}%`,
                      backgroundColor: getProgressColor(project.progreso),
                    }}
                  />
                </div>
              </div>

              {/* Task count */}
              <div className="mt-2 text-xs text-white/40">
                {project.tareasCompletadas}/{project.totalTareas} tareas
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
