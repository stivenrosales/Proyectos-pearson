'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Check, X } from 'lucide-react';
import { Task } from '@/types';
import {
  KANBAN_COLUMNS,
  TASK_TYPE_COLORS,
  TASK_STATUS_OPTIONS,
  TASK_BLOQUE_OPTIONS,
  TASK_TIPO_OPTIONS,
} from '@/lib/constants';
import { formatDate, getDateColorClass } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { AvatarGroup } from '@/components/ui/Avatar';
import { useDeleteTask, useUpdateTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Inline select dropdown component - moved OUTSIDE of TaskListRow
interface InlineSelectProps {
  field: string;
  value: string | null;
  options: readonly string[];
  colorMap?: Record<string, string>;
  onUpdate: (field: string, value: string) => Promise<void>;
}

function InlineSelect({ field, value, options, colorMap, onUpdate }: InlineSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getColor = useCallback((val: string) => {
    if (colorMap) return colorMap[val];
    if (field === 'estado') {
      const col = KANBAN_COLUMNS.find((c) => c.id === val);
      return col?.color || '#6b7280';
    }
    return '#6b7280';
  }, [colorMap, field]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Delay adding listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setIsOpen(prev => !prev);
  };

  const handleSelect = async (e: React.MouseEvent, newValue: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);

    if (newValue === value) return;
    await onUpdate(field, newValue);
  };

  const dropdown = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] min-w-[160px] max-h-[200px] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
      }}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onMouseDown={(e) => handleSelect(e, option)}
          className={cn(
            'w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2',
            option === value ? 'bg-white/5 text-white' : 'text-white/70'
          )}
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: getColor(option) }}
          />
          <span className="flex-1">{option}</span>
          {option === value && <Check className="w-3 h-3 flex-shrink-0 text-green-400" />}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="group/select block"
      >
        {value ? (
          <Badge
            variant="custom"
            color={getColor(value)}
            className="text-xs cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
          >
            {value}
          </Badge>
        ) : (
          <span className="text-sm text-white/30 hover:text-white/50 cursor-pointer">
            + Agregar
          </span>
        )}
      </button>
      {dropdown}
    </div>
  );
}

interface TaskListRowProps {
  task: Task;
  onEdit: () => void;
  projectId: string;
}

