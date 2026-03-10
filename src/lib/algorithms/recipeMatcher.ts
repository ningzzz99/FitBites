import type { Recipe, ScoredRecipe } from '@/types';

/**
 * Three-phase Recipe Matching Algorithm (as specified in design doc §4.3):
 *
 * Phase A – Fast Retrieval (Filter):
 *   Build an inverted index: ingredient → [recipeIds].
 *   Only consider recipes that share ≥1 ingredient with the user's pantry.
 *
 * Phase B – Scoring:
 *   For each candidate recipe compute:
 *   - matchCount        : ingredients user has
 *   - missingCount      : ingredients user is missing
 *   - matchPercentage   : matchCount / totalIngredients * 100
 *   Respect calorie limit if provided.
 *
 * Phase C – Multi-level Sort:
 *   Primary   : missingCount ASC  (fewest shopping trips first)
 *   Secondary : matchPercentage DESC  (use more of the fridge)
 *   Return top `n` results.
 */

function parseIngredients(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((s: string) => s.toLowerCase().trim())
      : [];
  } catch {
    return raw
      .split(',')
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean);
  }
}

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Build an inverted index mapping each ingredient name to recipe IDs that use it.
 */
function buildInvertedIndex(recipes: Recipe[]): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  for (const recipe of recipes) {
    const ingredients = parseIngredients(recipe.ingredients);
    for (const ing of ingredients) {
      const key = normalise(ing);
      if (!index.has(key)) index.set(key, new Set());
      index.get(key)!.add(recipe.recipe_id);
    }
  }
  return index;
}

/**
 * Phase A: retrieve candidate recipe IDs that share ≥1 pantry ingredient.
 */
function filterCandidates(
  pantry: string[],
  index: Map<string, Set<number>>
): Set<number> {
  const candidates = new Set<number>();
  for (const item of pantry) {
    const key = normalise(item);
    // exact match
    const exactMatches = index.get(key);
    if (exactMatches) {
      for (const id of exactMatches) candidates.add(id);
    }
    // partial/substring match for common pantry names
    for (const [indexKey, ids] of index) {
      if (indexKey.includes(key) || key.includes(indexKey)) {
        for (const id of ids) candidates.add(id);
      }
    }
  }
  return candidates;
}

/**
 * Phase B: score each candidate recipe.
 */
function scoreRecipes(
  candidateIds: Set<number>,
  recipes: Recipe[],
  pantry: string[],
  calorieLimit?: number
): ScoredRecipe[] {
  const pantrySet = new Set(pantry.map(normalise));
  const recipeMap = new Map(recipes.map((r) => [r.recipe_id, r]));

  const scored: ScoredRecipe[] = [];

  for (const id of candidateIds) {
    const recipe = recipeMap.get(id);
    if (!recipe) continue;

    // Skip if over calorie limit
    if (calorieLimit && recipe.calories && recipe.calories > calorieLimit) continue;

    const parsedIngredients = parseIngredients(recipe.ingredients);
    const total = parsedIngredients.length;
    if (total === 0) continue;

    let matchCount = 0;
    for (const ing of parsedIngredients) {
      const key = normalise(ing);
      if (
        pantrySet.has(key) ||
        [...pantrySet].some((p) => p.includes(key) || key.includes(p))
      ) {
        matchCount++;
      }
    }

    const missingCount = total - matchCount;
    const matchPercentage = (matchCount / total) * 100;

    scored.push({
      ...recipe,
      parsedIngredients,
      matchCount,
      missingCount,
      matchPercentage,
    });
  }

  return scored;
}

/**
 * Phase C: multi-level sort and return top n.
 */
function sortAndRank(scored: ScoredRecipe[], n = 3): ScoredRecipe[] {
  return [...scored]
    .sort((a, b) => {
      // Primary: fewest missing ingredients
      if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
      // Secondary: highest match percentage
      return b.matchPercentage - a.matchPercentage;
    })
    .slice(0, n);
}

/**
 * Main entry point: given a pantry list and full recipe catalogue,
 * return the top `n` matched recipes.
 */
export function matchRecipes(
  pantry: string[],
  recipes: Recipe[],
  options: { calorieLimit?: number; topN?: number } = {}
): ScoredRecipe[] {
  if (pantry.length === 0 || recipes.length === 0) return [];

  const index = buildInvertedIndex(recipes);
  const candidates = filterCandidates(pantry, index);
  const scored = scoreRecipes(candidates, recipes, pantry, options.calorieLimit);
  return sortAndRank(scored, options.topN ?? 3);
}
