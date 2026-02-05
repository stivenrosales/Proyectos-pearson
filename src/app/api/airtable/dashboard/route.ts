import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProjects, getTasksByProject } from '@/lib/airtable';
import { Task, Project } from '@/types';

export interface DashboardData {
  // Métricas de tareas
  totalTasks: number;
  tasksByStatus: {
    pendiente: number;
    enProgreso: number;
    enRevision: number;
    completado: number;
  };
  // Tareas urgentes (próximas a vencer o vencidas)
  overdueTasks: (Task & { projectName: string })[];
  urgentTasks: (Task & { projectName: string })[]; // Vencen en 2 días o menos
  // Todas las tareas con fecha (para el timeline)
  tasksWithDates: (Task & { projectName: string })[];
  // Proyectos activos
  activeProjects: Project[];
  // Métricas de productividad
  completedThisWeek: number;
  completedThisMonth: number;
  avgDaysPerTask: number | null;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info from session
    const responsableId = (session.user as { airtableId?: string })?.airtableId;
    const userRole = (session.user as { role?: string })?.role;

    // Get projects for this user
    const { projects } = await getProjects({
      responsableId: responsableId || undefined,
    });

    // Filter active projects (not "Terminado" or "Interrumpido")
    const activeProjects = projects.filter(
      (p) => p.estadoManual && !['Terminado', 'Interrumpido'].includes(p.estadoManual)
    );

    // Get all tasks from active projects IN PARALLEL (much faster!)
    const tasksPromises = activeProjects.map(async (project) => {
      const tasks = await getTasksByProject(project.id);
      return tasks.map((task) => ({
        ...task,
        projectName: project.clienteNombre || project.nombreProyecto,
      }));
    });

    const allTasksArrays = await Promise.all(tasksPromises);
    let allTasks = allTasksArrays.flat() as (Task & { projectName: string })[];

    // Filter tasks by responsable (only show tasks assigned to the current user)
    // Admins see all tasks, asesores only see their own
    if (responsableId && userRole !== 'admin') {
      allTasks = allTasks.filter((task) => {
        // If task has no responsable, don't show it in timeline
        if (!task.responsable || task.responsable.length === 0) {
          return false;
        }
        // Check if any responsable matches the current user
        return task.responsable.some((r) => r.id === responsableId);
      });
    }

    // Calculate metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasksByStatus = {
      pendiente: 0,
      enProgreso: 0,
      enRevision: 0,
      completado: 0,
    };

    const overdueTasks: (Task & { projectName: string })[] = [];
    const urgentTasks: (Task & { projectName: string })[] = [];
    let completedThisWeek = 0;
    let completedThisMonth = 0;
    let totalDays = 0;
    let tasksWithDuration = 0;

    // Calculate week and month boundaries
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    allTasks.forEach((task) => {
      // Count by status
      switch (task.estado) {
        case 'Pendiente':
          tasksByStatus.pendiente++;
          break;
        case 'En progreso':
          tasksByStatus.enProgreso++;
          break;
        case 'En revisión':
          tasksByStatus.enRevision++;
          break;
        case 'Completado':
          tasksByStatus.completado++;
          break;
      }

      // Check for overdue and urgent tasks (only non-completed)
      if (task.estado !== 'Completado' && task.fechaLimite) {
        const dueDate = new Date(task.fechaLimite);
        dueDate.setHours(0, 0, 0, 0);

        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          overdueTasks.push(task);
        } else if (daysUntilDue <= 2) {
          urgentTasks.push(task);
        }
      }

      // Count completed tasks this week/month
      if (task.estado === 'Completado' && task.fechaCompletado) {
        const completedDate = new Date(task.fechaCompletado);
        completedDate.setHours(0, 0, 0, 0);

        if (completedDate >= startOfWeek) {
          completedThisWeek++;
        }
        if (completedDate >= startOfMonth) {
          completedThisMonth++;
        }

        // Calculate duration if we have both dates
        if (task.fechaInicio) {
          const startDate = new Date(task.fechaInicio);
          const days = Math.ceil((completedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalDays += days;
            tasksWithDuration++;
          }
        }
      }
    });

    // Sort overdue and urgent by date
    overdueTasks.sort((a, b) => {
      const dateA = new Date(a.fechaLimite!).getTime();
      const dateB = new Date(b.fechaLimite!).getTime();
      return dateA - dateB; // Oldest first (most overdue)
    });

    urgentTasks.sort((a, b) => {
      const dateA = new Date(a.fechaLimite!).getTime();
      const dateB = new Date(b.fechaLimite!).getTime();
      return dateA - dateB; // Soonest first
    });

    // Calculate average days per task
    const avgDaysPerTask = tasksWithDuration > 0
      ? Math.round((totalDays / tasksWithDuration) * 10) / 10
      : null;

    // Filter tasks with dates for timeline (include completed ones too for tracking)
    const tasksWithDates = allTasks
      .filter((task) => task.fechaLimite)
      .sort((a, b) => {
        const dateA = new Date(a.fechaLimite!).getTime();
        const dateB = new Date(b.fechaLimite!).getTime();
        return dateA - dateB;
      });

    // Get ALL projects with fechaPrometida for the calendar (not limited)
    const allProjectsWithDates = projects.filter((p) => p.fechaPrometida);

    const dashboardData: DashboardData = {
      totalTasks: allTasks.length,
      tasksByStatus,
      overdueTasks: overdueTasks.slice(0, 10), // Limit to 10
      urgentTasks: urgentTasks.slice(0, 10), // Limit to 10
      tasksWithDates, // All tasks with dates for timeline
      activeProjects: allProjectsWithDates, // All projects with dates for calendar
      completedThisWeek,
      completedThisMonth,
      avgDaysPerTask,
    };

    return NextResponse.json(
      { success: true, data: dashboardData },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Error fetching dashboard data' },
      { status: 500 }
    );
  }
}
