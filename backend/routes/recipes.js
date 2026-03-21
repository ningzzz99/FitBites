import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, handle } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, handle((req, res) => {
  const pantryIngredients = (req.query.ingredients || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const calorieLimit = req.query.calorieLimit ? Number(req.query.calorieLimit) : null;
  const db = getDb();

  const recipes = calorieLimit
    ? db.prepare('SELECT id as recipe_id, recipe_name, ingredients, instructions, tags, calories FROM recipes WHERE calories <= ?').all(calorieLimit)
    : db.prepare('SELECT id as recipe_id, recipe_name, ingredients, instructions, tags, calories FROM recipes').all();

  if (pantryIngredients.length === 0) {
    return res.json(recipes.map((r) => ({ ...r, matchPercentage: 0, missingCount: 0 })));
  }

  const scored = recipes
    .map((recipe) => {
      let recipeIngredients = [];
      try { recipeIngredients = JSON.parse(recipe.ingredients).map((i) => i.toLowerCase()); } catch {}
      const matchCount = recipeIngredients.filter((ri) =>
        pantryIngredients.some((pi) => ri.includes(pi) || pi.includes(ri))
      ).length;
      const matchPercentage = recipeIngredients.length > 0 ? (matchCount / recipeIngredients.length) * 100 : 0;
      return { ...recipe, matchPercentage, missingCount: recipeIngredients.length - matchCount, matchCount };
    })
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => a.missingCount - b.missingCount || b.matchPercentage - a.matchPercentage);

  return res.json(scored);
}));

export default router;
