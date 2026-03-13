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
        const habitId = parseInt(id);
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        db.transaction(() => {
            db.prepare('DELETE FROM user_habits WHERE user_id = ? AND habit_id = ?').run(
                userId,
                habitId
            );
            db.prepare('DELETE FROM daily_challenges WHERE user_id = ? AND habit_id = ? AND date(created_at) = ?').run(
                userId,
                habitId,
                today
            );
        })();

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
