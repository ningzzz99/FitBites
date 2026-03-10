import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const db = getDb();

    // Global leaderboard: users opted in, with their max streak
    const global = db.prepare(`
      SELECT u.id as user_id, u.username, u.total_coins, u.banner_color, u.banner_icon,
             COALESCE(MAX(dc.streak_count), 0) as streak_count
      FROM users u
      LEFT JOIN daily_challenges dc ON dc.user_id = u.id
      WHERE u.shown_in_leaderboard = 1
      GROUP BY u.id
      ORDER BY streak_count DESC
    `).all();

    // Friends leaderboard (accepted friends + self)
    const friendIds = db.prepare(`
      SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END as friend_id
      FROM friends
      WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = 'accepted'
    `).all(userId, userId, userId) as { friend_id: number }[];

    const friendIdSet = new Set([userId, ...friendIds.map((f) => f.friend_id)]);

    const friends = (global as { user_id: number }[]).filter((e) => friendIdSet.has(e.user_id));

    return NextResponse.json({ global, friends, currentUserId: userId });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
