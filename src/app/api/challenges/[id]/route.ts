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

    // Get the task name for the notification
    const fullChallenge = db.prepare(`
      SELECT COALESCE(h.task, ch.task) as task_name
      FROM daily_challenges dc
      LEFT JOIN habits h ON h.id = dc.habit_id
      LEFT JOIN custom_habits ch ON ch.id = dc.custom_habit_id
      WHERE dc.id = ?
    `).get(Number(id)) as { task_name: string };

    // Post to all groups the user is in
    const userGroups = db.prepare('SELECT group_id FROM group_members WHERE user_id = ?').all(userId) as { group_id: number }[];
    const insMsg = db.prepare('INSERT INTO group_messages (group_id, user_id, content, type) VALUES (?, ?, ?, ?)');
    for (const g of userGroups) {
      insMsg.run(g.group_id, userId, `completed the habit: ${fullChallenge.task_name}!`, 'notification');
    }

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
