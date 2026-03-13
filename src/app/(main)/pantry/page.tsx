'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, RefreshCw } from 'lucide-react';
import IngredientSearch from '@/components/pantry/IngredientSearch';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { Ingredient, ScoredRecipe } from '@/types';

const PANTRY_OFFLINE_KEY = 'fitbites_pantry_offline';

export default function PantryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'pantry' | 'recipes'>('pantry');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suggestions, setSuggestions] = useState<ScoredRecipe[]>([]);
  const [calorieLimit, setCalorieLimit] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    setOnline(navigator.onLine);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const loadData = useCallback(async () => {
    if (online) {
      const res = await fetch('/api/ingredients');
      if (res.status === 401) { router.push('/login'); return; }
      const pantry = await res.json() as Ingredient[];
      setIngredients(pantry);
      localStorage.setItem(PANTRY_OFFLINE_KEY, JSON.stringify(pantry));
    } else {
      const cached = localStorage.getItem(PANTRY_OFFLINE_KEY);
      if (cached) setIngredients(JSON.parse(cached));
    }
    setLoading(false);
  }, [router, online]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (tab === 'recipes') loadRecipes(ingredients, calorieLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadRecipes = useCallback(async (currentIngredients: Ingredient[], limit: number | '') => {
    if (currentIngredients.length === 0) { setSuggestions([]); return; }
    setRecipesLoading(true);
    const names = currentIngredients.map((i) => i.ingredient_name).join(',');
    const params = new URLSearchParams({ ingredients: names });
    if (typeof limit === 'number') params.set('calorieLimit', String(limit));
    const res = await fetch(`/api/recipes?${params}`);
    if (res.ok) setSuggestions(await res.json() as ScoredRecipe[]);
    setRecipesLoading(false);
  }, []);

  async function addIngredient(name: string) {
    if (online) {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_name: name }),
      });
      if (res.ok) {
        const item = await res.json() as Ingredient;
        const updated = [item, ...ingredients];
        setIngredients(updated);
        localStorage.setItem(PANTRY_OFFLINE_KEY, JSON.stringify(updated));
      }
    } else {
      const temp: Ingredient = { ingredient_id: Date.now(), user_id: 0, ingredient_name: name, category: null, quantity: 1, unit: 'units', created_at: new Date().toISOString() };
      const updated = [temp, ...ingredients];
      setIngredients(updated);
      localStorage.setItem(PANTRY_OFFLINE_KEY, JSON.stringify(updated));
    }
  }

  async function updateQty(id: number, delta: number) {
    const item = ingredients.find((i) => i.ingredient_id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === 0) { await removeIngredient(id); return; }
    if (online) await fetch(`/api/ingredients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: newQty }) });
    const updated = ingredients.map((i) => i.ingredient_id === id ? { ...i, quantity: newQty } : i);
    setIngredients(updated);
    localStorage.setItem(PANTRY_OFFLINE_KEY, JSON.stringify(updated));
  }

  async function removeIngredient(id: number) {
    if (online) await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
    const updated = ingredients.filter((i) => i.ingredient_id !== id);
    setIngredients(updated);
    localStorage.setItem(PANTRY_OFFLINE_KEY, JSON.stringify(updated));
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 text-sm">Loading pantry…</p></div>;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-700">{tab === 'pantry' ? 'My Pantry' : 'Recipes'}</h1>
        {!online && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Offline</span>}
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
        {(['pantry', 'recipes'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'pantry' ? 'My Pantry' : 'Recipes'}
          </button>
        ))}
      </div>

      {tab === 'pantry' && (
        <>
          <div className="mb-4"><IngredientSearch onAdd={addIngredient} /></div>
          {ingredients.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">Your pantry is empty. Search for ingredients above to add them.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {ingredients.map((ing) => (
                <div key={ing.ingredient_id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{ing.ingredient_name}</p>
                    {ing.category && <p className="text-xs text-gray-400">{ing.category}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(ing.ingredient_id, -1)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <Minus className="w-3 h-3 text-gray-600" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{ing.quantity}</span>
                    <button onClick={() => updateQty(ing.ingredient_id, 1)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <Plus className="w-3 h-3 text-gray-600" />
                    </button>
                    <button onClick={() => removeIngredient(ing.ingredient_id)} className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center ml-1">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'recipes' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <label className="text-sm text-gray-600 shrink-0">Daily calorie limit</label>
            <input type="number" value={calorieLimit} onChange={(e) => setCalorieLimit(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 500" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-green-400" />
            {calorieLimit !== '' && <button onClick={() => setCalorieLimit('')} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
            <button onClick={() => loadRecipes(ingredients, calorieLimit)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
              <RefreshCw className="w-3.5 h-3.5" />
              Find Recipes
            </button>
          </div>

          {recipesLoading ? (
            <p className="text-center text-gray-400 text-sm py-12">Finding recipes from TheMealDB…</p>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-200" />
              <p>Add ingredients to your pantry then click <strong>Find Recipes</strong>.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {suggestions.map((r, idx) => <RecipeCard key={`${r.recipe_id}-${idx}`} recipe={r} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
