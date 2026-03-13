import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireAuth();
        const { id } = await params;
        const postId = parseInt(id);

        const db = getDb();

        // Check if the post exists
        const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Remove from hidden_posts
        db.prepare('DELETE FROM hidden_posts WHERE user_id = ? AND post_id = ?')
            .run(userId, postId);

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
