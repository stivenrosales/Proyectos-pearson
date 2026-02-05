'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  ArrowRight,
  Loader2,
  Timer,
  FolderOpen,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useDashboard } from '@/hooks/useDashboard';
import { Button } from '@/components/ui/Button';
import { WeeklyTimeline } from './WeeklyTimeline';
import { MonthlyProjectsCalendar } from './MonthlyProjectsCalendar';

interface DashboardProps {
  onNavigateToProjects: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (projectId: string, taskId: string) => void;
}

export function Dashboard({ onNavigateToProjects, onSelectProject, onSelectTask }: DashboardProps) {
  const { data: session } = useSession();
  const { data: dashboardData, isLoading, error } = useDashboard();

  const userName = (session?.user as { name?: string })?.name || 'Usuario';
  const firstName = userName.split(' ')[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-white/50">Cargando tu dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/70">Error al cargar el dashboard</p>
          <p className="text-white/40 text-sm mt-1">Intenta recargar la página</p>
        </div>
      </div>
    );
  }

  const {
    tasksByStatus,
    overdueTasks,
    urgentTasks,
    tasksWithDates,
    activeProjects,
    completedThisWeek,
    completedThisMonth,
    avgDaysPerTask,
  } = dashboardData;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hola, {firstName} 👋
            </h1>
            <p className="text-white/50 mt-1">
              Aquí está el resumen de tu trabajo
            </p>
          </div>
          <Button
            onClick={onNavigateToProjects}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            variant="secondary"
          >
            Ver todos los proyectos
          </Button>
        </motion.div>

        {/* Quick Stats Row - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-3"
        >
          {/* Vencidas */}
          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">{overdueTasks.length}</span>
              <span className="text-xs text-red-300/70">vencidas</span>
            </div>
          )}

          {/* Urgentes */}
          {urgentTasks.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-400">{urgentTasks.length}</span>
              <span className="text-xs text-yellow-300/70">urgentes</span>
            </div>
          )}

          {/* En Progreso */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">{tasksByStatus.enProgreso}</span>
            <span className="text-xs text-blue-300/70">en progreso</span>
          </div>

          {/* Pendientes */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <ListTodo className="w-4 h-4 text-white/50" />
            <span className="text-sm font-semibold text-white/70">{tasksByStatus.pendiente}</span>
            <span className="text-xs text-white/40">pendientes</span>
          </div>

          {/* Completadas esta semana */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">{completedThisWeek}</span>
            <span className="text-xs text-green-300/70">esta semana</span>
          </div>

          {/* Tiempo promedio */}
          {avgDaysPerTask !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Timer className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">{avgDaysPerTask}</span>
              <span className="text-xs text-purple-300/70">días/tarea</span>
            </div>
          )}

          {/* Proyectos activos */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <FolderOpen className="w-4 h-4 text-white/50" />
            <span className="text-sm font-semibold text-white/70">{activeProjects.length}</span>
            <span className="text-xs text-white/40">proyectos</span>
          </div>
        </motion.div>

        {/* Weekly Timeline - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <WeeklyTimeline
            tasks={tasksWithDates}
            onSelectTask={onSelectTask}
          />
        </motion.div>

        {/* Monthly Projects Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MonthlyProjectsCalendar
            projects={activeProjects}
            onSelectProject={onSelectProject}
          />
        </motion.div>

        {/* Monthly Summary Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{completedThisMonth}</p>
                <p className="text-xs text-white/40">completadas este mes</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white/70">{dashboardData.totalTasks}</p>
                <p className="text-xs text-white/40">tareas totales</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{tasksByStatus.enRevision}</p>
                <p className="text-xs text-white/40">en revisión</p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Rendimiento del mes:</span>
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((completedThisMonth / Math.max(dashboardData.totalTasks, 1)) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  />
                </div>
                <span className="text-xs font-medium text-green-400">
                  {Math.round((completedThisMonth / Math.max(dashboardData.totalTasks, 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
