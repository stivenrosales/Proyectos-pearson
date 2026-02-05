import Airtable from 'airtable';
import { Project, Task, Responsable } from '@/types';
import { airtableRateLimiter } from './rateLimiter';

// Initialize Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);

// Table IDs
const PROJECTS_TABLE = 'tbl3ZDE3yBKc9UMvo';
const TASKS_TABLE = 'tblrN9A1ThzCVCCbk';
const EQUIPO_MAIN_TABLE = 'tblxeJD9pPvdj1MJW';

// Projects Table
const projectsTable = base(PROJECTS_TABLE);

// Tasks Table
const tasksTable = base(TASKS_TABLE);

// Equipo Main Table (for responsable names lookup)
const equipoMainTable = base(EQUIPO_MAIN_TABLE);

// Cache for team member names (ID -> Name)
let teamMemberCache: Map<string, string> | null = null;
let teamMemberCacheExpiry = 0;

// Get team member names (with caching)
async function getTeamMemberNames(): Promise<Map<string, string>> {
  const now = Date.now();

  // Return cached data if still valid (cache for 10 minutes)
  if (teamMemberCache && now < teamMemberCacheExpiry) {
    return teamMemberCache;
  }

  try {
    const records = await equipoMainTable
      .select({ fields: ['Nombre'] })
      .all();

    const nameMap = new Map<string, string>();
    records.forEach((record) => {
      const name = record.fields['Nombre'] as string;
      if (name) {
        nameMap.set(record.id, name);
      }
    });

    teamMemberCache = nameMap;
    teamMemberCacheExpiry = now + 10 * 60 * 1000; // 10 minutes

    return nameMap;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return new Map();
  }
}

// Field names (as returned by Airtable REST API)
const PROJECT_FIELDS = {
  nombreProyecto: 'Nombre del Proyecto',
  clienteNombre: 'Cliente Nombre',
  universidad: 'Universidad',
  tipoProyecto: 'Tipo de Proyecto',
  estadoManual: 'Estado Manual',
  pagoRestante: 'Pago Restante',
  fechaPrometida: 'Fecha Prometida',
  progreso: '% Progreso',
  totalTareas: 'Total Tareas',
  tareasCompletadas: 'Tareas Completadas',
  responsable: 'Responsable', // Link to Equipo Main table
};

const TASK_FIELDS = {
  nombreTarea: 'Nombre de Tarea',
  proyecto: 'Proyecto',
  bloque: 'Bloque',
  orden: 'Orden',
  tipoTarea: 'Tipo de Tarea',
  estado: 'Estado',
  fechaLimite: 'Fecha Límite',
  fechaInicio: 'Fecha Inicio',
  fechaCompletado: 'Fecha Completado',
  descripcion: 'Descripción',
  notas: 'Notas',
  responsable: 'Responsable',
};

// Types for paginated response
export interface ProjectsResponse {
  projects: Project[];
  hasMore: boolean;
  offset: string | null;
  total?: number;
}

export interface GetProjectsOptions {
  pageSize?: number;
  offset?: string;
  search?: string;
  status?: string;
  responsableId?: string; // ID de Airtable del responsable (para filtrar por usuario)
}

