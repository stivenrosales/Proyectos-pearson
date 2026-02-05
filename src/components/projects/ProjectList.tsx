'use client';

import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { Search, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { PROJECT_STATUS_OPTIONS } from '@/lib/constants';
import { useAllLoadedProjects } from '@/hooks/useProjects';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/Input';
import { StatusFilter } from '@/components/ui/StatusFilter';
import { ProjectCard } from './ProjectCard';

// Default: only "En progreso" selected
const DEFAULT_STATUSES = ['En progreso'];

interface ProjectListProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ProjectList({
  selectedProjectId,
  onSelectProject,
  isCollapsed,
  onToggleCollapse,
}: ProjectListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(DEFAULT_STATUSES);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Ref for virtualized list container
  const parentRef = useRef<HTMLDivElement>(null);

  // Use query with client-side filtering for multiple statuses
  const {
    projects,
    totalLoaded,
    totalAll,
    isLoading,
  } = useAllLoadedProjects({
    search: debouncedSearch || undefined,
    statuses: selectedStatuses,
  });

  // Virtualizer - solo renderiza los items visibles
  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Altura estimada de cada ProjectCard (incluye padding)
    overscan: 5, // Renderiza 5 items extra arriba y abajo del viewport
  });

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 h-full bg-white/5 backdrop-blur-xl border-r border-white/10">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors mb-4"
          title="Expandir panel"
        >
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>
        <FolderOpen className="w-6 h-6 text-white/40 mb-4" />
        <span className="text-xs text-white/40 [writing-mode:vertical-lr] rotate-180">
          Proyectos
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-xl border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Mis Proyectos</h1>
            <p className="text-sm text-white/50">
              {totalLoaded} de {totalAll} proyectos
            </p>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            title="Colapsar panel"
          >
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-3">
          <Input
            placeholder="Buscar proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Status Filter with Checkboxes */}
        <StatusFilter
          selectedStatuses={selectedStatuses}
          onChange={setSelectedStatuses}
          options={[...PROJECT_STATUS_OPTIONS]}
        />
      </div>

      {/* Project List - Virtualized */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          // Skeleton loaders
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const project = projects[virtualItem.index];
              return (
                <div
                  key={project.id}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="pb-3">
                    <ProjectCard
                      project={project}
                      isSelected={selectedProjectId === project.id}
                      onClick={() => onSelectProject(project.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/40">No se encontraron proyectos</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
