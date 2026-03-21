import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

function computeStreak(logs) {
  const completed = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!completed.has(today.toISOString().split('T')[0])) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (!completed.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function weeklyView(logs) {
  const completed = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, completed: completed.has(dateStr) };
  });
}

function getCompletionLogs(db, userId) {
  const history = db.prepare(
    'SELECT date_completed as date, status FROM daily_challenges WHERE user_id = ? AND date_completed IS NOT NULL'
  ).all(userId);
  return history.map((r) => ({ date: r.date, completed: r.status === 'completed' }));
}

router.get('/', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const today = new Date().toISOString().split('T')[0];
  const db = getDb();

  const userHabits = db.prepare(
    'SELECT uh.habit_id, h.task FROM user_habits uh JOIN habits h ON h.id = uh.habit_id WHERE uh.user_id = ?'
  ).all(userId);
  const customHabits = db.prepare(
    'SELECT id as habit_id, task FROM custom_habits WHERE user_id = ?'
  ).all(userId);

  // Lazily create today's challenge rows for any new/missing habits
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
  for (const h of userHabits) insHabit.run(userId, h.habit_id, userId, h.habit_id, today);
  for (const h of customHabits) insCustom.run(userId, h.habit_id, userId, h.habit_id, today);

  const challenges = db.prepare(
    `SELECT dc.id as challenge_id, dc.habit_id, dc.custom_habit_id, dc.status,
            dc.date_completed, dc.proof_image_url, dc.coins_issued, dc.streak_count,
            COALESCE(h.task, ch.task) as task
     FROM daily_challenges dc
     LEFT JOIN habits h ON h.id = dc.habit_id
     LEFT JOIN custom_habits ch ON ch.id = dc.custom_habit_id
     WHERE dc.user_id = ? AND date(dc.created_at) = ?`
  ).all(userId, today);

  const logs = getCompletionLogs(db, userId);
  const profile = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);

  return res.json({
    challenges,
    streak: computeStreak(logs),
    week: weeklyView(logs),
    coins: profile?.total_coins ?? 0,
  });
}));

router.patch('/:id', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const challengeId = Number(req.params.id);
  const today = new Date().toISOString().split('T')[0];
  const db = getDb();

  const challenge = db.prepare(
    'SELECT id FROM daily_challenges WHERE id = ? AND user_id = ?'
  ).get(challengeId, userId);
  if (!challenge) return res.status(404).json({ error: 'Not found' });

  db.prepare(
    "UPDATE daily_challenges SET status = 'completed', date_completed = ?, proof_image_url = ?, coins_issued = 10 WHERE id = ?"
  ).run(today, req.body.proof_image_url || null, challengeId);
  db.prepare('UPDATE users SET total_coins = total_coins + 10 WHERE id = ?').run(userId);

  const logs = getCompletionLogs(db, userId);
  const streak = computeStreak(logs);
  db.prepare('UPDATE daily_challenges SET streak_count = ? WHERE id = ?').run(streak, challengeId);
  db.prepare('UPDATE users SET current_streak = ? WHERE id = ?').run(streak, userId);

  const user = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);
  return res.json({ ok: true, coins: user.total_coins, streak });
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
  const today = new Date().toISOString().split('T')[0];
  const db = getDb();

  const habit = db.prepare(
    'SELECT id FROM custom_habits WHERE id = ? AND user_id = ?'
  ).get(customHabitId, userId);
  if (!habit) return res.status(404).json({ error: 'Not found' });

  db.prepare(
    "DELETE FROM daily_challenges WHERE user_id = ? AND custom_habit_id = ? AND status = 'pending' AND date(created_at) = ?"
  ).run(userId, customHabitId, today);
  db.prepare('DELETE FROM custom_habits WHERE id = ? AND user_id = ?').run(customHabitId, userId);
  return res.json({ ok: true });
}));

export default router;
