'use client';

import { useRef, useState } from 'react';
import { DraggableAttributes } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { TASK_TYPE_COLORS } from '@/lib/constants';
import { formatDate, getDateColorClass, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { AvatarGroup } from '@/components/ui/Avatar';
import { useDeleteTask } from '@/hooks/useTasks';
import toast from 'react-hot-toast';

interface TaskCardProps {
  task: Task;
  columnColor: string;
  onClick: () => void;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  isDragging?: boolean;
  projectId: string;
  isHighlighted?: boolean;
}

export function TaskCard({
  task,
  columnColor,
  onClick,
  attributes,
  listeners,
  isDragging = false,
  projectId,
  isHighlighted = false,
}: TaskCardProps) {
  const wasDragged = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteTaskMutation = useDeleteTask(projectId);

  const dateColors = getDateColorClass(task.fechaLimite);
  const responsableNames = task.responsable?.map((r) => r.name).filter(Boolean) || [];

  // Track if we're dragging to prevent click after drag
  if (isDragging) {
    wasDragged.current = true;
  }

  // Handle click - only trigger if not dragging
  const handleClick = (e: React.MouseEvent) => {
    // Prevent click from firing after drag
    if (wasDragged.current) {
      wasDragged.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      toast.success('Tarea eliminada');
    } catch {
      toast.error('Error al eliminar la tarea');
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        y: 0,
        scale: isHighlighted ? 1.02 : 1,
      }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      transition={{ duration: 0.3 }}
      onClick={handleClick}
      className={cn(
        'group relative rounded-xl p-3 transition-all duration-300',
        'backdrop-blur-sm bg-white/5 border border-white/10',
        'hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/10',
        'cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-2xl shadow-purple-500/20 z-50 cursor-grabbing',
        isHighlighted && 'bg-purple-500/20 border-purple-400/50 shadow-lg shadow-purple-500/30'
      )}
    >
      {/* Left border accent */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full transition-all opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: columnColor }}
      />

      {/* Delete button */}
      <div className="absolute top-2 right-2 z-10">
        <AnimatePresence mode="wait">
          {!showDeleteConfirm ? (
            <motion.button
              key="delete-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleDeleteClick}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                'bg-red-500/0 hover:bg-red-500/30 text-white/30 hover:text-red-400',
                'opacity-0 group-hover:opacity-100'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          ) : (
            <motion.div
              key="confirm-btns"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm rounded-lg p-1"
            >
              <span className="text-[10px] text-white/60 px-1">¿Eliminar?</span>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteTaskMutation.isPending}
                className="px-2 py-0.5 text-[10px] font-medium bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50"
              >
                {deleteTaskMutation.isPending ? '...' : 'Sí'}
              </button>
              <button
                onClick={handleCancelDelete}
                className="px-2 py-0.5 text-[10px] font-medium bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                No
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="pr-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className={cn(
            'font-medium text-white text-sm leading-tight',
            task.estado === 'Completado' && 'line-through opacity-60'
          )}>
            {task.nombreTarea}
          </h4>
          {task.orden && (
            <span className="text-xs text-white/30 flex-shrink-0">
              #{task.orden}
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {task.bloque && (
            <Badge variant="default" className="text-[10px]">
              {task.bloque.replace('° Bloque', '°')}
            </Badge>
          )}

          {task.tipoTarea && (
            <Badge color={TASK_TYPE_COLORS[task.tipoTarea]} className="text-[10px]">
              {task.tipoTarea}
            </Badge>
          )}

          {task.fechaLimite && (
            <Badge
              variant={task.estado === 'Completado' ? 'success' : 'custom'}
              className={cn(
                'flex items-center gap-1 text-[10px]',
                task.estado === 'Completado'
                  ? '' // usa el estilo de success del Badge
                  : `${dateColors.textColor} ${dateColors.bgColor}`
              )}
            >
              <Calendar className="w-3 h-3" />
              <span className={task.estado === 'Completado' ? 'line-through' : ''}>
                {formatDate(task.fechaLimite)}
              </span>
              {task.estado === 'Completado' && <span>✓</span>}
            </Badge>
          )}
        </div>

        {/* Responsables */}
        {responsableNames.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <AvatarGroup names={responsableNames} max={3} size="sm" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-xl p-3 bg-white/5 border border-white/10 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
      <div className="flex gap-2">
        <div className="h-5 bg-white/10 rounded w-16" />
        <div className="h-5 bg-white/10 rounded w-20" />
      </div>
    </div>
  );
}
