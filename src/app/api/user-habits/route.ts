import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

// GET /api/user-habits — list user's habits (regular + custom)
export async function GET() {
  try {
    const { userId } = await requireAuth();
    const db = getDb();

    const habits = db.prepare(
      `SELECT uh.habit_id, h.task, 'regular' as kind
       FROM user_habits uh JOIN habits h ON h.id = uh.habit_id
       WHERE uh.user_id = ?`
    ).all(userId);

    const custom = db.prepare(
      `SELECT id as habit_id, task, 'custom' as kind FROM custom_habits WHERE user_id = ?`
    ).all(userId);

    return NextResponse.json({ habits, custom });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST /api/user-habits — save selected habits (onboarding)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { habitIds, customTask } = await req.json() as { habitIds: number[]; customTask?: string };
    const db = getDb();

    const insHabit = db.prepare('INSERT OR IGNORE INTO user_habits (user_id, habit_id) VALUES (?, ?)');
    for (const id of habitIds) insHabit.run(userId, id);

    if (customTask?.trim()) {
      db.prepare('INSERT INTO custom_habits (user_id, task) VALUES (?, ?)').run(userId, customTask.trim());
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
