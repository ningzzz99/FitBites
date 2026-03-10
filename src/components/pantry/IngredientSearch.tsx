'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchFoodProducts } from '@/lib/api/openFoodFacts';
import { buildTrie, suggest } from '@/lib/algorithms/levenshtein';

// Common ingredient list for offline Trie fallback
const COMMON_INGREDIENTS = [
  'apple', 'avocado', 'banana', 'beef', 'bell pepper', 'bread', 'broccoli',
  'butter', 'carrot', 'cheese', 'chicken breast', 'chocolate', 'cinnamon',
  'cucumber', 'egg', 'eggs', 'feta cheese', 'garlic', 'ginger', 'honey',
  'lemon', 'lemon juice', 'lettuce', 'lime', 'mayo', 'milk', 'mushroom',
  'oats', 'olive oil', 'onion', 'orange', 'pasta', 'peanut butter',
  'peas', 'pepper', 'potato', 'red onion', 'rice', 'salt', 'soy sauce',
  'spinach', 'strawberry', 'tomato', 'tortilla wrap', 'tuna', 'yogurt',
];

const trie = buildTrie(COMMON_INGREDIENTS);

interface Props {
  onAdd: (name: string) => void;
}

export default function IngredientSearch({ onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSuggestions([]); return; }

    // Immediate Trie suggestions (offline)
    const local = suggest(query, trie, COMMON_INGREDIENTS, 5);
    setSuggestions(local);

    // Debounced API call for more suggestions
    debounceRef.current = setTimeout(async () => {
      setLoadingApi(true);
      const apiResults = await searchFoodProducts(query);
      setSuggestions((prev) => {
        const combined = [...new Set([...prev, ...apiResults])].slice(0, 8);
        return combined;
      });
      setLoadingApi(false);
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleSelect(name: string) {
    onAdd(name);
    setQuery('');
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ingredients…"
          className="flex-1 text-sm outline-none"
        />
        {loadingApi && <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />}
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 hover:text-green-700 transition"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
