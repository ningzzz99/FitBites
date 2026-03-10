import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ user: null });
  }

  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, email, height, weight, dietary_req, total_coins, shown_in_leaderboard, banner_color, banner_icon FROM users WHERE id = ?'
  ).get(session.userId) as Record<string, unknown> | undefined;

  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({ user: { ...user, shown_in_leaderboard: Boolean(user.shown_in_leaderboard) } });
}
