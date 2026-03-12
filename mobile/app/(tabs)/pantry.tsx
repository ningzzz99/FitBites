import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import {
  ApiError,
  addIngredient,
  getIngredients,
  getRecipes,
  removeIngredient,
  updateIngredientQuantity,
} from '../../src/lib/api';
import type { Ingredient, ScoredRecipe } from '../../src/types';
import { colors } from '../../src/constants/theme';

type PantryTab = 'pantry' | 'recipes';

export default function PantryScreen() {
  const [tab, setTab] = useState<PantryTab>('pantry');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipes, setRecipes] = useState<ScoredRecipe[]>([]);
  const [calorieLimit, setCalorieLimit] = useState('');

  const loadData = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const rows = await getIngredients();
      setIngredients(rows);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/(auth)/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadData(false);
  }

  async function onAddIngredient() {
    const name = newIngredient.trim();
    if (!name) return;

    try {
      const item = await addIngredient(name);
      setIngredients((prev) => [item, ...prev]);
      setNewIngredient('');
    } catch {
      // No-op
    }
  }

  async function changeQuantity(ingredientId: number, delta: number) {
    const item = ingredients.find((x) => x.ingredient_id === ingredientId);
    if (!item) return;

    const nextQty = Math.max(0, item.quantity + delta);

    if (nextQty === 0) {
      await onDelete(ingredientId);
      return;
    }

    setIngredients((prev) =>
      prev.map((row) => (row.ingredient_id === ingredientId ? { ...row, quantity: nextQty } : row))
    );

    try {
      await updateIngredientQuantity(ingredientId, nextQty);
    } catch {
      await loadData(false);
    }
  }

  async function onDelete(ingredientId: number) {
    setIngredients((prev) => prev.filter((row) => row.ingredient_id !== ingredientId));
    try {
      await removeIngredient(ingredientId);
    } catch {
      await loadData(false);
    }
  }

  async function findRecipes() {
    if (ingredients.length === 0) {
      setRecipes([]);
      return;
    }

    setRecipesLoading(true);

    try {
      const names = ingredients.map((row) => row.ingredient_name);
      const limit = calorieLimit ? Number(calorieLimit) : undefined;
      const result = await getRecipes(names, Number.isFinite(limit) ? limit : undefined);
      setRecipes(result);
    } catch {
      setRecipes([]);
    } finally {
      setRecipesLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>{tab === 'pantry' ? 'My Pantry' : 'Recipes'}</Text>

      <View style={styles.segmentWrap}>
        <Pressable style={[styles.segmentBtn, tab === 'pantry' && styles.segmentBtnActive]} onPress={() => setTab('pantry')}>
          <Text style={[styles.segmentText, tab === 'pantry' && styles.segmentTextActive]}>My Pantry</Text>
        </Pressable>
        <Pressable style={[styles.segmentBtn, tab === 'recipes' && styles.segmentBtnActive]} onPress={() => setTab('recipes')}>
          <Text style={[styles.segmentText, tab === 'recipes' && styles.segmentTextActive]}>Recipes</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}

      {!loading && tab === 'pantry' ? (
        <View style={styles.card}>
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={newIngredient}
              onChangeText={setNewIngredient}
              placeholder="Add ingredient"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable style={styles.addButton} onPress={onAddIngredient}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>

          {ingredients.length === 0 ? (
            <Text style={styles.muted}>Your pantry is empty.</Text>
          ) : (
            ingredients.map((item) => (
              <View key={item.ingredient_id} style={styles.ingredientRow}>
                <View style={styles.ingredientDetails}>
                  <Text style={styles.ingredientName}>{item.ingredient_name}</Text>
                  <Text style={styles.ingredientMeta}>{item.quantity} {item.unit}</Text>
                </View>

                <View style={styles.qtyWrap}>
                  <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(item.ingredient_id, -1)}>
                    <Text style={styles.qtyBtnText}>-</Text>
                  </Pressable>
                  <Pressable style={styles.qtyBtn} onPress={() => changeQuantity(item.ingredient_id, 1)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                  <Pressable style={styles.deleteBtn} onPress={() => onDelete(item.ingredient_id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {!loading && tab === 'recipes' ? (
        <View style={styles.card}>
          <View style={styles.recipeControls}>
            <TextInput
              style={styles.limitInput}
              value={calorieLimit}
              onChangeText={setCalorieLimit}
              keyboardType="numeric"
              placeholder="Calorie limit"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable style={styles.findButton} onPress={findRecipes}>
              <Text style={styles.findButtonText}>Find Recipes</Text>
            </Pressable>
          </View>

          {recipesLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {!recipesLoading && recipes.length === 0 ? <Text style={styles.muted}>No recipe suggestions yet.</Text> : null}

          {recipes.map((recipe) => (
            <View key={recipe.recipe_id} style={styles.recipeCard}>
              {recipe.thumb_url ? (
                <Image
                  source={{ uri: recipe.thumb_url }}
                  style={styles.recipeImage}
                  alt={recipe.recipe_name}
                />
              ) : null}
              <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>
              <Text style={styles.recipeMeta}>Pantry match {Math.round(recipe.matchPercentage)}%</Text>
              {recipe.missingCount > 0 ? (
                <Text style={styles.recipeMissing}>Missing {recipe.missingCount} ingredient(s)</Text>
              ) : null}
              <Text style={styles.recipeInstructions}>{recipe.instructions}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#e9efe9',
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
  },
  segmentText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.primary,
  },
  loaderWrap: {
    paddingVertical: 30,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    padding: 12,
    gap: 10,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
  },
  ingredientRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ingredientDetails: {
    flex: 1,
    gap: 2,
  },
  ingredientName: {
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ingredientMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  deleteBtn: {
    borderRadius: 8,
    backgroundColor: '#fdecec',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  recipeControls: {
    flexDirection: 'row',
    gap: 8,
  },
  limitInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  findButton: {
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  findButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  recipeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  recipeImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  recipeTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  recipeMeta: {
    color: colors.primary,
    fontWeight: '600',
  },
  recipeMissing: {
    color: colors.warning,
  },
  recipeInstructions: {
    color: colors.textMuted,
    lineHeight: 18,
  },
});
