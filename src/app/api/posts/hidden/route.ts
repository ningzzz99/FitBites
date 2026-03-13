import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
    try {
        const { userId } = await requireAuth();
        const db = getDb();

        const posts = db.prepare(`
      SELECT p.id as post_id, p.user_id, p.content, p.topic, p.anonymous, p.upvotes, p.created_at,
             u.username
      FROM posts p 
      JOIN users u ON u.id = p.user_id
      JOIN hidden_posts hp ON hp.post_id = p.id
      WHERE hp.user_id = ?
      ORDER BY hp.id DESC
    `).all(userId);

        const mapped = (posts as any[]).map((p) => ({
            ...p,
            anonymous: Boolean(p.anonymous),
            username: p.anonymous ? undefined : p.username,
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error('HIDDEN_POSTS_GET_ERROR:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
