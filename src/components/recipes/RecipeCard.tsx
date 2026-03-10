import { ChefHat, ShoppingCart, Flame } from 'lucide-react';
import Image from 'next/image';
import type { ScoredRecipe } from '@/types';

interface Props {
  recipe: ScoredRecipe;
}

export default function RecipeCard({ recipe }: Props) {
  const matchPct = Math.round(recipe.matchPercentage);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-green-200 transition">
      {recipe.thumb_url && (
        <div className="relative w-full h-36">
          <Image src={recipe.thumb_url} alt={recipe.recipe_name} fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-green-500 flex-shrink-0" />
          <h3 className="font-semibold text-gray-800 text-sm">{recipe.recipe_name}</h3>
        </div>
        {recipe.calories && (
          <div className="flex items-center gap-1 text-orange-500 flex-shrink-0">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{recipe.calories} kcal</span>
          </div>
        )}
      </div>

      {/* Match bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Pantry match</span>
          <span className="font-medium text-green-600">{matchPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all"
            style={{ width: `${matchPct}%` }}
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {recipe.parsedIngredients.map((ing) => {
          const have = recipe.matchCount > 0; // simplified: colour by match pct
          return (
            <span
              key={ing}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
            >
              {ing}
            </span>
          );
        })}
      </div>

      {recipe.missingCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Missing {recipe.missingCount} ingredient{recipe.missingCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Instructions (collapsed) */}
      <details className="mt-3">
        <summary className="text-xs text-green-600 cursor-pointer hover:underline">View instructions</summary>
        <p className="mt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-line">{recipe.instructions}</p>
      </details>
      </div>
    </div>
  );
}
