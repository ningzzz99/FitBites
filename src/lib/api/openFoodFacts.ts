/**
 * Wrapper around the OpenFoodFacts API for ingredient/product lookup.
 * Docs: https://world.openfoodfacts.org/files/api-documentation.pdf
 */

export interface FoodProduct {
  name: string;
  category: string;
  calories: number | null;
}

/**
 * Search for food products by name.
 * Returns a simplified list of matching product names suitable for pantry autocomplete.
 */
export async function searchFoodProducts(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = await res.json();
    const products: string[] = [];
    for (const p of data.products ?? []) {
      const name = p.product_name?.trim();
      if (name && !products.includes(name)) products.push(name);
    }
    return products.slice(0, 15);
  } catch {
    return [];
  }
}

/**
 * Fetch nutrition info for a specific product by barcode or name.
 */
export async function getNutritionInfo(productName: string): Promise<FoodProduct | null> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(productName)}&search_simple=1&action=process&json=1&page_size=1&fields=product_name,categories_tags,nutriments`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const p = data.products?.[0];
    if (!p) return null;

    return {
      name: p.product_name ?? productName,
      category: p.categories_tags?.[0]?.replace('en:', '') ?? 'general',
      calories: p.nutriments?.['energy-kcal_100g'] ?? null,
    };
  } catch {
    return null;
  }
}
