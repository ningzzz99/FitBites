import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/ingredients
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT id as ingredient_id, ingredient_name, category, quantity, unit, created_at FROM ingredients WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.session.userId);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/ingredients
router.post('/', requireAuth, (req, res) => {
  const { ingredient_name } = req.body;
  if (!ingredient_name || !ingredient_name.trim()) {
    return res.status(400).json({ error: 'Ingredient name required' });
  }
  try {
    const db = getDb();
    const result = db.prepare(
      "INSERT INTO ingredients (user_id, ingredient_name, quantity, unit) VALUES (?, ?, 1, 'units')"
    ).run(req.session.userId, ingredient_name.trim().toLowerCase());
    const row = db.prepare(
      'SELECT id as ingredient_id, ingredient_name, category, quantity, unit, created_at FROM ingredients WHERE id = ?'
    ).get(result.lastInsertRowid);
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/ingredients/:id
router.patch('/:id', requireAuth, (req, res) => {
  const { quantity } = req.body;
  const id = Number(req.params.id);
  try {
    const db = getDb();
    const ing = db.prepare('SELECT id FROM ingredients WHERE id = ? AND user_id = ?').get(id, req.session.userId);
    if (!ing) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE ingredients SET quantity = ? WHERE id = ?').run(quantity, id);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/ingredients/:id
router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  try {
    const db = getDb();
    db.prepare('DELETE FROM ingredients WHERE id = ? AND user_id = ?').run(id, req.session.userId);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
