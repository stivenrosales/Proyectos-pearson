'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Pencil } from 'lucide-react';
import { Project } from '@/types';
import { PROJECT_STATUS_OPTIONS } from '@/lib/constants';
import { formatDate, getDaysRemaining } from '@/lib/utils';
import { useUpdateProjectStatus, useUpdateProjectDate } from '@/hooks/useProjects';
import { Select } from '@/components/ui/Select';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Badge } from '@/components/ui/Badge';
import { ViewToggle, ViewType } from '@/components/views/ViewToggle';
import toast from 'react-hot-toast';

interface ProjectHeaderProps {
  project: Project;
  onBack: () => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  allTasksCompleted?: boolean;
}

export function ProjectHeader({
  project,
  onBack,
  currentView,
  onViewChange,
  allTasksCompleted = false,
}: ProjectHeaderProps) {
  // Local state for project status and date (for immediate UI update)
  const [localStatus, setLocalStatus] = useState(project.estadoManual || '');
  const [localDate, setLocalDate] = useState(project.fechaPrometida || '');
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Sync local state when project changes
  useEffect(() => {
    setLocalStatus(project.estadoManual || '');
    setLocalDate(project.fechaPrometida || '');
    setIsEditingDate(false);
  }, [project.id, project.estadoManual, project.fechaPrometida]);

  const updateProjectStatusMutation = useUpdateProjectStatus();
  const updateProjectDateMutation = useUpdateProjectDate();

  const handleStatusChange = async (newStatus: string) => {
    setLocalStatus(newStatus);

    try {
      await updateProjectStatusMutation.mutateAsync({
        projectId: project.id,
        status: newStatus,
      });
      toast.success('Estado del proyecto actualizado');
    } catch {
      setLocalStatus(project.estadoManual || '');
      toast.error('Error al actualizar el estado');
    }
  };

  const handleDateChange = async (newDate: string) => {
    setLocalDate(newDate);
    setIsEditingDate(false);

    try {
      await updateProjectDateMutation.mutateAsync({
        projectId: project.id,
        fechaPrometida: newDate,
      });
    } catch {
      setLocalDate(project.fechaPrometida || '');
    }
  };

  // Use local date for immediate UI updates
  const displayDate = localDate || project.fechaPrometida;
  const daysRemaining = getDaysRemaining(displayDate);

  // Determinar si el proyecto está completado
  const currentProjectStatus = localStatus || project.estadoManual || '';
  const isProjectCompleted =
    currentProjectStatus === 'Terminado' ||
    project.progreso === 100 ||
    allTasksCompleted;

  let deadlineBadgeVariant: 'success' | 'warning' | 'error' | 'default' = 'default';
  if (isProjectCompleted) {
    deadlineBadgeVariant = 'success';
  } else if (daysRemaining !== null) {
    if (daysRemaining < 0) deadlineBadgeVariant = 'error';
    else if (daysRemaining <= 3) deadlineBadgeVariant = 'warning';
    else deadlineBadgeVariant = 'success';
  }

  const statusOptions = PROJECT_STATUS_OPTIONS.map((s) => ({
    value: s,
    label: s,
  }));

  return (
    <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Mis Proyectos
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Project Info */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">
            {project.clienteNombre}
            {project.tipoProyecto && (
              <span className="text-white/50 font-normal ml-2">
                — {project.tipoProyecto}
              </span>
            )}
          </h2>
          {project.universidad && (
            <p className="text-sm text-white/50">{project.universidad}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4">
          <ProgressRing progress={project.progreso} size={52} />

          <div className="text-sm text-white/70">
            <span className="font-semibold text-white">{project.tareasCompletadas}</span>
            <span className="text-white/50"> / {project.totalTareas} tareas</span>
          </div>

          {/* Editable Date */}
          <div className="relative">
            {isEditingDate ? (
              <input
                type="date"
                value={localDate}
                onChange={(e) => handleDateChange(e.target.value)}
                onBlur={() => setIsEditingDate(false)}
                autoFocus
                className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <button
                onClick={() => setIsEditingDate(true)}
                className="group"
              >
                <Badge variant={deadlineBadgeVariant} className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <Calendar className="w-3 h-3" />
                  <span className={isProjectCompleted ? 'line-through' : ''}>
                    {displayDate ? formatDate(displayDate) : 'Sin fecha'}
                  </span>
                  {isProjectCompleted ? (
                    <span className="ml-1">✓</span>
                  ) : daysRemaining !== null ? (
                    <span className="ml-1">
                      ({daysRemaining >= 0 ? `${daysRemaining}d` : 'Vencido'})
                    </span>
                  ) : null}
                  <Pencil className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Badge>
              </button>
            )}
          </div>

          <Select
            value={localStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={statusOptions}
            className="w-40"
          />

          {/* View Toggle */}
          <ViewToggle currentView={currentView} onChange={onViewChange} />
        </div>
      </div>
    </div>
  );
}
