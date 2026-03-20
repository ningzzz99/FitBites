import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function computeStreak(logs) {
  const completedDates = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const current = new Date(today);
  const todayStr = today.toISOString().split('T')[0];
  if (!completedDates.has(todayStr)) current.setDate(current.getDate() - 1);
  while (true) {
    const dateStr = current.toISOString().split('T')[0];
    if (!completedDates.has(dateStr)) break;
    streak++;
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

function weeklyView(logs) {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedDates = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({ date: dateStr, completed: completedDates.has(dateStr) });
  }
  return result;
}

// GET /api/challenges
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const today = new Date().toISOString().split('T')[0];
  try {
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

    const history = db.prepare(
      'SELECT date_completed as date, status FROM daily_challenges WHERE user_id = ? AND date_completed IS NOT NULL'
    ).all(userId);

    const logs = history.map((r) => ({ date: r.date, completed: r.status === 'completed' }));
    const streak = computeStreak(logs);
    const week = weeklyView(logs);

    const profile = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);

    return res.json({ challenges, streak, week, coins: profile ? profile.total_coins : 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/challenges/:id
router.patch('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const challengeId = Number(req.params.id);
  const { proof_image_url } = req.body;
  const today = new Date().toISOString().split('T')[0];
  try {
    const db = getDb();

    const challenge = db.prepare(
      'SELECT id FROM daily_challenges WHERE id = ? AND user_id = ?'
    ).get(challengeId, userId);
    if (!challenge) return res.status(404).json({ error: 'Not found' });

    db.prepare(
      "UPDATE daily_challenges SET status = 'completed', date_completed = ?, proof_image_url = ?, coins_issued = 10 WHERE id = ?"
    ).run(today, proof_image_url || null, challengeId);

    db.prepare('UPDATE users SET total_coins = total_coins + 10 WHERE id = ?').run(userId);

    const history = db.prepare(
      'SELECT date_completed as date, status FROM daily_challenges WHERE user_id = ? AND date_completed IS NOT NULL'
    ).all(userId);

    const logs = history.map((r) => ({ date: r.date, completed: r.status === 'completed' }));
    const streak = computeStreak(logs);
    db.prepare('UPDATE daily_challenges SET streak_count = ? WHERE id = ?').run(streak, challengeId);
    db.prepare('UPDATE users SET current_streak = ? WHERE id = ?').run(streak, userId);

    const user = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId);
    return res.json({ ok: true, coins: user.total_coins, streak });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/challenges/custom — add a new custom challenge
router.post('/custom', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { task } = req.body;
  if (!task || !task.trim()) return res.status(400).json({ error: 'Task is required' });
  try {
    const db = getDb();
    const result = db.prepare(
      "INSERT INTO custom_habits (user_id, task, created_at) VALUES (?, ?, datetime('now'))"
    ).run(userId, task.trim());
    return res.json({ id: result.lastInsertRowid, task: task.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/challenges/custom/:id — delete a custom challenge and today's pending daily challenge
router.delete('/custom/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const customHabitId = Number(req.params.id);
  const today = new Date().toISOString().split('T')[0];
  try {
    const db = getDb();
    const habit = db.prepare('SELECT id FROM custom_habits WHERE id = ? AND user_id = ?').get(customHabitId, userId);
    if (!habit) return res.status(404).json({ error: 'Not found' });

    db.prepare(
      "DELETE FROM daily_challenges WHERE user_id = ? AND custom_habit_id = ? AND status = 'pending' AND date(created_at) = ?"
    ).run(userId, customHabitId, today);
    db.prepare('DELETE FROM custom_habits WHERE id = ? AND user_id = ?').run(customHabitId, userId);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
