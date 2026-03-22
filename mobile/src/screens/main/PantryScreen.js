import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ApiError,
  addIngredient,
  getIngredients,
  getMealsByIngredient,
  getMealById,
  removeIngredient,
  updateIngredientQuantity,
} from '../../api';
import { colors } from '../../theme';

export default function PantryScreen({ navigation }) {
  const [tab, setTab] = useState('pantry');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [allPossibleIngredients, setAllPossibleIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [mealDetail, setMealDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load master list of ingredients for suggestions
  useEffect(() => {
    async function fetchMasterList() {
      try {
        const res = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?i=list');
        const data = await res.json();
        if (data.meals) {
          setAllPossibleIngredients(data.meals.map(m => m.strIngredient));
        }
      } catch (err) {
        console.error('Failed to fetch master ingredient list', err);
      }
    }
    fetchMasterList();
  }, []);

  const loadData = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const rows = await getIngredients();
      setIngredients(rows);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigation.navigate('Login');
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

  useEffect(() => {
    const query = newIngredient.trim().toLowerCase();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const filtered = allPossibleIngredients
      .filter(item => item.toLowerCase().includes(query))
      .slice(0, 5);
    setSuggestions(filtered);
  }, [newIngredient, allPossibleIngredients]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData(false);
  }

  async function onAddIngredient(nameOverride) {
    const name = (nameOverride || newIngredient).trim();
    if (!name) return;
    try {
      const item = await addIngredient(name);
      setIngredients((prev) => [item, ...prev]);
      setNewIngredient('');
      setSuggestions([]);
    } catch {}
  }

  async function changeQuantity(ingredientId, delta) {
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

  async function onDelete(ingredientId) {
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
      const results = await Promise.allSettled(
        ingredients.map((row) =>
          getMealsByIngredient(row.ingredient_name).then((meals) =>
            meals.slice(0, 2).map((m) => ({ ...m, sourceIngredient: row.ingredient_name }))
          )
        )
      );
      const seen = new Set();
      const merged = [];
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const meal of r.value) {
          if (!seen.has(meal.idMeal)) {
            seen.add(meal.idMeal);
            merged.push(meal);
          }
        }
      }
      setRecipes(merged);
    } finally {
      setRecipesLoading(false);
    }
  }

  async function openRecipe(meal) {
    setSelectedRecipe(meal);
    setMealDetail(null);
    setDetailLoading(true);
    try {
      const detail = await getMealById(meal.idMeal);
      setMealDetail(detail);
    } finally {
      setDetailLoading(false);
    }
  }

  function parseMealIngredients(meal) {
    const items = [];
    for (let i = 1; i <= 20; i++) {
      const name = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (name && name.trim()) {
        items.push(`${measure ? measure.trim() + ' ' : ''}${name.trim()}`);
      }
    }
    return items;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="always"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>{tab === 'pantry' ? 'My Pantry' : 'Recipes'}</Text>

      <View style={styles.segmentWrap}>
        <Pressable
          style={[styles.segmentBtn, tab === 'pantry' && styles.segmentBtnActive]}
          onPress={() => setTab('pantry')}
        >
          <Text style={[styles.segmentText, tab === 'pantry' && styles.segmentTextActive]}>
            My Pantry
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, tab === 'recipes' && styles.segmentBtnActive]}
          onPress={() => setTab('recipes')}
        >
          <Text style={[styles.segmentText, tab === 'recipes' && styles.segmentTextActive]}>
            Recipes
          </Text>
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
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={newIngredient}
                onChangeText={setNewIngredient}
                placeholder="Add ingredient"
                placeholderTextColor={colors.textMuted}
              />
              {suggestions.length > 0 && (
                <View style={styles.suggestionList}>
                  {suggestions.map((item, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={() => onAddIngredient(item)}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <Pressable style={styles.addButton} onPress={() => onAddIngredient()}>
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
          <Pressable style={styles.findButton} onPress={findRecipes}>
            <Text style={styles.findButtonText}>Find Recipes</Text>
          </Pressable>

          {recipesLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {!recipesLoading && recipes.length === 0 ? (
            <Text style={styles.muted}>No recipe suggestions yet.</Text>
          ) : null}

          {recipes.map((recipe) => (
            <Pressable key={recipe.idMeal} style={styles.recipeCard} onPress={() => openRecipe(recipe)}>
              <View style={styles.recipeRow}>
                {recipe.strMealThumb ? (
                  <Image source={{ uri: recipe.strMealThumb }} style={styles.recipeThumb} />
                ) : null}
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle}>{recipe.strMeal}</Text>
                  <Text style={styles.recipeMeta}>via {recipe.sourceIngredient}</Text>
                  <Text style={styles.tapHint}>Tap to view full recipe</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>

    <Modal
      visible={!!selectedRecipe}
      transparent
      animationType="slide"
      onRequestClose={() => setSelectedRecipe(null)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={2}>{selectedRecipe?.strMeal}</Text>
            <Pressable onPress={() => setSelectedRecipe(null)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          {detailLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : mealDetail ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {mealDetail.strMealThumb ? (
                <Image source={{ uri: mealDetail.strMealThumb }} style={styles.modalImage} />
              ) : null}

              {mealDetail.strCategory || mealDetail.strArea ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalMeta}>
                    {[mealDetail.strCategory, mealDetail.strArea].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ) : null}

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Ingredients</Text>
                {parseMealIngredients(mealDetail).map((item, i) => (
                  <Text key={i} style={styles.modalIngredient}>• {item}</Text>
                ))}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Instructions</Text>
                <Text style={styles.modalInstructions}>{mealDetail.strInstructions}</Text>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: colors.primary },
  segmentWrap: {
    flexDirection: 'row', backgroundColor: '#e9efe9', borderRadius: 12, padding: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#fff' },
  segmentText: { color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  loaderWrap: { paddingVertical: 30 },
  card: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    backgroundColor: '#fff', padding: 12, gap: 10,
  },
  addRow: { flexDirection: 'row', gap: 8, zIndex: 100 },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.text,
  },
  suggestionList: {
    position: 'absolute', top: 46, left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    zIndex: 999, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  suggestionItem: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  suggestionText: { color: colors.text, fontWeight: '500' },
  addButton: {
    backgroundColor: colors.primary, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 44,
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  muted: { color: colors.textMuted },
  ingredientRow: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 12,
  },
  ingredientDetails: { flex: 1, gap: 2 },
  ingredientName: { color: colors.text, fontWeight: '600', textTransform: 'capitalize' },
  ingredientMeta: { color: colors.textMuted, fontSize: 12 },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, color: colors.text, fontWeight: '700' },
  deleteBtn: {
    borderRadius: 8, backgroundColor: '#fdecec', paddingHorizontal: 8, paddingVertical: 6,
  },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  findButton: {
    borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', paddingVertical: 12,
  },
  findButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  recipeCard: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10,
  },
  recipeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  recipeThumb: { width: 64, height: 64, borderRadius: 10 },
  recipeInfo: { flex: 1, gap: 4 },
  recipeTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  recipeMeta: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  tapHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%', flex: 1,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16, gap: 8,
  },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 999, backgroundColor: '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: 14, color: colors.textMuted, fontWeight: '700' },
  modalSection: { marginBottom: 16 },
  modalLabel: { fontWeight: '700', color: colors.text, marginBottom: 6 },
  modalImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  modalMeta: { color: colors.primary, fontWeight: '600' },
  modalIngredient: { color: colors.text, lineHeight: 22 },
  modalInstructions: { color: colors.text, lineHeight: 22 },
});
