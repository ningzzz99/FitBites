import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const postId = parseInt(id, 10);
    const db = getDb();

    const replies = db
      .prepare(
        `SELECT r.id as reply_id, r.post_id, r.user_id, r.content, r.anonymous, r.created_at,
                u.username
         FROM post_replies r
         JOIN users u ON r.user_id = u.id
         WHERE r.post_id = ?
         ORDER BY r.created_at ASC`
      )
      .all(postId);

    return NextResponse.json(replies);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const postId = parseInt(id, 10);
    const { content, anonymous } = (await req.json()) as {
      content: string;
      anonymous: boolean;
    };

    if (!content || content.trim().length < 5 || content.length > 300) {
      return NextResponse.json({ error: 'Reply must be 5–300 characters.' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      'INSERT INTO post_replies (post_id, user_id, content, anonymous) VALUES (?, ?, ?, ?)'
    ).run(postId, userId, content.trim(), anonymous ? 1 : 0);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
