import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskFormData, ApiResponse } from '@/types';
import toast from 'react-hot-toast';

async function fetchTasks(projectId: string): Promise<Task[]> {
  const response = await fetch(`/api/airtable/tasks?projectId=${projectId}`);
  const data: ApiResponse<Task[]> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Error fetching tasks');
  }

  return data.data;
}

async function createTask(projectId: string, taskData: Partial<TaskFormData>): Promise<Task> {
  const response = await fetch('/api/airtable/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, ...taskData }),
  });

  const data: ApiResponse<Task> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Error creating task');
  }

  return data.data;
}

async function updateTask(
  taskId: string,
  updates: Partial<TaskFormData>,
  currentTask?: { estado: string; fechaInicio: string | null }
): Promise<Task> {
  const response = await fetch(`/api/airtable/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, currentTask }),
  });

  const data: ApiResponse<Task> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Error updating task');
  }

  return data.data;
}

async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/airtable/tasks/${taskId}`, {
    method: 'DELETE',
  });

  const data: ApiResponse<void> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Error deleting task');
  }
}

export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetchTasks(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateTask(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: Partial<TaskFormData>) => createTask(projectId!, taskData),
    onSuccess: (newTask) => {
      // Agregar la nueva tarea al cache inmediatamente (optimistic)
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
        if (!old) return [newTask];
        return [...old, newTask];
      });
      // Invalidar tareas
      queryClient.invalidateQueries({
        queryKey: ['tasks', projectId],
      });
      // Invalidar proyectos para actualizar % progreso y contadores
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      // Invalidar dashboard para actualizar métricas
      queryClient.invalidateQueries({
        queryKey: ['dashboard'],
      });
      toast.success('Tarea creada correctamente');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al crear la tarea');
    },
  });
}

export function useUpdateTask(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
      currentTask,
    }: {
      taskId: string;
      updates: Partial<TaskFormData>;
      currentTask?: { estado: string; fechaInicio: string | null };
    }) => updateTask(taskId, updates, currentTask),
    onMutate: async ({ taskId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]);

      // Get the current task for optimistic update with dates
      const currentTask = previousTasks?.find((t) => t.id === taskId);
      const today = new Date().toISOString().split('T')[0];

      // Build optimistic updates including automatic dates
      const optimisticUpdates = { ...updates };

      if (updates.estado && currentTask) {
        // If changing to "En progreso" and no fechaInicio, set it
        if (updates.estado === 'En progreso' && !currentTask.fechaInicio) {
          (optimisticUpdates as Task).fechaInicio = today;
        }
        // If changing to "Completado", set fechaCompletado
        if (updates.estado === 'Completado') {
          (optimisticUpdates as Task).fechaCompletado = today;
          // If fechaInicio is empty (task went directly to Completado), set it to today too
          if (!currentTask.fechaInicio) {
            (optimisticUpdates as Task).fechaInicio = today;
          }
        }
        // If changing FROM "Completado" to another, clear fechaCompletado
        if (currentTask.estado === 'Completado' && updates.estado !== 'Completado') {
          (optimisticUpdates as Task).fechaCompletado = null;
        }
      }

      // Optimistically update
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, ...optimisticUpdates } : task
        )
      );

      return { previousTasks };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
      toast.error(err instanceof Error ? err.message : 'Error al actualizar la tarea');
    },
    onSettled: (_data, _error, variables) => {
      // Invalidar tareas del proyecto actual
      queryClient.invalidateQueries({
        queryKey: ['tasks', projectId],
        exact: true,
      });
      // Si se cambió el estado, invalidar proyectos para actualizar % progreso
      if (variables.updates.estado) {
        queryClient.invalidateQueries({
          queryKey: ['projects'],
        });
        // Invalidar dashboard para actualizar métricas
        queryClient.invalidateQueries({
          queryKey: ['dashboard'],
        });
      }
    },
  });
}

export function useDeleteTask(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/airtable/tasks/${taskId}`, {
        method: 'DELETE',
      });

      // Verificar respuesta del servidor
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: No se pudo eliminar la tarea`);
      }

      const data: ApiResponse<void> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al eliminar la tarea');
      }

      return data;
    },
    onMutate: async (taskId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]);

      // Optimistically remove
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) =>
        old?.filter((task) => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (err, _taskId, context) => {
      // ROLLBACK en caso de error - restaurar las tareas anteriores
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
      // Mostrar error al usuario
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la tarea. Intenta de nuevo.');
      console.error('Delete task error:', err);
    },
    onSuccess: () => {
      toast.success('Tarea eliminada correctamente');
    },
    onSettled: () => {
      // Invalidar tareas del proyecto actual
      queryClient.invalidateQueries({
        queryKey: ['tasks', projectId],
        exact: true,
      });
      // Invalidar proyectos para actualizar % progreso y contadores
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      // Invalidar dashboard para actualizar métricas
      queryClient.invalidateQueries({
        queryKey: ['dashboard'],
      });
    },
  });
}

// Hook para actualizar múltiples tareas en batch (útil para reordenar)
export function useUpdateTasksBatch(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; orden: number }>) => {
      const response = await fetch('/api/airtable/tasks/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al reordenar tareas');
      }

      return response.json();
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]);

      // Optimistically update orden
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) =>
        old?.map((task) => {
          const update = updates.find((u) => u.id === task.id);
          return update ? { ...task, orden: update.orden } : task;
        })
      );

      return { previousTasks };
    },
    onError: (err, _updates, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
      toast.error(err instanceof Error ? err.message : 'Error al reordenar tareas');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', projectId],
        exact: true,
      });
    },
  });
}
