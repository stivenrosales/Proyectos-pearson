'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { Task, KanbanColumn as KanbanColumnType } from '@/types';
import { cn } from '@/lib/utils';
import { TaskCard, TaskCardSkeleton } from './TaskCard';

interface SortableTaskItemProps {
  task: Task;
  columnColor: string;
  onClick: () => void;
  activeId: string | null;
  projectId: string;
  activeTaskHeight: number;
  isHighlighted?: boolean;
}

function SortableTaskItem({
  task,
  columnColor,
  onClick,
  activeId,
  projectId,
  activeTaskHeight,
  isHighlighted,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Estilo Trello: cuando se arrastra, mostrar un placeholder en su lugar
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Si esta tarjeta está siendo arrastrada, mostrar placeholder en su lugar
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          height: activeTaskHeight,
          minHeight: activeTaskHeight,
        }}
        data-sortable-id={task.id}
        className="rounded-xl bg-white/10 border-2 border-dashed border-white/30"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
      data-sortable-id={task.id}
      data-task-id={task.id}
    >
      <TaskCard
        task={task}
        columnColor={columnColor}
        onClick={onClick}
        attributes={attributes}
        listeners={listeners}
        isDragging={isDragging}
        projectId={projectId}
        isHighlighted={isHighlighted}
      />
    </div>
  );
}

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  isDragOver: boolean;
  isLoading?: boolean;
  activeId?: string | null;
  projectId: string;
  activeTaskHeight?: number;
  highlightedTaskId?: string | null;
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  isDragOver,
  isLoading,
  activeId = null,
  projectId,
  activeTaskHeight = 80,
  highlightedTaskId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const isActive = isDragOver || isOver;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Column Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3"
        style={{
          background: `linear-gradient(135deg, ${column.color}40, ${column.color}20)`,
          borderLeft: `3px solid ${column.color}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <span className="font-medium text-white text-sm">{column.name}</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-md text-xs font-medium"
          style={{
            backgroundColor: `${column.color}30`,
            color: column.color,
          }}
        >
          {tasks.length}
        </span>
      </motion.div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 transition-all duration-200 overflow-y-auto',
          'bg-white/5 backdrop-blur-sm border-2',
          isActive
            ? 'border-dashed border-white/30 bg-white/10'
            : 'border-transparent'
        )}
        style={{
          borderColor: isActive ? column.color : 'transparent',
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => <TaskCardSkeleton key={i} />)
            ) : (
              tasks.map((task) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  columnColor={column.color}
                  onClick={() => onTaskClick(task)}
                  activeId={activeId}
                  projectId={projectId}
                  activeTaskHeight={activeTaskHeight}
                  isHighlighted={highlightedTaskId === task.id}
                />
              ))
            )}

          </div>
        </SortableContext>

        {/* Empty state */}
        {!isLoading && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 text-white/30"
          >
            <FolderOpen className="w-8 h-8 mb-2" />
            <p className="text-xs">Arrastra tareas aquí</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
