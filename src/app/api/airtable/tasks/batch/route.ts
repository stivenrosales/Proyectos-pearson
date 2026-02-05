import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateTasksBatch } from '@/lib/airtable';

// PATCH /api/airtable/tasks/batch - Update multiple tasks at once
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Updates array is required' },
        { status: 400 }
      );
    }

    // Validar que cada update tenga id y orden
    for (const update of updates) {
      if (!update.id || typeof update.orden !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Each update must have id and orden' },
          { status: 400 }
        );
      }
    }

    // Transformar a formato de Airtable
    const airtableUpdates = updates.map((u: { id: string; orden: number }) => ({
      id: u.id,
      fields: { Orden: u.orden },
    }));

    await updateTasksBatch(airtableUpdates);

    return NextResponse.json({
      success: true,
      message: `${updates.length} tasks updated`,
    });
  } catch (error) {
    console.error('Error batch updating tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error updating tasks',
      },
      { status: 500 }
    );
  }
}
