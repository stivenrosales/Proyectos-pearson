'use client';

import { motion } from 'framer-motion';
import { Calendar, DollarSign } from 'lucide-react';
import { Project } from '@/types';
import { STATUS_COLORS } from '@/lib/constants';
import { formatDate, getDaysRemaining, cn } from '@/lib/utils';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Badge } from '@/components/ui/Badge';

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, isSelected, onClick }: ProjectCardProps) {
  const statusColor = STATUS_COLORS[project.estadoManual || ''] || '#6b7280';
  const daysRemaining = getDaysRemaining(project.fechaPrometida);

  let deadlineBadgeVariant: 'success' | 'warning' | 'error' | 'default' = 'default';
  if (daysRemaining !== null) {
    if (daysRemaining < 0) deadlineBadgeVariant = 'error';
    else if (daysRemaining <= 3) deadlineBadgeVariant = 'warning';
    else deadlineBadgeVariant = 'success';
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300',
        'backdrop-blur-xl border',
        isSelected
          ? 'bg-white/15 border-white/30 shadow-xl shadow-purple-500/10'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      )}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: statusColor,
      }}
    >
      {/* Glow effect when selected */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: `radial-gradient(ellipse at top left, ${statusColor}20, transparent 50%)`,
          }}
        />
      )}

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {project.clienteNombre}
            </h3>
            {project.universidad && (
              <p className="text-sm text-white/50 truncate">{project.universidad}</p>
            )}
          </div>
          <ProgressRing progress={project.progreso} size={44} strokeWidth={3} />
        </div>

        {/* Type */}
        {project.tipoProyecto && (
          <p className="text-sm text-white/60 mb-3">{project.tipoProyecto}</p>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${project.progreso}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ backgroundColor: statusColor }}
            />
          </div>
          <p className="text-xs text-white/40 mt-1">
            {project.tareasCompletadas} de {project.totalTareas} tareas
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          {project.fechaPrometida && (
            <Badge variant={deadlineBadgeVariant} className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(project.fechaPrometida)}
              {daysRemaining !== null && (
                <span className="ml-1">
                  ({daysRemaining >= 0 ? `${daysRemaining}d` : 'Vencido'})
                </span>
              )}
            </Badge>
          )}

          {(project.pagoRestante ?? 0) > 0 && (
            <Badge variant="warning" className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              S/ {project.pagoRestante?.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}
