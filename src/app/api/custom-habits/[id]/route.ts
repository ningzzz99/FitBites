import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await requireAuth();
        const customHabitId = parseInt(params.id);
        const db = getDb();

        db.prepare('DELETE FROM custom_habits WHERE user_id = ? AND id = ?').run(
            userId,
            customHabitId
        );

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
