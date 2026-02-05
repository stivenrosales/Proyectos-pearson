'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ListX } from 'lucide-react';
import { Task, Project } from '@/types';
import { TASK_STATUS_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { StatusFilter } from '@/components/ui/StatusFilter';
import { TaskListHeader, SortColumn, SortDirection } from './TaskListHeader';
import { TaskListRow } from './TaskListRow';
import { TaskFormModal } from '@/components/modals/TaskFormModal';

interface TaskListViewProps {
  project: Project;
  tasks: Task[];
  isLoading: boolean;
}

// Default filter: show all except completed
const DEFAULT_STATUSES = ['Pendiente', 'En progreso', 'En revisión'];

export function TaskListView({ project, tasks, isLoading }: TaskListViewProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [sortColumn, setSortColumn] = useState<SortColumn>('estado');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort
  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to asc
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    // Filter by status
    const filtered = tasks.filter((task) =>
      selectedStatuses.length === 0 || selectedStatuses.includes(task.estado)
    );

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'nombreTarea':
          comparison = a.nombreTarea.localeCompare(b.nombreTarea);
          break;
        case 'estado': {
          const statusOrder = ['Pendiente', 'En progreso', 'En revisión', 'Completado'];
          comparison = statusOrder.indexOf(a.estado) - statusOrder.indexOf(b.estado);
          break;
        }
        case 'bloque':
          comparison = (a.bloque || '').localeCompare(b.bloque || '');
          break;
        case 'tipoTarea':
          comparison = (a.tipoTarea || '').localeCompare(b.tipoTarea || '');
          break;
        case 'fechaLimite':
          comparison = (a.fechaLimite || '9999').localeCompare(b.fechaLimite || '9999');
          break;
        case 'responsable': {
          const aName = a.responsable?.[0]?.name || '';
          const bName = b.responsable?.[0]?.name || '';
          comparison = aName.localeCompare(bName);
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [tasks, selectedStatuses, sortColumn, sortDirection]);

  return (
    <div className="flex flex-col h-full">
      {/* Filters Bar */}
      <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl relative z-20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/50">Filtrar:</span>
            <div className="w-64 relative z-30">
              <StatusFilter
                selectedStatuses={selectedStatuses}
                onChange={setSelectedStatuses}
                options={[...TASK_STATUS_OPTIONS]}
              />
            </div>
          </div>
          <span className="text-sm text-white/50">
            {filteredAndSortedTasks.length} de {tasks.length} tareas
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mx-4 mt-4 overflow-hidden">
          <TaskListHeader
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          {isLoading ? (
            // Skeleton loaders
            <div className="divide-y divide-white/5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center px-4 py-3">
                  <div className="flex-1 h-5 bg-white/10 rounded animate-pulse" />
                  <div className="w-24 h-5 bg-white/10 rounded animate-pulse ml-4" />
                  <div className="w-20 h-5 bg-white/10 rounded animate-pulse ml-4" />
                </div>
              ))}
            </div>
          ) : filteredAndSortedTasks.length > 0 ? (
            <div className="divide-y divide-white/5">
              {filteredAndSortedTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02, duration: 0.2 }}
                >
                  <TaskListRow
                    task={task}
                    onEdit={() => setEditingTask(task)}
                    projectId={project.id}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <ListX className="w-12 h-12 mb-3" />
              <p className="text-sm">No hay tareas con los filtros seleccionados</p>
            </div>
          )}
        </div>
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
