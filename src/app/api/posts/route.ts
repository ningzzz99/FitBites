import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session.userId;
    const db = getDb();

    // If logged in, filter out hidden posts. If guest, show everything.
    let posts;
    if (userId) {
      posts = db.prepare(`
        SELECT p.id as post_id, p.user_id, p.content, p.topic, p.anonymous, p.upvotes, p.created_at,
               u.username
        FROM posts p JOIN users u ON u.id = p.user_id
        WHERE p.id NOT IN (SELECT post_id FROM hidden_posts WHERE user_id = ?)
        ORDER BY p.created_at DESC
        LIMIT 50
      `).all(userId);
    } else {
      posts = db.prepare(`
        SELECT p.id as post_id, p.user_id, p.content, p.topic, p.anonymous, p.upvotes, p.created_at,
               u.username
        FROM posts p JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT 50
      `).all();
    }

    const mapped = (posts as any[]).map((p) => ({
      ...p,
      anonymous: Boolean(p.anonymous),
      username: p.anonymous ? undefined : p.username,
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('COMMUNITY_GET_ERROR:', error);
    // Return empty list instead of 401 to prevent redirect loop for guests
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { content, topic, anonymous } = await req.json() as {
      content: string; topic: string; anonymous: boolean;
    };

    if (!content || content.trim().length < 5) {
      return NextResponse.json({ error: 'Post too short' }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: 'Post too long' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      'INSERT INTO posts (user_id, content, topic, anonymous) VALUES (?, ?, ?, ?)'
    ).run(userId, content.trim(), topic ?? 'general', anonymous ? 1 : 0);

    // Award First Post badge if applicable
    const postCount = (db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id = ?').get(userId) as { c: number }).c;
    if (postCount === 1) {
      db.prepare("INSERT OR IGNORE INTO badges (user_id, badge_type, label) VALUES (?, 'contributor', 'First Post')").run(userId);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
