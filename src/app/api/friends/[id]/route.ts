import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireAuth();
    const friendId = parseInt(params.id, 10);
    const { status } = (await req.json()) as { status: 'accepted' | 'rejected' };

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getDb();

    // Only the recipient (user_id_2) can accept or reject
    const row = db
      .prepare('SELECT id FROM friends WHERE id = ? AND user_id_2 = ?')
      .get(friendId, userId);

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (status === 'rejected') {
      db.prepare('DELETE FROM friends WHERE id = ?').run(friendId);
    } else {
      db.prepare('UPDATE friends SET status = ? WHERE id = ?').run('accepted', friendId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
