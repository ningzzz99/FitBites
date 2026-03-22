import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getHabits, getUserHabits, saveUserHabits } from '../../api';
import { useAuth } from '../../AuthContext';
import { colors } from '../../theme';

export default function OnboardingScreen({ navigation, route }) {
  const { finishOnboarding } = useAuth();
  const editMode = route?.params?.editMode ?? false;
  const [habits, setHabits] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [customTask, setCustomTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const allHabits = await getHabits();
        setHabits(allHabits);
        if (editMode) {
          const current = await getUserHabits();
          setSelectedIds(current.habitIds ?? []);
          setCustomTask(current.customTask ?? '');
        }
      } catch (err) {
        console.error('Onboarding load error:', err);
        setError('Could not load habits.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [editMode]);

  function toggleHabit(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleFinish() {
    if (selectedIds.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await saveUserHabits(selectedIds, customTask.trim() || undefined);
      if (editMode) {
        navigation.goBack();
      } else {
        finishOnboarding();
        // Force navigation to Main if stack doesn't auto-update
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (err) {
      console.error('Onboarding save error:', err);
      setError(err?.message || 'Could not save habits.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{editMode ? 'Edit your habits' : 'Choose your habits'}</Text>
        <Text style={styles.subtitle}>Pick what you want to practice every day.</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={habits}
            keyExtractor={(item) => String(item.habit_id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.habit_id);
              return (
                <Pressable
                  onPress={() => toggleHabit(item.habit_id)}
                  style={[styles.habitChip, selected && styles.habitChipSelected]}
                >
                  <Text style={[styles.habitText, selected && styles.habitTextSelected]}>
                    {item.task}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Optional custom habit"
          placeholderTextColor={colors.textMuted}
          value={customTask}
          onChangeText={setCustomTask}
          maxLength={100}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={selectedIds.length === 0 || saving}
          style={[styles.button, (selectedIds.length === 0 || saving) && styles.buttonDisabled]}
          onPress={handleFinish}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {editMode
                ? 'Save changes'
                : `Start with ${selectedIds.length} habit${selectedIds.length === 1 ? '' : 's'}`}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 30, fontWeight: '800', color: colors.primary },
  subtitle: { color: colors.textMuted },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingVertical: 8, gap: 8 },
  habitChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  habitChipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  habitText: { color: colors.text, fontWeight: '500' },
  habitTextSelected: { color: colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.danger },
});
