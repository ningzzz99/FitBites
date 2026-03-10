const BASE = 'https://www.themealdb.com/api/json/v1/1';

interface MealSummary {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface MealDetail {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strInstructions: string;
  strTags: string | null;
  [key: string]: string | null | undefined;
}

export async function fetchMealsByIngredient(ingredient: string): Promise<MealSummary[]> {
  try {
    const res = await fetch(`${BASE}/filter.php?i=${encodeURIComponent(ingredient)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { meals: MealSummary[] | null };
    return data.meals ?? [];
  } catch {
    return [];
  }
}

export async function fetchMealDetail(idMeal: string): Promise<MealDetail | null> {
  try {
    const res = await fetch(`${BASE}/lookup.php?i=${idMeal}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { meals: MealDetail[] | null };
    return data.meals?.[0] ?? null;
  } catch {
    return null;
  }
}

export function extractIngredients(meal: MealDetail): string[] {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    if (ing && ing.trim()) ingredients.push(ing.trim().toLowerCase());
  }
  return ingredients;
}
