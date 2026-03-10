import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { fetchMealsByIngredient, fetchMealDetail, extractIngredients } from '@/lib/api/themealdb';
import { matchRecipes } from '@/lib/algorithms/recipeMatcher';
import type { Recipe } from '@/types';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ingredientsParam = searchParams.get('ingredients') ?? '';
  const calorieLimit = searchParams.get('calorieLimit')
    ? Number(searchParams.get('calorieLimit'))
    : undefined;

  const pantryNames = ingredientsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (pantryNames.length === 0) return NextResponse.json([]);

  // Fetch meals per ingredient and deduplicate by idMeal
  const mealMap = new Map<string, { idMeal: string; strMeal: string; strMealThumb: string }>();
  await Promise.all(
    pantryNames.map(async (name) => {
      const meals = await fetchMealsByIngredient(name);
      for (const m of meals) {
        if (!mealMap.has(m.idMeal)) mealMap.set(m.idMeal, m);
      }
    })
  );

  // Limit to 20 unique meals to keep response fast
  const uniqueMeals = [...mealMap.values()].slice(0, 20);
  const details = await Promise.all(uniqueMeals.map((m) => fetchMealDetail(m.idMeal)));

  const recipes: Recipe[] = details
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => ({
      recipe_id: parseInt(d.idMeal, 10),
      recipe_name: d.strMeal,
      ingredients: JSON.stringify(extractIngredients(d)),
      instructions: d.strInstructions ?? '',
      tags: d.strTags ?? null,
      calories: null,
      thumb_url: mealMap.get(d.idMeal)?.strMealThumb,
    }));

  const scored = matchRecipes(pantryNames, recipes, { calorieLimit, topN: 10 });
  return NextResponse.json(scored);
}
