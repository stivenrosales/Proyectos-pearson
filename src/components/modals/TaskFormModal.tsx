'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { Task, TaskFormData } from '@/types';
import {
  TASK_STATUS_OPTIONS,
  TASK_BLOQUE_OPTIONS,
  TASK_TIPO_OPTIONS,
} from '@/lib/constants';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import toast from 'react-hot-toast';

interface TaskFormModalProps {
  task?: Task;
  projectId: string;
  onClose: () => void;
  mode: 'create' | 'edit';
}

const initialFormData: TaskFormData = {
  nombreTarea: '',
  estado: 'Pendiente',
  bloque: '',
  orden: null,
  tipoTarea: '',
  fechaLimite: '',
  descripcion: '',
  notas: '',
};

export function TaskFormModal({
  task,
  projectId,
  onClose,
  mode,
}: TaskFormModalProps) {
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const createTaskMutation = useCreateTask(projectId);
  const updateTaskMutation = useUpdateTask(projectId);
  const deleteTaskMutation = useDeleteTask(projectId);

  const isLoading =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending;

  // Initialize form data when editing
  useEffect(() => {
    if (mode === 'edit' && task) {
      setFormData({
        nombreTarea: task.nombreTarea,
        estado: task.estado,
        bloque: task.bloque || '',
        orden: task.orden,
        tipoTarea: task.tipoTarea || '',
        fechaLimite: task.fechaLimite || '',
        descripcion: task.descripcion || '',
        notas: task.notas || '',
      });
    }
  }, [mode, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombreTarea.trim()) return;

    try {
      if (mode === 'create') {
        await createTaskMutation.mutateAsync(formData);
        toast.success('Tarea creada exitosamente');
      } else if (task) {
        await updateTaskMutation.mutateAsync({
          taskId: task.id,
          updates: formData,
        });
        toast.success('Tarea actualizada exitosamente');
      }
      onClose();
    } catch {
      toast.error(mode === 'create' ? 'Error al crear la tarea' : 'Error al actualizar la tarea');
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    try {
      await deleteTaskMutation.mutateAsync(task.id);
      toast.success('Tarea eliminada');
      onClose();
    } catch {
      toast.error('Error al eliminar la tarea');
    }
  };

  const statusOptions = TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }));
  const bloqueOptions = [
    { value: '', label: 'Sin bloque' },
    ...TASK_BLOQUE_OPTIONS.map((b) => ({ value: b, label: b })),
  ];
  const tipoOptions = [
    { value: '', label: 'Sin tipo' },
    ...TASK_TIPO_OPTIONS.map((t) => ({ value: t, label: t })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mode === 'create' ? 'Nueva Tarea' : 'Editar Tarea'}
            </h2>
            {mode === 'edit' && task && (
              <p className="text-sm text-white/50 mt-0.5 truncate max-w-[300px]">
                {task.nombreTarea}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-140px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Nombre */}
            <Input
              label="Nombre de Tarea"
              value={formData.nombreTarea}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nombreTarea: e.target.value }))
              }
              placeholder="Nombre de la tarea"
              required
              autoFocus
            />

            {/* Estado y Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Estado"
                value={formData.estado}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, estado: e.target.value }))
                }
                options={statusOptions}
              />
              <Select
                label="Tipo de Tarea"
                value={formData.tipoTarea}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tipoTarea: e.target.value }))
                }
                options={tipoOptions}
              />
            </div>

            {/* Bloque y Orden */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Bloque"
                value={formData.bloque}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bloque: e.target.value }))
                }
                options={bloqueOptions}
              />
              <Input
                label="Orden"
                type="number"
                min={1}
                value={formData.orden ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    orden: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
                placeholder="1, 2, 3..."
              />
            </div>

            {/* Fecha Límite */}
            <Input
              label="Fecha Límite"
              type="date"
              value={formData.fechaLimite}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fechaLimite: e.target.value }))
              }
            />

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder="Describe la tarea..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none transition-all"
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">
                Notas
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notas: e.target.value }))
                }
                placeholder="Notas adicionales..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
            <div>
              {mode === 'edit' && !showDeleteConfirm && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Eliminar
                </Button>
              )}
              {mode === 'edit' && showDeleteConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">¿Eliminar?</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    isLoading={deleteTaskMutation.isPending}
                  >
                    Sí
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    No
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!formData.nombreTarea.trim()}
                isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {mode === 'create' ? 'Crear' : 'Guardar'}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
