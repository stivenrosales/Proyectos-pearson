// Airtable Field IDs
export const FIELD_IDS = {
  // Proyectos
  projects: {
    table: 'tbl3ZDE3yBKc9UMvo',
    nombreProyecto: 'fldGdzjJkFmIpBt5x',
    cliente: 'flddnqN70gGZOzvI6',
    universidad: 'fldN8H2h496Nb29fR',
    tipoProyecto: 'fldE1y5UITatpwIXj',
    estadoManual: 'fld5I1qMdRgRz4zGE',
    pagoRestante: 'fldZmpl3cwFxnKUaK',
    fechaPrometida: 'fld2g6DZexgQEK5vs',
    progreso: 'fldTJWyI7WyhaHFgl',
    totalTareas: 'fld0hCs7DEBAbRlMX',
    tareasCompletadas: 'fldz2sPo9P8D8RZjg',
    clienteNombre: 'fld0quC0NmdNGzZNC',
    tareas: 'fldPw2yODPiyXh6IW',
  },
  // Tareas
  tasks: {
    table: 'tblrN9A1ThzCVCCbk',
    nombreTarea: 'fldNLEcGjb0IAN0iZ',
    proyecto: 'fld9fE8rE0ihWof78',
    bloque: 'fldcFqUiWnsVGBrji',
    orden: 'fldDAN8XPABBTfNkP',
    tipoTarea: 'fldsA9Z9MfoLs723R',
    estado: 'fld7ZSCHrcnYjmsgS',
    fechaLimite: 'fldxBYwge5vz3mLxC',
    descripcion: 'fldXUe60tVUa3Ohjv',
    notas: 'fldyyl5yBXiyVeHFd',
    responsable: 'fldTiIt9vULmiGTQ1',
  },
} as const;

// Project Types
export interface Project {
  id: string;
  nombreProyecto: string;
  clienteNombre: string;
  universidad: string | null;
  tipoProyecto: string | null;
  estadoManual: string | null;
  pagoRestante: number | null;
  fechaPrometida: string | null;
  progreso: number;
  totalTareas: number;
  tareasCompletadas: number;
}

// Task Types
export interface Task {
  id: string;
  nombreTarea: string;
  proyectoId: string | null;
  bloque: string | null;
  orden: number | null;
  tipoTarea: string | null;
  estado: string;
  fechaLimite: string | null;
  fechaInicio: string | null;
  fechaCompletado: string | null;
  descripcion: string | null;
  notas: string | null;
  responsable: Responsable[] | null;
}

export interface Responsable {
  id: string;
  name: string;
}

export interface TaskFormData {
  nombreTarea: string;
  estado: string;
  bloque: string;
  orden: number | null;
  tipoTarea: string;
  fechaLimite: string;
  descripcion: string;
  notas: string;
}

// Kanban Types
export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
