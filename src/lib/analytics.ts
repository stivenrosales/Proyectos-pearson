'use client';

import { track } from '@vercel/analytics';

/**
 * Funciones de tracking para monitorear actividad de usuarios
 * Estos eventos aparecerán en el dashboard de Vercel Analytics
 */
export const trackEvent = {
  // ==================== AUTENTICACIÓN ====================
  login: (email: string, role: string) =>
    track('user_login', { email, role }),

  logout: (email: string) =>
    track('user_logout', { email }),

  loginFailed: (email: string, reason: string) =>
    track('login_failed', { email, reason }),

  // ==================== TAREAS ====================
  taskCreated: (projectId: string, taskName: string, taskType?: string) =>
    track('task_created', { projectId, taskName, taskType: taskType || 'unknown' }),

  taskUpdated: (taskId: string, fields: string[]) =>
    track('task_updated', { taskId, fieldsChanged: fields.join(', ') }),

  taskDeleted: (taskId: string, taskName: string) =>
    track('task_deleted', { taskId, taskName }),

  taskStatusChanged: (taskId: string, fromStatus: string, toStatus: string) =>
    track('task_status_changed', { taskId, fromStatus, toStatus }),

  taskReordered: (projectId: string, count: number) =>
    track('task_reordered', { projectId, tasksReordered: count }),

  // ==================== PROYECTOS ====================
  projectViewed: (projectId: string, projectName: string) =>
    track('project_viewed', { projectId, projectName }),

  projectStatusChanged: (projectId: string, fromStatus: string, toStatus: string) =>
    track('project_status_changed', { projectId, fromStatus, toStatus }),

  projectDateChanged: (projectId: string, newDate: string) =>
    track('project_date_changed', { projectId, newDate }),

  // ==================== NAVEGACIÓN ====================
  dashboardViewed: () =>
    track('dashboard_viewed'),

  viewToggled: (view: 'kanban' | 'list') =>
    track('view_toggled', { view }),

  searchUsed: (query: string, resultsCount: number) =>
    track('search_used', { query, resultsCount }),

  filterApplied: (filterType: string, value: string) =>
    track('filter_applied', { filterType, value }),

  // ==================== ERRORES ====================
  errorOccurred: (error: string, context: string) =>
    track('error_occurred', { error, context }),

  apiError: (endpoint: string, statusCode: number, message: string) =>
    track('api_error', { endpoint, statusCode, message }),
};

// Helper para tracking seguro (no falla si analytics no está disponible)
export const safeTrack = (eventName: string, properties?: Record<string, string | number>) => {
  try {
    track(eventName, properties);
  } catch (error) {
    // Silently fail in development or if analytics is not available
    console.debug('Analytics track failed:', eventName, error);
  }
};
