import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/habits
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const habits = db.prepare('SELECT id as habit_id, task FROM habits ORDER BY id').all();
    return res.json(habits);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/user-habits/save
router.post('/save', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { habitIds, customTask } = req.body;
  if (!habitIds || !Array.isArray(habitIds) || habitIds.length === 0) {
    return res.status(400).json({ error: 'At least one habit required' });
  }
  try {
    const db = getDb();
    const saveAll = db.transaction(() => {
      db.prepare('DELETE FROM user_habits WHERE user_id = ?').run(userId);
      const ins = db.prepare('INSERT OR IGNORE INTO user_habits (user_id, habit_id) VALUES (?, ?)');
      for (const habitId of habitIds) ins.run(userId, habitId);
      if (customTask && customTask.trim()) {
        db.prepare('INSERT INTO custom_habits (user_id, task) VALUES (?, ?)').run(userId, customTask.trim());
      }
    });
    saveAll();
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user-habits/current
router.get('/current', requireAuth, (req, res) => {
  const userId = req.session.userId;
  try {
    const db = getDb();
    const habitRows = db.prepare('SELECT habit_id FROM user_habits WHERE user_id = ?').all(userId);
    const customRow = db.prepare(
      'SELECT task FROM custom_habits WHERE user_id = ? ORDER BY id DESC LIMIT 1'
    ).get(userId);
    return res.json({
      habitIds: habitRows.map((r) => r.habit_id),
      customTask: customRow?.task ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
