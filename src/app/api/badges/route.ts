import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const db = getDb();
    const badges = db.prepare(
      'SELECT id as badge_id, badge_type, label, awarded_at FROM badges WHERE user_id = ? ORDER BY awarded_at DESC'
    ).all(userId);
    return NextResponse.json(badges);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
