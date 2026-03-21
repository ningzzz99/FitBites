import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

const COLS = 'id as ingredient_id, ingredient_name, category, quantity, unit, created_at';

router.get('/', requireAuth, handle((req, res) => {
  const db = getDb();
  return res.json(
    db.prepare(`SELECT ${COLS} FROM ingredients WHERE user_id = ? ORDER BY created_at DESC`).all(req.session.userId)
  );
}));

router.post('/', requireAuth, handle((req, res) => {
  const { ingredient_name } = req.body;
  if (!ingredient_name?.trim()) return res.status(400).json({ error: 'Ingredient name required' });
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO ingredients (user_id, ingredient_name, quantity, unit) VALUES (?, ?, 1, 'units')"
  ).run(req.session.userId, ingredient_name.trim().toLowerCase());
  return res.json(db.prepare(`SELECT ${COLS} FROM ingredients WHERE id = ?`).get(result.lastInsertRowid));
}));

router.patch('/:id', requireAuth, handle((req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const ing = db.prepare('SELECT id FROM ingredients WHERE id = ? AND user_id = ?').get(id, req.session.userId);
  if (!ing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE ingredients SET quantity = ? WHERE id = ?').run(req.body.quantity, id);
  return res.json({ ok: true });
}));

router.delete('/:id', requireAuth, handle((req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM ingredients WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.session.userId);
  return res.json({ ok: true });
}));

export default router;
