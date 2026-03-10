import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { computeStreak, weeklyView } from '@/lib/algorithms/slidingWindow';
import type { ChallengeLog } from '@/types';

// GET /api/challenges — today's challenges + streak info
export async function GET() {
  try {
    const { userId } = await requireAuth();
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Ensure a challenge row exists for each of the user's habits today
    const userHabits = db.prepare(
      `SELECT uh.habit_id, h.task FROM user_habits uh JOIN habits h ON h.id = uh.habit_id WHERE uh.user_id = ?`
    ).all(userId) as { habit_id: number; task: string }[];

    const customHabits = db.prepare(
      `SELECT id as habit_id, task FROM custom_habits WHERE user_id = ?`
    ).all(userId) as { habit_id: number; task: string }[];

    const insChallenge = db.prepare(
      `INSERT OR IGNORE INTO daily_challenges (user_id, habit_id, status, created_at)
       SELECT ?, ?, 'pending', datetime('now')
       WHERE NOT EXISTS (
         SELECT 1 FROM daily_challenges WHERE user_id = ? AND habit_id = ? AND date(created_at) = ?
       )`
    );
    const insCustomChallenge = db.prepare(
      `INSERT OR IGNORE INTO daily_challenges (user_id, custom_habit_id, status, created_at)
       SELECT ?, ?, 'pending', datetime('now')
       WHERE NOT EXISTS (
         SELECT 1 FROM daily_challenges WHERE user_id = ? AND custom_habit_id = ? AND date(created_at) = ?
       )`
    );

    for (const h of userHabits) {
      insChallenge.run(userId, h.habit_id, userId, h.habit_id, today);
    }
    for (const h of customHabits) {
      insCustomChallenge.run(userId, h.habit_id, userId, h.habit_id, today);
    }

    // Fetch today's challenges with task names
    const challenges = db.prepare(
      `SELECT dc.id as challenge_id, dc.habit_id, dc.custom_habit_id, dc.status,
              dc.date_completed, dc.proof_image_url, dc.coins_issued, dc.streak_count,
              COALESCE(h.task, ch.task) as task
       FROM daily_challenges dc
       LEFT JOIN habits h ON h.id = dc.habit_id
       LEFT JOIN custom_habits ch ON ch.id = dc.custom_habit_id
       WHERE dc.user_id = ? AND date(dc.created_at) = ?`
    ).all(userId, today);

    // Streak calculation
    const history = db.prepare(
      `SELECT date_completed as date, status FROM daily_challenges WHERE user_id = ? AND date_completed IS NOT NULL`
    ).all(userId) as { date: string; status: string }[];

    const logs: ChallengeLog[] = history.map((r) => ({ date: r.date, completed: r.status === 'completed' }));
    const streak = computeStreak(logs);
    const week = weeklyView(logs, []);

    // Coin balance
    const profile = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId) as { total_coins: number };

    return NextResponse.json({ challenges, streak, week, coins: profile.total_coins });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