// Get projects with pagination and filters (OPTIMIZED)
export async function getProjects(options: GetProjectsOptions = {}): Promise<ProjectsResponse> {
  const { pageSize = 50, search, status, responsableId } = options;

  try {
    // Build filterByFormula for Airtable
    const filters: string[] = [];

    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      // Search in Cliente Nombre and Nombre del Proyecto
      // Use SEARCH instead of FIND for case-insensitive search
      filters.push(
        `OR(SEARCH("${searchLower}", LOWER({${PROJECT_FIELDS.clienteNombre}})), SEARCH("${searchLower}", LOWER({${PROJECT_FIELDS.nombreProyecto}})))`
      );
    }

    if (status && status !== 'all' && status !== 'Todos los estados' && status !== 'Todos') {
      filters.push(`{${PROJECT_FIELDS.estadoManual}} = "${status}"`);
    }

    // NOTA: El filtrado por responsable se hace en memoria después de cargar los records
    // porque Airtable no permite filtrar directamente por linked record IDs con filterByFormula
    // El campo Responsable es un linked record que devuelve array de record IDs

    const filterFormula = filters.length > 0
      ? (filters.length === 1 ? filters[0] : `AND(${filters.join(', ')})`)
      : '';

    // Use Airtable's native pagination
    const selectOptions: Airtable.SelectOptions<Airtable.FieldSet> = {
      pageSize: Math.min(pageSize, 100), // Airtable max is 100
      fields: Object.values(PROJECT_FIELDS),
    };

    if (filterFormula) {
      selectOptions.filterByFormula = filterFormula;
    }

    // Get all records that match (Airtable handles pagination internally)
    // For simplicity, we'll load all matching records and let the client handle virtualization
    const records = await projectsTable.select(selectOptions).all();

    // Si tenemos responsableId, filtramos por el campo Responsable (linked record)
    // Los linked records en Airtable devuelven un array de record IDs como strings
    let filteredRecords = records;
    if (responsableId) {
      // Debug: Log first record's Responsable field to understand format
      if (records.length > 0) {
        console.log('[DEBUG] Sample Responsable field:', JSON.stringify(records[0].fields[PROJECT_FIELDS.responsable]));
        console.log('[DEBUG] Looking for responsableId:', responsableId);
      }

      filteredRecords = records.filter((record) => {
        const responsableField = record.fields[PROJECT_FIELDS.responsable];

        // Handle different possible formats:
        // 1. Array of record IDs (strings): ["recXXX", "recYYY"]
        // 2. Single record ID (string): "recXXX"
        // 3. Array of objects: [{id: "recXXX"}]
        // 4. null/undefined

        if (!responsableField) {
          return false;
        }

        if (Array.isArray(responsableField)) {
          // Could be array of strings or array of objects
          const matches = responsableField.some((item) => {
            if (typeof item === 'string') {
              return item === responsableId;
            }
            if (typeof item === 'object' && item !== null && 'id' in item) {
              return (item as { id: string }).id === responsableId;
            }
            return false;
          });
          return matches;
        }

        if (typeof responsableField === 'string') {
          return responsableField === responsableId;
        }

        return false;
      });

      // Debug: Count how many have each responsable
      const responsableCounts: Record<string, number> = {};
      records.forEach((record) => {
        const resp = record.fields[PROJECT_FIELDS.responsable] as string[] | undefined;
        if (resp && Array.isArray(resp)) {
          resp.forEach((id) => {
            responsableCounts[id] = (responsableCounts[id] || 0) + 1;
          });
        }
      });
      console.log('[DEBUG] Responsable counts (top 5):',
        Object.entries(responsableCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      );

      console.log('[DEBUG] Found', filteredRecords.length, 'projects for responsableId:', responsableId);
    }

    const projects = filteredRecords.map((record) => mapRecordToProject(record));

    return {
      projects,
      hasMore: false, // All records loaded
      offset: null,
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

// Get ALL projects (for backwards compatibility, but should be avoided)
export async function getAllProjects(): Promise<Project[]> {
  try {
    const records = await projectsTable
      .select({
        fields: Object.values(PROJECT_FIELDS),
      })
      .all();

    return records.map((record) => mapRecordToProject(record));
  } catch (error) {
    console.error('Error fetching all projects:', error);
    throw error;
  }
}

// Helper to map record to project
function mapRecordToProject(record: Airtable.Record<Airtable.FieldSet>): Project {
  const fields = record.fields;

  // Handle universidad as lookup field (array of strings)
  const universidad = fields[PROJECT_FIELDS.universidad];
  let universidadStr: string | null = null;
  if (Array.isArray(universidad) && universidad.length > 0) {
    universidadStr = String(universidad[0]);
  }

  return {
    id: record.id,
    nombreProyecto: (fields[PROJECT_FIELDS.nombreProyecto] as string) || 'Sin nombre',
    clienteNombre: (fields[PROJECT_FIELDS.clienteNombre] as string) || 'Sin cliente',
    universidad: universidadStr,
    tipoProyecto: (fields[PROJECT_FIELDS.tipoProyecto] as string) || null,
    estadoManual: (fields[PROJECT_FIELDS.estadoManual] as string) || null,
    pagoRestante: (fields[PROJECT_FIELDS.pagoRestante] as number) ?? null,
    fechaPrometida: (fields[PROJECT_FIELDS.fechaPrometida] as string) || null,
    progreso: parseProgressValue(fields[PROJECT_FIELDS.progreso]),
    totalTareas: (fields[PROJECT_FIELDS.totalTareas] as number) || 0,
    tareasCompletadas: (fields[PROJECT_FIELDS.tareasCompletadas] as number) || 0,
  };
}

// Get tasks by project ID
export async function getTasksByProject(projectId: string): Promise<Task[]> {
  try {
    // Load team member names for resolving responsable IDs
    const teamNames = await getTeamMemberNames();

    // Para linked records, Airtable no permite filtrar directamente por record ID
    // Usamos filterByFormula con RECORD_ID() comparando contra el campo linked
    // Alternativa: cargar y filtrar en memoria (más compatible)
    const records = await tasksTable
      .select({
        fields: Object.values(TASK_FIELDS),
        sort: [{ field: TASK_FIELDS.orden, direction: 'asc' }],
      })
      .all();

    // Filtrar tareas que pertenecen a este proyecto
    const filteredRecords = records.filter((record) => {
      const proyecto = record.fields[TASK_FIELDS.proyecto] as string[] | undefined;
      return proyecto && proyecto.includes(projectId);
    });

    return filteredRecords.map((record) => mapRecordToTask(record, teamNames));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

// Create a new task
export async function createTask(
  projectId: string,
  data: {
    nombreTarea: string;
    estado?: string;
    bloque?: string;
    orden?: number;
    tipoTarea?: string;
    fechaLimite?: string;
    descripcion?: string;
    notas?: string;
  }
): Promise<Task> {
  try {
    const fields: Record<string, unknown> = {
      [TASK_FIELDS.nombreTarea]: data.nombreTarea,
      [TASK_FIELDS.proyecto]: [projectId], // Just the record ID, not an object
    };

    // For singleSelect fields in Airtable SDK, just pass the string value
    if (data.estado) {
      fields[TASK_FIELDS.estado] = data.estado;
    }
    if (data.bloque) {
      fields[TASK_FIELDS.bloque] = data.bloque;
    }
    if (data.orden !== undefined && data.orden !== null) {
      fields[TASK_FIELDS.orden] = data.orden;
    }
    if (data.tipoTarea) {
      fields[TASK_FIELDS.tipoTarea] = data.tipoTarea;
    }
    if (data.fechaLimite) {
      fields[TASK_FIELDS.fechaLimite] = data.fechaLimite;
    }
    if (data.descripcion) {
      fields[TASK_FIELDS.descripcion] = data.descripcion;
    }
    if (data.notas) {
      fields[TASK_FIELDS.notas] = data.notas;
    }

    const record = await tasksTable.create(fields as Partial<Airtable.FieldSet>);
    return mapRecordToTask(record);
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

// Update a task
// Includes automatic date tracking:
// - When status changes to "En progreso" and fechaInicio is empty → set fechaInicio to today
// - When status changes to "Completado" → set fechaCompletado to today
// - When status changes FROM "Completado" to another → clear fechaCompletado
export async function updateTask(
  taskId: string,
  data: Partial<{
    nombreTarea: string;
    estado: string;
    bloque: string | null;
    orden: number | null;
    tipoTarea: string | null;
    fechaLimite: string | null;
    descripcion: string | null;
    notas: string | null;
  }>,
  currentTask?: { estado: string; fechaInicio: string | null } // Optional: pass current task to check state transitions
): Promise<Task> {
  try {
    const fields: Record<string, unknown> = {};
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    if (data.nombreTarea !== undefined) {
      fields[TASK_FIELDS.nombreTarea] = data.nombreTarea;
    }

    // Handle estado with automatic date tracking
    if (data.estado !== undefined) {
      fields[TASK_FIELDS.estado] = data.estado || null;

      // If changing TO "En progreso" and we have currentTask info
      if (data.estado === 'En progreso' && currentTask) {
        // Only set fechaInicio if it's currently empty
        if (!currentTask.fechaInicio) {
          fields[TASK_FIELDS.fechaInicio] = today;
        }
      }

      // If changing TO "Completado"
      if (data.estado === 'Completado') {
        fields[TASK_FIELDS.fechaCompletado] = today;
        // If fechaInicio is empty (task went directly to Completado), set it to today too
        if (currentTask && !currentTask.fechaInicio) {
          fields[TASK_FIELDS.fechaInicio] = today;
        }
      }

      // If changing FROM "Completado" to another status
      if (currentTask && currentTask.estado === 'Completado' && data.estado !== 'Completado') {
        // Clear the completion date
        fields[TASK_FIELDS.fechaCompletado] = null;
      }
    }

    if (data.bloque !== undefined) {
      fields[TASK_FIELDS.bloque] = data.bloque || null;
    }
    if (data.orden !== undefined) {
      fields[TASK_FIELDS.orden] = data.orden;
    }
    if (data.tipoTarea !== undefined) {
      fields[TASK_FIELDS.tipoTarea] = data.tipoTarea || null;
    }
    if (data.fechaLimite !== undefined) {
      fields[TASK_FIELDS.fechaLimite] = data.fechaLimite || null;
    }
    if (data.descripcion !== undefined) {
      fields[TASK_FIELDS.descripcion] = data.descripcion || null;
    }
    if (data.notas !== undefined) {
      fields[TASK_FIELDS.notas] = data.notas || null;
    }

    const record = await tasksTable.update(taskId, fields as Partial<Airtable.FieldSet>);
    return mapRecordToTask(record);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

// Delete a task
export async function deleteTask(taskId: string): Promise<void> {
  try {
    await airtableRateLimiter.enqueue(() => tasksTable.destroy(taskId));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// Batch update multiple tasks (útil para reordenar)
// Airtable permite hasta 10 records por batch
export async function updateTasksBatch(
  updates: Array<{ id: string; fields: Record<string, unknown> }>
): Promise<void> {
  try {
    // Dividir en batches de 10
    const batches: Array<Array<{ id: string; fields: Record<string, unknown> }>> = [];
    for (let i = 0; i < updates.length; i += 10) {
      batches.push(updates.slice(i, i + 10));
    }

    // Procesar cada batch con rate limiting
    for (const batch of batches) {
      await airtableRateLimiter.enqueue(() =>
        tasksTable.update(
          batch.map((u) => ({
            id: u.id,
            fields: u.fields as Airtable.FieldSet,
          }))
        )
      );
    }
  } catch (error) {
    console.error('Error batch updating tasks:', error);
    throw error;
  }
}

// Update project status
export async function updateProjectStatus(projectId: string, status: string): Promise<void> {
  try {
    const fields: Record<string, unknown> = {
      [PROJECT_FIELDS.estadoManual]: status, // Just the string value for singleSelect
    };
    await projectsTable.update(projectId, fields as unknown as Partial<Airtable.FieldSet>);
  } catch (error) {
    console.error('Error updating project status:', error);
    throw error;
  }
}

// Update project date (Fecha Prometida)
export async function updateProjectDate(projectId: string, date: string): Promise<void> {
  try {
    const fields: Record<string, unknown> = {
      [PROJECT_FIELDS.fechaPrometida]: date, // Format: YYYY-MM-DD
    };
    await projectsTable.update(projectId, fields as unknown as Partial<Airtable.FieldSet>);
  } catch (error) {
    console.error('Error updating project date:', error);
    throw error;
  }
}

// Helper functions
function mapRecordToTask(
  record: Airtable.Record<Airtable.FieldSet>,
  teamNames?: Map<string, string>
): Task {
  const fields = record.fields;

  // Handle proyecto as linked record (array of record IDs)
  const proyecto = fields[TASK_FIELDS.proyecto] as string[] | undefined;
  const proyectoId = proyecto?.[0] || null;

  // Handle responsable as linked record (array of record IDs)
  const responsableRaw = fields[TASK_FIELDS.responsable] as string[] | undefined;
  let responsable: Responsable[] | null = null;

  if (Array.isArray(responsableRaw) && responsableRaw.length > 0) {
    responsable = responsableRaw
      .map((recordId) => {
        // Look up the name from the team members cache
        const name = teamNames?.get(recordId) || recordId;
        return { id: recordId, name };
      })
      .filter((r): r is Responsable => r !== null);
  }

  return {
    id: record.id,
    nombreTarea: (fields[TASK_FIELDS.nombreTarea] as string) || 'Sin nombre',
    proyectoId,
    bloque: (fields[TASK_FIELDS.bloque] as string) || null,
    orden: (fields[TASK_FIELDS.orden] as number) ?? null,
    tipoTarea: (fields[TASK_FIELDS.tipoTarea] as string) || null,
    estado: (fields[TASK_FIELDS.estado] as string) || 'Pendiente',
    fechaLimite: (fields[TASK_FIELDS.fechaLimite] as string) || null,
    fechaInicio: (fields[TASK_FIELDS.fechaInicio] as string) || null,
    fechaCompletado: (fields[TASK_FIELDS.fechaCompletado] as string) || null,
    descripcion: (fields[TASK_FIELDS.descripcion] as string) || null,
    notas: (fields[TASK_FIELDS.notas] as string) || null,
    responsable,
  };
}

function parseProgressValue(value: unknown): number {
  if (typeof value === 'number') return Math.round(value * 100);
  if (typeof value === 'string') {
    // Handle "Sin tareas" or percentage strings
    if (value === 'Sin tareas') return 0;
    const match = value.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}
