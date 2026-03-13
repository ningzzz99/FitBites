import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireAuth();
        const { id } = await params;
        const customHabitId = parseInt(id);
        const db = getDb();

        const today = new Date().toISOString().split('T')[0];

        db.transaction(() => {
            db.prepare('DELETE FROM custom_habits WHERE user_id = ? AND id = ?').run(
                userId,
                customHabitId
            );
            db.prepare('DELETE FROM daily_challenges WHERE user_id = ? AND custom_habit_id = ? AND date(created_at) = ?').run(
                userId,
                customHabitId,
                today
            );
        })();

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
