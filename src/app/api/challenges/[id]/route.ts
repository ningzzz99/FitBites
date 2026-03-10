import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

// PATCH /api/challenges/[id] — mark complete with proof image URL
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const { proof_image_url } = await req.json() as { proof_image_url: string };
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Verify challenge belongs to user
    const challenge = db.prepare(
      'SELECT id FROM daily_challenges WHERE id = ? AND user_id = ?'
    ).get(Number(id), userId);
    if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    db.prepare(
      `UPDATE daily_challenges SET status = 'completed', date_completed = ?, proof_image_url = ?, coins_issued = 10
       WHERE id = ?`
    ).run(today, proof_image_url, Number(id));

    // Award 10 coins to user
    db.prepare('UPDATE users SET total_coins = total_coins + 10 WHERE id = ?').run(userId);

    // Recalculate and update streak_count for this challenge
    const history = db.prepare(
      `SELECT date_completed as date, status FROM daily_challenges WHERE user_id = ? AND date_completed IS NOT NULL`
    ).all(userId) as { date: string; status: string }[];

    const { computeStreak } = await import('@/lib/algorithms/slidingWindow');
    const streak = computeStreak(history.map((r) => ({ date: r.date, completed: r.status === 'completed' })));

    db.prepare('UPDATE daily_challenges SET streak_count = ? WHERE id = ?').run(streak, Number(id));

    const coins = (db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId) as { total_coins: number }).total_coins;

    return NextResponse.json({ ok: true, coins, streak });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