export function TaskListRow({ task, onEdit, projectId }: TaskListRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const deleteTaskMutation = useDeleteTask(projectId);
  const updateTaskMutation = useUpdateTask(projectId);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  // Get column color for the task status
  const column = KANBAN_COLUMNS.find((col) => col.id === task.estado);
  const columnColor = column?.color || '#6b7280';

  // Get date badge variant
  const dateColors = task.fechaLimite
    ? getDateColorClass(task.fechaLimite, task.estado === 'Completado')
    : { textColor: 'text-white/30', bgColor: '' };

  // Responsable names for avatar
  const responsableNames = task.responsable?.map((r) => r.name) || [];

  const isCompleted = task.estado === 'Completado';

  const handleDelete = async () => {
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      toast.success('Tarea eliminada');
    } catch {
      toast.error('Error al eliminar la tarea');
    }
    setShowDeleteConfirm(false);
  };

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async (field: string, value: string) => {
    const currentValue = task[field as keyof Task];
    if (value === currentValue) {
      cancelEditing();
      return;
    }

    try {
      await updateTaskMutation.mutateAsync({
        taskId: task.id,
        updates: { [field]: value || null },
      });
      toast.success('Actualizado');
    } catch {
      toast.error('Error al actualizar');
    }
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      saveField(field, editValue);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Handler for InlineSelect updates
  // Includes currentTask for automatic date tracking when estado changes
  const handleInlineUpdate = useCallback(async (field: string, value: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        taskId: task.id,
        updates: { [field]: value },
        // Pass currentTask for automatic date tracking when changing estado
        currentTask: field === 'estado'
          ? { estado: task.estado, fechaInicio: task.fechaInicio }
          : undefined,
      });
      toast.success('Actualizado');
    } catch {
      toast.error('Error al actualizar');
    }
  }, [updateTaskMutation, task.id, task.estado, task.fechaInicio]);

  // Inline date editor
  const InlineDateEditor = ({ value }: { value: string | null }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [dateValue, setDateValue] = useState(value || '');

    const handleSave = async () => {
      setIsEditing(false);
      if (dateValue === value) return;

      try {
        await updateTaskMutation.mutateAsync({
          taskId: task.id,
          updates: { fechaLimite: dateValue || undefined },
        });
        toast.success('Fecha actualizada');
      } catch {
        toast.error('Error al actualizar fecha');
      }
    };

    if (isEditing) {
      return (
        <div onClick={(e) => e.stopPropagation()} className="relative">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            autoFocus
            className="w-[110px] px-1.5 py-0.5 text-xs bg-white/10 border border-purple-500/50 rounded text-white focus:outline-none"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      );
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDateValue(value || '');
          setIsEditing(true);
        }}
        className="hover:bg-white/10 px-1 py-0.5 rounded transition-colors"
      >
        {value ? (
          <span className={cn('text-sm', dateColors.textColor, isCompleted && 'line-through')}>
            {formatDate(value)}
            {isCompleted && ' ✓'}
          </span>
        ) : (
          <span className="text-sm text-white/30 hover:text-white/50">+ Fecha</span>
        )}
      </button>
    );
  };

  // Inline text editor for task name
  const InlineTextEditor = ({
    value,
    field,
    className,
  }: {
    value: string;
    field: string;
    className?: string;
  }) => {
    if (editingField === field) {
      return (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 flex-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, field)}
            onBlur={() => saveField(field, editValue)}
            className="flex-1 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <button
            onClick={() => saveField(field, editValue)}
            className="p-1 hover:bg-green-500/20 rounded text-green-400"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancelEditing}
            className="p-1 hover:bg-red-500/20 rounded text-red-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          startEditing(field, value);
        }}
        className={cn(
          'text-left hover:bg-white/10 px-1 py-0.5 rounded transition-colors w-full',
          className
        )}
      >
        <span
          className={cn(
            'text-sm font-medium text-white',
            isCompleted && 'line-through text-white/50'
          )}
        >
          {value}
        </span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        'flex items-center border-b border-white/5 hover:bg-white/5 transition-colors group',
        'relative'
      )}
    >
      {/* Left border color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-sm"
        style={{ backgroundColor: columnColor }}
      />

      {/* Tarea - Editable */}
      <div className="flex-1 min-w-[200px] px-4 py-3 pl-5">
        <InlineTextEditor value={task.nombreTarea} field="nombreTarea" />
        {task.descripcion && (
          <p className="text-xs text-white/40 mt-0.5 truncate max-w-[300px] pl-1">
            {task.descripcion}
          </p>
        )}
      </div>

      {/* Estado - Editable */}
      <div className="w-[120px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <InlineSelect
          field="estado"
          value={task.estado}
          options={TASK_STATUS_OPTIONS}
          onUpdate={handleInlineUpdate}
        />
      </div>

      {/* Bloque - Editable */}
      <div className="w-[100px] px-4 py-3 hidden lg:block" onClick={(e) => e.stopPropagation()}>
        <InlineSelect
          field="bloque"
          value={task.bloque}
          options={TASK_BLOQUE_OPTIONS}
          onUpdate={handleInlineUpdate}
        />
      </div>

      {/* Tipo - Editable */}
      <div className="w-[140px] px-4 py-3 hidden lg:block" onClick={(e) => e.stopPropagation()}>
        <InlineSelect
          field="tipoTarea"
          value={task.tipoTarea}
          options={TASK_TIPO_OPTIONS}
          colorMap={TASK_TYPE_COLORS}
          onUpdate={handleInlineUpdate}
        />
      </div>

      {/* Fecha - Editable */}
      <div className="w-[120px] px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <InlineDateEditor value={task.fechaLimite} />
      </div>

      {/* Responsables - Click to open modal */}
      <div
        className="w-[140px] px-4 py-3 hidden md:flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        title="Editar para cambiar responsables"
      >
        {responsableNames.length > 0 ? (
          <>
            <AvatarGroup names={responsableNames} max={1} size="sm" />
            <span className="text-xs text-white/70 truncate">
              {responsableNames[0]?.split(' ')[0]}
            </span>
          </>
        ) : (
          <span className="text-sm text-white/30 hover:text-white/50">+ Asignar</span>
        )}
      </div>

      {/* Acciones */}
      <div className="w-[80px] px-4 py-3">
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {!showDeleteConfirm ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                disabled={deleteTaskMutation.isPending}
              >
                {deleteTaskMutation.isPending ? '...' : 'Sí'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
