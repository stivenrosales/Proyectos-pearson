import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, ApiResponse } from '@/types';
import toast from 'react-hot-toast';
import { trackEvent } from '@/lib/analytics';

interface ProjectsResponse extends ApiResponse<Project[]> {
  hasMore: boolean;
  offset: string | null;
}

interface FetchProjectsOptions {
  search?: string;
  status?: string;
  statuses?: string[]; // Multiple statuses for client-side filtering
}

async function fetchProjects(options: FetchProjectsOptions = {}): Promise<Project[]> {
  const params = new URLSearchParams();

  if (options.search) params.set('search', options.search);
  if (options.status && options.status !== 'Todos') params.set('status', options.status);

  const url = `/api/airtable/projects${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  const data: ProjectsResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Error fetching projects');
  }

  return data.data || [];
}

async function updateProjectStatus(projectId: string, status: string): Promise<void> {
  const response = await fetch('/api/airtable/projects', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, status }),
  });

  const data: ApiResponse<void> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Error updating project');
  }
}

/**
 * Hook para obtener proyectos con filtros server-side
 */
export function useProjects(options: FetchProjectsOptions = {}) {
  const { search, status } = options;

  return useQuery({
    queryKey: ['projects', { search, status }],
    queryFn: () => fetchProjects({ search, status }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Alias para compatibilidad - devuelve los proyectos cargados
 * Soporta filtrado por múltiples estados (client-side)
 */
export function useAllLoadedProjects(options: FetchProjectsOptions = {}) {
  const { statuses, ...serverOptions } = options;

  // Don't pass single status to server if we're using multiple statuses
  const query = useProjects(statuses ? { search: serverOptions.search } : serverOptions);

  // Filter by multiple statuses client-side
  const filteredProjects = React.useMemo(() => {
    const data = query.data || [];

    if (!statuses || statuses.length === 0) {
      return data;
    }

    return data.filter((project) =>
      project.estadoManual && statuses.includes(project.estadoManual)
    );
  }, [query.data, statuses]);

  return {
    ...query,
    projects: filteredProjects,
    totalLoaded: filteredProjects.length,
    totalAll: query.data?.length || 0,
    // For compatibility with infinite scroll interface
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => Promise.resolve(),
  };
}

/**
 * Hook para actualizar el estado de un proyecto
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: string }) =>
      updateProjectStatus(projectId, status),
    onMutate: async ({ projectId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      // Get all cached queries that start with 'projects'
      const allQueries = queryClient.getQueriesData<Project[]>({ queryKey: ['projects'] });

      // Store previous data for rollback
      const previousData = new Map<unknown[], Project[] | undefined>();

      // Optimistically update all cached queries
      allQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          previousData.set(queryKey as unknown[], data);
          const updatedData = data.map((project) =>
            project.id === projectId ? { ...project, estadoManual: status } : project
          );
          queryClient.setQueryData(queryKey, updatedData);
        }
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (_data, variables) => {
      // Track evento de cambio de estado
      // Obtener el estado anterior del cache
      const allQueries = queryClient.getQueriesData<Project[]>({ queryKey: ['projects'] });
      let previousStatus = 'unknown';
      allQueries.forEach(([, data]) => {
        if (Array.isArray(data)) {
          const project = data.find(p => p.id === variables.projectId);
          if (project?.estadoManual) {
            previousStatus = project.estadoManual;
          }
        }
      });
      trackEvent.projectStatusChanged(variables.projectId, previousStatus, variables.status);
    },
    onSettled: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Invalidate dashboard to update calendar in real-time (force refetch)
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' });
    },
  });
}

/**
 * Hook para actualizar la fecha prometida de un proyecto
 */
async function updateProjectDate(projectId: string, fechaPrometida: string): Promise<void> {
  const response = await fetch('/api/airtable/projects', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, fechaPrometida }),
  });

  const data: ApiResponse<void> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Error updating project date');
  }
}

export function useUpdateProjectDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, fechaPrometida }: { projectId: string; fechaPrometida: string }) =>
      updateProjectDate(projectId, fechaPrometida),
    onMutate: async ({ projectId, fechaPrometida }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      // Get all cached queries that start with 'projects'
      const allQueries = queryClient.getQueriesData<Project[]>({ queryKey: ['projects'] });

      // Store previous data for rollback
      const previousData = new Map<unknown[], Project[] | undefined>();

      // Optimistically update all cached queries
      allQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          previousData.set(queryKey as unknown[], data);
          const updatedData = data.map((project) =>
            project.id === projectId ? { ...project, fechaPrometida } : project
          );
          queryClient.setQueryData(queryKey, updatedData);
        }
      });

      return { previousData };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(err instanceof Error ? err.message : 'Error al actualizar la fecha');
    },
    onSuccess: (_data, variables) => {
      // Track evento de cambio de fecha
      trackEvent.projectDateChanged(variables.projectId, variables.fechaPrometida);
      toast.success('Fecha actualizada');
    },
    onSettled: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Invalidate dashboard to update calendar in real-time (force refetch)
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' });
    },
  });
}
