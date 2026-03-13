import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

// GET /api/groups/[id]/messages - Get message history
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireAuth();
        const { id } = await params;
        const groupId = parseInt(id);
        const db = getDb();

        // Verify membership
        const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
            .get(groupId, userId);

        if (!isMember) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        const messages = db.prepare(`
      SELECT m.*, u.username, u.banner_color, u.banner_icon
      FROM group_messages m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.group_id = ?
      ORDER BY m.created_at ASC
      LIMIT 50
    `).all(groupId);

        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

// POST /api/groups/[id]/messages - Send a message or reminder
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireAuth();
        const { id } = await params;
        const groupId = parseInt(id);
        const { content, type = 'text' } = await req.json();
        const db = getDb();

        // Verify membership
        const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
            .get(groupId, userId);

        if (!isMember) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        const res = db.prepare('INSERT INTO group_messages (group_id, user_id, content, type) VALUES (?, ?, ?, ?)')
            .run(groupId, userId, content, type);

        const newMessage = {
            id: res.lastInsertRowid,
            group_id: groupId,
            user_id: userId,
            content,
            type,
            created_at: new Date().toISOString()
        };

        return NextResponse.json(newMessage);
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
