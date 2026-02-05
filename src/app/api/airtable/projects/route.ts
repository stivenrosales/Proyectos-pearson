import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProjects, updateProjectStatus, updateProjectDate } from '@/lib/airtable';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for pagination and filters
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const offset = searchParams.get('offset') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    // Obtener el ID de Airtable del usuario (para filtrar proyectos)
    // Si es admin, ve todos los proyectos (responsableId = undefined)
    // Si es asesor, solo ve sus proyectos asignados
    const user = session.user as { role: string; airtableId: string | null; name?: string };
    const responsableId = user.role === 'admin' ? undefined : user.airtableId || undefined;

    // DEBUG: Log session info
    console.log('[API DEBUG] Session user:', {
      name: user.name,
      role: user.role,
      airtableId: user.airtableId,
      responsableId,
    });

    const result = await getProjects({
      pageSize,
      offset,
      search,
      status,
      responsableId,
    });

    return NextResponse.json({
      success: true,
      data: result.projects,
      hasMore: result.hasMore,
      offset: result.offset,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Error fetching projects' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, status, fechaPrometida } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId' },
        { status: 400 }
      );
    }

    // Update status if provided
    if (status) {
      await updateProjectStatus(projectId, status);
    }

    // Update date if provided
    if (fechaPrometida) {
      await updateProjectDate(projectId, fechaPrometida);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Error updating project' },
      { status: 500 }
    );
  }
}
