import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const q = new URL(req.url).searchParams.get('q') ?? '';
    if (q.length < 2) return NextResponse.json([]);

    const db = getDb();
    const users = db
      .prepare('SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10')
      .all(`%${q}%`, userId);

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
