'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, Calendar, Pencil } from 'lucide-react';
import { Task, Project } from '@/types';
import { KANBAN_COLUMNS, PROJECT_STATUS_OPTIONS } from '@/lib/constants';
import { formatDate, getDaysRemaining } from '@/lib/utils';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useUpdateProjectStatus, useUpdateProjectDate } from '@/hooks/useProjects';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Badge } from '@/components/ui/Badge';
import { KanbanColumn } from './KanbanColumn';
import { TaskFormModal } from '@/components/modals/TaskFormModal';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  project: Project;
  onBack: () => void;
}

export function KanbanBoard({ project, onBack }: KanbanBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTaskHeight, setActiveTaskHeight] = useState<number>(80);

  // Local state for project status and date (for immediate UI update)
  const [localStatus, setLocalStatus] = useState(project.estadoManual || '');
  const [localDate, setLocalDate] = useState(project.fechaPrometida || '');
  const [isEditingDate, setIsEditingDate] = useState(false);

  const { data: tasks = [], isLoading } = useTasks(project.id);
  const updateTaskMutation = useUpdateTask(project.id);
  const updateProjectStatusMutation = useUpdateProjectStatus();
  const updateProjectDateMutation = useUpdateProjectDate();

  // Organize tasks by status
  const tasksByStatus = useMemo(() => {
    const statusMap: Record<string, Task[]> = {
      Pendiente: [],
      'En progreso': [],
      'En revisión': [],
      Completado: [],
    };

    tasks.forEach((task) => {
      const estado = task.estado || 'Pendiente';
      if (statusMap[estado]) {
        statusMap[estado].push(task);
      } else {
        statusMap['Pendiente'].push(task);
      }
    });

    // Sort by orden
    Object.keys(statusMap).forEach((status) => {
      statusMap[status].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    });

    return statusMap;
  }, [tasks]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findColumnForTask = useCallback(
    (taskId: string): string | null => {
      for (const [status, taskList] of Object.entries(tasksByStatus)) {
        if (taskList.some((t) => t.id === taskId)) {
          return status;
        }
      }
      return null;
    },
    [tasksByStatus]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string;
    setActiveTaskId(taskId);

    // Capturar la altura de la tarjeta que se está arrastrando
    // Buscar el elemento por data-task-id o por el contenedor sortable
    setTimeout(() => {
      const element = document.querySelector(`[data-sortable-id="${taskId}"]`);
      if (element) {
        const height = element.getBoundingClientRect().height;
        setActiveTaskHeight(height > 0 ? height : 80);
      }
    }, 0);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setDragOverColumn(null);
        return;
      }

      const currentOverId = over.id as string;
      const isColumn = KANBAN_COLUMNS.some((col) => col.id === currentOverId);

      if (isColumn) {
        setDragOverColumn(currentOverId);
      } else {
        const column = findColumnForTask(currentOverId);
        if (column) {
          setDragOverColumn(column);
        }
      }
    },
    [findColumnForTask]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTaskId(null);
      setDragOverColumn(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine target status
      let targetStatus: string | null = null;
      const isOverColumn = KANBAN_COLUMNS.some((col) => col.id === overId);

      if (isOverColumn) {
        targetStatus = overId;
      } else {
        targetStatus = findColumnForTask(overId);
      }

      if (!targetStatus) return;

      const currentStatus = findColumnForTask(activeId);

      // Same column - reorder
      if (currentStatus === targetStatus && !isOverColumn) {
        const columnTasks = tasksByStatus[targetStatus] || [];
        const activeIndex = columnTasks.findIndex((t) => t.id === activeId);
        const overIndex = columnTasks.findIndex((t) => t.id === overId);

        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          // Calculate new order for the moved task
          const reorderedTasks = arrayMove(columnTasks, activeIndex, overIndex);

          // Update all affected tasks with new order values
          try {
            const updatePromises = reorderedTasks.map((task, index) => {
              const newOrder = index + 1;
              if (task.orden !== newOrder) {
                return updateTaskMutation.mutateAsync({
                  taskId: task.id,
                  updates: { orden: newOrder },
                });
              }
              return Promise.resolve();
            });

            await Promise.all(updatePromises);
            toast.success('Orden actualizado');
          } catch {
            toast.error('Error al reordenar');
          }
        }
        return;
      }

      // Different column - change status
      if (currentStatus !== targetStatus) {
        // Calculate new order (add to end of target column)
        const targetTasks = tasksByStatus[targetStatus] || [];
        const newOrder = targetTasks.length + 1;

        try {
          await updateTaskMutation.mutateAsync({
            taskId: activeId,
            updates: { estado: targetStatus, orden: newOrder },
          });
          toast.success(`Tarea movida a "${targetStatus}"`);
        } catch {
          toast.error('Error al mover la tarea');
        }
      }
    },
    [findColumnForTask, updateTaskMutation, tasksByStatus]
  );

  const handleStatusChange = async (newStatus: string) => {
    // Update local state immediately for instant feedback
    setLocalStatus(newStatus);

    try {
      await updateProjectStatusMutation.mutateAsync({
        projectId: project.id,
        status: newStatus,
      });
      toast.success('Estado del proyecto actualizado');
    } catch {
      // Revert on error
      setLocalStatus(project.estadoManual || '');
      toast.error('Error al actualizar el estado');
    }
  };

  const handleDateChange = async (newDate: string) => {
    // Update local state immediately for instant feedback
    setLocalDate(newDate);
    setIsEditingDate(false);

    try {
      await updateProjectDateMutation.mutateAsync({
        projectId: project.id,
        fechaPrometida: newDate,
      });
    } catch {
      // Revert on error
      setLocalDate(project.fechaPrometida || '');
    }
  };

  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : null;

  // Use local date for immediate UI updates
  const displayDate = localDate || project.fechaPrometida;
  const daysRemaining = getDaysRemaining(displayDate);

  // Verificar si todas las tareas están completadas
  const allTasksCompleted = tasks.length > 0 &&
    tasks.every((task) => task.estado === 'Completado');

  // Determinar si el proyecto está completado
  // El proyecto se considera completado si:
  // 1. El estado actual del dropdown es "Terminado"
  // 2. El progreso es 100%
  // 3. Todas las tareas están en columna "Completado"
  const currentProjectStatus = localStatus || project.estadoManual || '';
  const isProjectCompleted =
    currentProjectStatus === 'Terminado' ||
    project.progreso === 100 ||
    allTasksCompleted;

  let deadlineBadgeVariant: 'success' | 'warning' | 'error' | 'default' = 'default';
  if (isProjectCompleted) {
    deadlineBadgeVariant = 'success'; // Siempre verde si está completado
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
    <div className="flex flex-col h-full">
      {/* Header */}
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
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id] || []}
                onTaskClick={setEditingTask}
                isDragOver={dragOverColumn === column.id}
                isLoading={isLoading}
                activeId={activeTaskId}
                projectId={project.id}
                activeTaskHeight={activeTaskHeight}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rounded-xl p-3 bg-slate-800/90 backdrop-blur-xl border border-white/20 shadow-2xl shadow-purple-500/20">
                <span className="text-sm font-medium text-white">
                  {activeTask.nombreTarea}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add Task Button */}
      <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl">
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          variant="secondary"
          className="w-full"
        >
          Agregar tarea
        </Button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingTask && (
          <TaskFormModal
            task={editingTask}
            projectId={project.id}
            onClose={() => setEditingTask(null)}
            mode="edit"
          />
        )}

        {isCreateModalOpen && (
          <TaskFormModal
            projectId={project.id}
            onClose={() => setIsCreateModalOpen(false)}
            mode="create"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
