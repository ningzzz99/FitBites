import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
  getRecipes,
  removeIngredient,
  updateIngredientQuantity,
} from '../../lib/api';
import { colors } from '../../constants/theme';

export default function PantryScreen({ navigation }) {
  const [tab, setTab] = useState('pantry');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
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
      const names = ingredients.map((row) => row.ingredient_name);
      const result = await getRecipes(names);
      setRecipes(result);
    } catch {
      setRecipes([]);
    } finally {
      setRecipesLoading(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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
          <Pressable style={styles.findButton} onPress={findRecipes}>
            <Text style={styles.findButtonText}>Find Recipes</Text>
          </Pressable>

          {recipesLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {!recipesLoading && recipes.length === 0 ? (
            <Text style={styles.muted}>No recipe suggestions yet.</Text>
          ) : null}

          {recipes.map((recipe) => (
            <Pressable key={recipe.recipe_id} style={styles.recipeCard} onPress={() => setSelectedRecipe(recipe)}>
              <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>
              <Text style={styles.recipeMeta}>
                Pantry match {Math.round(recipe.matchPercentage)}%
              </Text>
              {recipe.missingCount > 0 ? (
                <Text style={styles.recipeMissing}>
                  Missing {recipe.missingCount} ingredient(s)
                </Text>
              ) : null}
              <Text style={styles.recipeInstructions} numberOfLines={2}>{recipe.instructions}</Text>
              <Text style={styles.tapHint}>Tap to view full recipe</Text>
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
            <Text style={styles.modalTitle} numberOfLines={2}>{selectedRecipe?.recipe_name}</Text>
            <Pressable onPress={() => setSelectedRecipe(null)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          {selectedRecipe ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Match</Text>
                <Text style={styles.modalMeta}>
                  {Math.round(selectedRecipe.matchPercentage)}% pantry match
                  {selectedRecipe.missingCount > 0
                    ? ` · missing ${selectedRecipe.missingCount} ingredient(s)`
                    : ''}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Ingredients</Text>
                {(() => {
                  let items = [];
                  try { items = JSON.parse(selectedRecipe.ingredients); } catch {}
                  return items.map((ing, i) => (
                    <Text key={i} style={styles.modalIngredient}>• {ing}</Text>
                  ));
                })()}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Instructions</Text>
                <Text style={styles.modalInstructions}>{selectedRecipe.instructions}</Text>
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
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12,
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
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, gap: 6,
  },
  recipeTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  recipeMeta: { color: colors.primary, fontWeight: '600' },
  recipeMissing: { color: colors.warning },
  recipeInstructions: { color: colors.textMuted, lineHeight: 18, flexShrink: 1 },
  tapHint: { color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
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
  modalMeta: { color: colors.primary, fontWeight: '600' },
  modalIngredient: { color: colors.text, lineHeight: 22 },
  modalInstructions: { color: colors.text, lineHeight: 22 },
});
