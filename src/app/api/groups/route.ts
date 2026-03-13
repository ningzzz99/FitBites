import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

// GET /api/groups - List groups the user is a member of
export async function GET() {
    try {
        const { userId } = await requireAuth();
        const db = getDb();

        const groups = db.prepare(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC
    `).all(userId);

        return NextResponse.json(groups);
    } catch (error: any) {
        console.error('Group Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 500 });
    }
}

// POST /api/groups - Create a new group
export async function POST(req: NextRequest) {
    try {
        const { userId } = await requireAuth();
        const { name, description } = await req.json();
        const db = getDb();

        if (!name || name.trim().length === 0) {
            return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
        }

        const result = db.transaction(() => {
            const g = db.prepare('INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)')
                .run(name, description, userId);

            const groupId = g.lastInsertRowid;

            db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)')
                .run(groupId, userId);

            return groupId;
        })();

        return NextResponse.json({ id: result, name, description });
    } catch (error: any) {
        console.error('Group Creation Error:', error);
        return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 500 });
    }
}
