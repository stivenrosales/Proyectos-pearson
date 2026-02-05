import { useQuery } from '@tanstack/react-query';
import { Task, Project, ApiResponse } from '@/types';

export interface DashboardData {
  totalTasks: number;
  tasksByStatus: {
    pendiente: number;
    enProgreso: number;
    enRevision: number;
    completado: number;
  };
  overdueTasks: (Task & { projectName: string })[];
  urgentTasks: (Task & { projectName: string })[];
  tasksWithDates: (Task & { projectName: string })[]; // For timeline
  activeProjects: Project[];
  completedThisWeek: number;
  completedThisMonth: number;
  avgDaysPerTask: number | null;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/airtable/dashboard');
  const data: ApiResponse<DashboardData> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Error fetching dashboard data');
  }

  return data.data;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 30 * 1000, // 30 seconds - allow refetch on invalidation
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });
}
