import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const postId = Number(id);
    const db = getDb();

    try {
      db.prepare('INSERT INTO post_upvotes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
      db.prepare('UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?').run(postId);
      const upvotes = (db.prepare('SELECT upvotes FROM posts WHERE id = ?').get(postId) as { upvotes: number }).upvotes;
      return NextResponse.json({ upvotes });
    } catch {
      return NextResponse.json({ error: 'Already upvoted' }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
