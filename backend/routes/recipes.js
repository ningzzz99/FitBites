import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/recipes?ingredients=a,b,c&calorieLimit=2000
router.get('/', requireAuth, (req, res) => {
  const ingredientParam = req.query.ingredients || '';
  const calorieLimit = req.query.calorieLimit ? Number(req.query.calorieLimit) : null;
  const pantryIngredients = ingredientParam
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  try {
    const db = getDb();
    let recipes;
    if (calorieLimit) {
      recipes = db.prepare(
        'SELECT id as recipe_id, recipe_name, ingredients, instructions, tags, calories FROM recipes WHERE calories <= ?'
      ).all(calorieLimit);
    } else {
      recipes = db.prepare(
        'SELECT id as recipe_id, recipe_name, ingredients, instructions, tags, calories FROM recipes'
      ).all();
    }

    if (pantryIngredients.length === 0) {
      return res.json(recipes.map((r) => ({ ...r, matchPercentage: 0, missingCount: 0 })));
    }

    const scored = recipes.map((recipe) => {
      let recipeIngredients = [];
      try { recipeIngredients = JSON.parse(recipe.ingredients).map((i) => i.toLowerCase()); } catch {}
      const matchCount = recipeIngredients.filter((ri) =>
        pantryIngredients.some((pi) => ri.includes(pi) || pi.includes(ri))
      ).length;
      const matchPercentage = recipeIngredients.length > 0
        ? (matchCount / recipeIngredients.length) * 100 : 0;
      const missingCount = recipeIngredients.length - matchCount;
      return { ...recipe, matchPercentage, missingCount, matchCount };
    });

    const filtered = scored
      .filter((r) => r.matchCount > 0)
      .sort((a, b) => a.missingCount - b.missingCount || b.matchPercentage - a.matchPercentage);

    return res.json(filtered);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
