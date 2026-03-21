import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

// This router is mounted at both /api/habits (GET /) and /api/user-habits (POST /save, GET /current)

router.get('/', requireAuth, handle((_req, res) => {
  const db = getDb();
  return res.json(db.prepare('SELECT id as habit_id, task FROM habits ORDER BY id').all());
}));

router.post('/save', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const { habitIds, customTask } = req.body;
  if (!Array.isArray(habitIds) || habitIds.length === 0) {
    return res.status(400).json({ error: 'At least one habit required' });
  }
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM user_habits WHERE user_id = ?').run(userId);
    const ins = db.prepare('INSERT OR IGNORE INTO user_habits (user_id, habit_id) VALUES (?, ?)');
    for (const habitId of habitIds) ins.run(userId, habitId);
    if (customTask?.trim()) {
      db.prepare('INSERT INTO custom_habits (user_id, task) VALUES (?, ?)').run(userId, customTask.trim());
    }
  })();
  return res.json({ ok: true });
}));

router.get('/current', requireAuth, handle((req, res) => {
  const userId = req.session.userId;
  const db = getDb();
  const habitRows = db.prepare('SELECT habit_id FROM user_habits WHERE user_id = ?').all(userId);
  const customRow = db.prepare(
    'SELECT task FROM custom_habits WHERE user_id = ? ORDER BY id DESC LIMIT 1'
  ).get(userId);
  return res.json({
    habitIds: habitRows.map((r) => r.habit_id),
    customTask: customRow?.task ?? null,
  });
}));

export default router;
