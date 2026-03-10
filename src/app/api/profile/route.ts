import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const db = getDb();

    const user = db.prepare(
      'SELECT id, username, email, height, weight, dietary_req, total_coins, shown_in_leaderboard, banner_color, banner_icon FROM users WHERE id = ?'
    ).get(userId) as Record<string, unknown> | undefined;

    const badges = db.prepare(
      'SELECT id as badge_id, badge_type, label, awarded_at FROM badges WHERE user_id = ? ORDER BY awarded_at DESC'
    ).all(userId);

    const streak = db.prepare(
      'SELECT COALESCE(MAX(streak_count), 0) as streak FROM daily_challenges WHERE user_id = ?'
    ).get(userId) as { streak: number };

    const unlockedItems = db.prepare(
      'SELECT item_type, item_value FROM unlocked_banner_items WHERE user_id = ?'
    ).all(userId) as { item_type: string; item_value: string }[];

    return NextResponse.json({
      profile: { ...user, shown_in_leaderboard: Boolean(user?.shown_in_leaderboard) },
      badges,
      streak: streak.streak,
      unlocked_items: unlockedItems,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { height, weight, dietary_req, banner_color, banner_icon, shown_in_leaderboard } =
      await req.json() as {
        height?: number; weight?: number; dietary_req?: string;
        banner_color?: string; banner_icon?: string; shown_in_leaderboard?: boolean;
      };

    const db = getDb();
    db.prepare(
      `UPDATE users SET
        height = COALESCE(?, height),
        weight = COALESCE(?, weight),
        dietary_req = COALESCE(?, dietary_req),
        banner_color = COALESCE(?, banner_color),
        banner_icon = COALESCE(?, banner_icon),
        shown_in_leaderboard = COALESCE(?, shown_in_leaderboard)
       WHERE id = ?`
    ).run(
      height ?? null,
      weight ?? null,
      dietary_req ?? null,
      banner_color ?? null,
      banner_icon ?? null,
      shown_in_leaderboard === undefined ? null : shown_in_leaderboard ? 1 : 0,
      userId
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
