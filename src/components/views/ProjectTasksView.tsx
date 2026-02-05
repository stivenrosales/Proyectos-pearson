'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Plus } from 'lucide-react';
import { Project, Task } from '@/types';
import { KANBAN_COLUMNS } from '@/lib/constants';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { ProjectHeader } from '@/components/shared/ProjectHeader';
import { TaskListView } from '@/components/list/TaskListView';
import { ViewType } from './ViewToggle';
import { Button } from '@/components/ui/Button';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { TaskFormModal } from '@/components/modals/TaskFormModal';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'pearson_view_preference';

interface ProjectTasksViewProps {
  project: Project;
  onBack: () => void;
  selectedTaskId?: string | null;
  onTaskSelected?: () => void;
}

export function ProjectTasksView({ project, onBack, selectedTaskId, onTaskSelected }: ProjectTasksViewProps) {
  // Get view preference from localStorage
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as ViewType | null;
      if (saved === 'kanban' || saved === 'list') {
        setCurrentView(saved);
      }
      setIsInitialized(true);
    }
  }, []);

  // Save preference to localStorage when it changes
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, currentView);
    }
  }, [currentView, isInitialized]);

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  // Fetch tasks (shared between both views)
  const { data: tasks = [], isLoading } = useTasks(project.id);

  // Check if all tasks are completed
  const allTasksCompleted = tasks.length > 0 &&
    tasks.every((task) => task.estado === 'Completado');

  // Highlight the selected task when coming from Dashboard (don't open modal)
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Set highlight when selectedTaskId changes
  useEffect(() => {
    if (selectedTaskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task) {
        setHighlightedTaskId(selectedTaskId);
        // Clear the selectedTaskId in parent
        onTaskSelected?.();
      }
    }
  }, [selectedTaskId, tasks, onTaskSelected]);

  // Auto-clear highlight after 2 seconds
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  // Don't render until we've loaded the preference
  if (!isInitialized) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="h-20 bg-white/5 animate-pulse rounded-xl" />
        </div>
        <div className="flex-1 p-4">
          <div className="h-full bg-white/5 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Shared Header */}
      <ProjectHeader
        project={project}
        onBack={onBack}
        currentView={currentView}
        onViewChange={handleViewChange}
        allTasksCompleted={allTasksCompleted}
      />

      {/* View Content */}
      <AnimatePresence mode="wait">
        {currentView === 'kanban' ? (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <KanbanBoardInner
              project={project}
              tasks={tasks}
              isLoading={isLoading}
              highlightedTaskId={highlightedTaskId}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden"
          >
            <TaskListView
              project={project}
              tasks={tasks}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inner KanbanBoard without header (since header is now in parent)
interface KanbanBoardInnerProps {
  project: Project;
  tasks: Task[];
  isLoading: boolean;
  highlightedTaskId?: string | null;
}

function KanbanBoardInner({ project, tasks, isLoading, highlightedTaskId }: KanbanBoardInnerProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTaskHeight, setActiveTaskHeight] = useState<number>(80);

  // Scroll to highlighted task when coming from Dashboard
  useEffect(() => {
    if (highlightedTaskId) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-task-id="${highlightedTaskId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  const updateTaskMutation = useUpdateTask(project.id);

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
          const reorderedTasks = arrayMove(columnTasks, activeIndex, overIndex);

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
        const targetTasks = tasksByStatus[targetStatus] || [];
        const newOrder = targetTasks.length + 1;

        // Find the task being moved to get its current state for automatic date tracking
        const movingTask = tasks.find((t) => t.id === activeId);

        try {
          await updateTaskMutation.mutateAsync({
            taskId: activeId,
            updates: { estado: targetStatus, orden: newOrder },
            currentTask: movingTask
              ? { estado: movingTask.estado, fechaInicio: movingTask.fechaInicio }
              : undefined,
          });
          toast.success(`Tarea movida a "${targetStatus}"`);
        } catch {
          toast.error('Error al mover la tarea');
        }
      }
    },
    [findColumnForTask, updateTaskMutation, tasksByStatus, tasks]
  );

  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : null;

  return (
    <div className="flex flex-col h-full">
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
                highlightedTaskId={highlightedTaskId}
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
