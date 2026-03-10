import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT f.id, f.user_id_1, f.user_id_2, f.status,
                u1.username AS username_1, u2.username AS username_2
         FROM friends f
         JOIN users u1 ON f.user_id_1 = u1.id
         JOIN users u2 ON f.user_id_2 = u2.id
         WHERE f.user_id_1 = ? OR f.user_id_2 = ?
         ORDER BY f.created_at DESC`
      )
      .all(userId, userId);

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { targetUserId } = (await req.json()) as { targetUserId: number };

    if (!targetUserId || targetUserId === userId) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    const db = getDb();

    // Check if relationship already exists (either direction)
    const existing = db
      .prepare(
        'SELECT id FROM friends WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)'
      )
      .get(userId, targetUserId, targetUserId, userId);

    if (existing) {
      return NextResponse.json({ error: 'Request already exists' }, { status: 409 });
    }

    db.prepare('INSERT INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, ?)').run(
      userId,
      targetUserId,
      'pending'
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
