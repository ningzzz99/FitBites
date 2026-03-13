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
        const postId = parseInt(id);

        const db = getDb();

        // Check if the post belongs to the user
        const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId) as { user_id: number } | undefined;

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (post.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
