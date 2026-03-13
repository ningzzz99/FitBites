import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await requireAuth();
        const postId = parseInt(params.id);

        const db = getDb();

        // Check if the post exists
        const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Insert into hidden_posts (IGNORE if already hidden)
        db.prepare('INSERT OR IGNORE INTO hidden_posts (user_id, post_id) VALUES (?, ?)')
            .run(userId, postId);

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
