'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { useAllLoadedProjects } from '@/hooks/useProjects';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectTasksView } from '@/components/views/ProjectTasksView';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Button } from '@/components/ui/Button';
import { Project } from '@/types';

export default function HomePage() {
  const { data: session } = useSession();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true); // Start collapsed in Dashboard
  const [showDashboard, setShowDashboard] = useState(true);
  const queryClient = useQueryClient();

  // Auto-collapse sidebar when in Dashboard mode
  useEffect(() => {
    if (showDashboard) {
      setIsPanelCollapsed(true);
    }
  }, [showDashboard]);

  // Get loaded projects for finding the selected project
  const { projects } = useAllLoadedProjects();

  // Find selected project from ANY cached query (handles filtered lists)
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;

    // First try the main projects list
    const fromMain = projects.find((p) => p.id === selectedProjectId);
    if (fromMain) return fromMain;

    // If not found, search in all cached queries
    const allQueries = queryClient.getQueriesData<Project[]>({ queryKey: ['projects'] });
    for (const [, data] of allQueries) {
      if (Array.isArray(data)) {
        const found = data.find((p) => p.id === selectedProjectId);
        if (found) return found;
      }
    }

    return null;
  }, [selectedProjectId, projects, queryClient]);

  const handleSelectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTaskId(null);
    setShowDashboard(false);
    setIsPanelCollapsed(false); // Expand sidebar when viewing project
  }, []);

  // New: Handle selecting a specific task from Dashboard
  const handleSelectTask = useCallback((projectId: string, taskId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTaskId(taskId);
    setShowDashboard(false);
    setIsPanelCollapsed(false); // Expand sidebar when viewing project
  }, []);

  const handleBack = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedTaskId(null);
  }, []);

  const handleNavigateToProjects = useCallback(() => {
    setShowDashboard(false);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setIsPanelCollapsed(false); // Expand sidebar in Projects view
  }, []);

  const handleNavigateToDashboard = useCallback(() => {
    // Invalidate dashboard cache to get fresh data
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    setShowDashboard(true);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    // Sidebar will auto-collapse via useEffect
  }, [queryClient]);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Project List */}
      <motion.div
        initial={false}
        animate={{
          width: isPanelCollapsed ? 60 : 380,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-shrink-0 h-screen"
      >
        <ProjectList
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          isCollapsed={isPanelCollapsed}
          onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        {/* Header with user info */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/10 bg-white/5 backdrop-blur-xl">
          {/* Dashboard button */}
          <Button
            variant={showDashboard ? 'primary' : 'ghost'}
            size="sm"
            onClick={handleNavigateToDashboard}
            leftIcon={<LayoutDashboard className="w-4 h-4" />}
          >
            Dashboard
          </Button>

          {/* User info and logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80">
                {session?.user?.name}
              </span>
              {(session?.user as { role?: string })?.role === 'admin' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Admin
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Salir
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key="project-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <ProjectTasksView
                  project={selectedProject}
                  onBack={handleBack}
                  selectedTaskId={selectedTaskId}
                  onTaskSelected={() => setSelectedTaskId(null)}
                />
              </motion.div>
            ) : showDashboard ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <Dashboard
                  onNavigateToProjects={handleNavigateToProjects}
                  onSelectProject={handleSelectProject}
                  onSelectTask={handleSelectTask}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <LayoutDashboard className="w-20 h-20 mx-auto mb-4 text-white/20" />
                  </motion.div>
                  <h2 className="text-xl font-semibold text-white/60 mb-2">
                    Selecciona un proyecto
                  </h2>
                  <p className="text-white/40 text-sm max-w-md">
                    Elige un proyecto de la lista o vuelve al Dashboard para ver tu resumen
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
