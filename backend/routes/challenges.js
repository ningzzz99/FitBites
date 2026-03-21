import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware.js';

const router = express.Router();

const today = () => new Date().toISOString().split('T')[0];

function getCompletedDates(db, userId) {
  return new Set(
    db.prepare(
      'SELECT date_completed FROM daily_challenges WHERE user_id = ? AND date_completed IS NOT NULL'
    ).all(userId).map((r) => r.date_completed)
  );
}

function computeStreak(completed) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (!completed.has(d.toISOString().split('T')[0])) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (completed.has(d.toISOString().split('T')[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function weeklyView(completed) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(day.getDate() - (6 - i));
    const dateStr = day.toISOString().split('T')[0];
    return { date: dateStr, completed: completed.has(dateStr) };
  });
}

router.get('/', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const todayStr = today();
  const db = getDb();

  const userHabits = db.prepare(
    'SELECT uh.habit_id, h.task FROM user_habits uh JOIN habits h ON h.id = uh.habit_id WHERE uh.user_id = ?'
  ).all(userId);
  const customHabits = db.prepare(
    'SELECT id as habit_id, task FROM custom_habits WHERE user_id = ?'
  ).all(userId);

  const insHabit = db.prepare(
    `INSERT OR IGNORE INTO daily_challenges (user_id, habit_id, status, created_at)
     SELECT ?, ?, 'pending', datetime('now')
     WHERE NOT EXISTS (
       SELECT 1 FROM daily_challenges WHERE user_id = ? AND habit_id = ? AND date(created_at) = ?
     )`
  );
  const insCustom = db.prepare(
    `INSERT OR IGNORE INTO daily_challenges (user_id, custom_habit_id, status, created_at)
     SELECT ?, ?, 'pending', datetime('now')
     WHERE NOT EXISTS (
       SELECT 1 FROM daily_challenges WHERE user_id = ? AND custom_habit_id = ? AND date(created_at) = ?
     )`
  );
  for (const h of userHabits) insHabit.run(userId, h.habit_id, userId, h.habit_id, todayStr);
  for (const h of customHabits) insCustom.run(userId, h.habit_id, userId, h.habit_id, todayStr);

  const challenges = db.prepare(
    `SELECT dc.id as challenge_id, dc.habit_id, dc.custom_habit_id, dc.status,
            dc.date_completed, dc.proof_image_url, dc.coins_issued, dc.streak_count,
            COALESCE(h.task, ch.task) as task
     FROM daily_challenges dc
     LEFT JOIN habits h ON h.id = dc.habit_id
     LEFT JOIN custom_habits ch ON ch.id = dc.custom_habit_id
     WHERE dc.user_id = ? AND date(dc.created_at) = ?`
  ).all(userId, todayStr);

  const completed = getCompletedDates(db, userId);
  const profile = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);

  return res.json({
    challenges,
    streak: computeStreak(completed),
    week: weeklyView(completed),
    coins: profile?.total_coins ?? 0,
  });
}));

router.patch('/:id', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const challengeId = Number(req.params.id);
  const db = getDb();

  const challenge = db.prepare(
    'SELECT id FROM daily_challenges WHERE id = ? AND user_id = ?'
  ).get(challengeId, userId);
  if (!challenge) return res.status(404).json({ error: 'Not found' });

  const { total_coins } = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);

  db.prepare(
    "UPDATE daily_challenges SET status = 'completed', date_completed = ?, proof_image_url = ?, coins_issued = 10 WHERE id = ?"
  ).run(today(), req.body.proof_image_url || null, challengeId);
  db.prepare('UPDATE users SET total_coins = total_coins + 10 WHERE id = ?').run(userId);

  const completed = getCompletedDates(db, userId);
  const streak = computeStreak(completed);
  db.prepare('UPDATE daily_challenges SET streak_count = ? WHERE id = ?').run(streak, challengeId);
  db.prepare('UPDATE users SET current_streak = ? WHERE id = ?').run(streak, userId);

  return res.json({ ok: true, coins: total_coins + 10, streak });
}));

router.post('/custom', requireAuth, handle((req, res) => {
  const { task } = req.body;
  if (!task?.trim()) return res.status(400).json({ error: 'Task is required' });
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO custom_habits (user_id, task, created_at) VALUES (?, ?, datetime('now'))"
  ).run(req.session.userId, task.trim());
  return res.json({ id: result.lastInsertRowid, task: task.trim() });
}));

router.delete('/custom/:id', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const customHabitId = Number(req.params.id);
  const db = getDb();

  const habit = db.prepare(
    'SELECT id FROM custom_habits WHERE id = ? AND user_id = ?'
  ).get(customHabitId, userId);
  if (!habit) return res.status(404).json({ error: 'Not found' });

  db.prepare(
    "DELETE FROM daily_challenges WHERE user_id = ? AND custom_habit_id = ? AND status = 'pending' AND date(created_at) = ?"
  ).run(userId, customHabitId, today());
  db.prepare('DELETE FROM custom_habits WHERE id = ? AND user_id = ?').run(customHabitId, userId);
  return res.json({ ok: true });
}));

export default router;
