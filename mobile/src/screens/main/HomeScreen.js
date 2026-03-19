import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError, addCustomChallenge, completeChallenge, deleteCustomChallenge, getChallenges, getFunFact } from '../../lib/api';
import { colors } from '../../constants/theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyChallengeId, setBusyChallengeId] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [weekDays, setWeekDays] = useState([]);
  const [factOpen, setFactOpen] = useState(false);
  const [fact, setFact] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [deletingCustomId, setDeletingCustomId] = useState(null);

  const loadData = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const data = await getChallenges();
      setChallenges(data.challenges ?? []);
      setStreak(data.streak ?? 0);
      setCoins(data.coins ?? 0);
      setWeekDays(data.week ?? []);
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

  async function refresh() {
    setRefreshing(true);
    await loadData(false);
  }

  async function handleComplete(challenge) {
    setBusyChallengeId(challenge.challenge_id);
    try {
      const updated = await completeChallenge(challenge.challenge_id, null);
      setChallenges((prev) =>
        prev.map((item) =>
          item.challenge_id === challenge.challenge_id ? { ...item, status: 'completed' } : item
        )
      );
      setCoins(updated.coins);
      setStreak(updated.streak);
    } catch {
      // silent
    } finally {
      setBusyChallengeId(null);
    }
  }

  async function handleAddCustom() {
    const task = customInput.trim();
    if (!task) return;
    setAddingCustom(true);
    try {
      await addCustomChallenge(task);
      setCustomInput('');
      await loadData(false);
    } catch {} finally {
      setAddingCustom(false);
    }
  }

  async function handleDeleteCustom(customHabitId) {
    setDeletingCustomId(customHabitId);
    try {
      await deleteCustomChallenge(customHabitId);
      await loadData(false);
    } catch {} finally {
      setDeletingCustomId(null);
    }
  }

  async function openFact() {
    setFactOpen(true);
    if (!fact) {
      try {
        const value = await getFunFact();
        setFact(value);
      } catch {
        setFact(null);
      }
    }
  }

  const orderedWeek = useMemo(() => weekDays.slice(-7), [weekDays]);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.brand}>FitBites</Text>
          <View style={styles.headerActions}>
            <View style={styles.coinBadge}>
              <Ionicons name="cash-outline" size={16} color={colors.warning} />
              <Text style={styles.coinText}>{coins}</Text>
            </View>
            <Pressable onPress={openFact} style={styles.iconButton}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Onboarding', { editMode: true })}
              style={styles.iconButton}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Your streak</Text>
            <Text style={styles.streakValue}>{streak} days</Text>
          </View>
          <View style={styles.weekRow}>
            {orderedWeek.map((entry, idx) => {
              const day = new Date(`${entry.date}T00:00:00`);
              const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;
              return (
                <View key={`${entry.date}-${idx}`} style={styles.weekItem}>
                  <View style={[styles.weekCircle, entry.completed && styles.weekCircleDone]}>
                    <Text style={[styles.weekCircleText, entry.completed && styles.weekCircleTextDone]}>
                      {entry.completed ? 'Y' : ''}
                    </Text>
                  </View>
                  <Text style={styles.weekLabel}>{DAY_LABELS[dayIndex]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today challenges</Text>
        {challenges.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No habits selected yet.</Text>
            <Pressable onPress={() => navigation.navigate('Onboarding')}>
              <Text style={styles.linkText}>Pick your habits</Text>
            </Pressable>
          </View>
        ) : (
          challenges.map((challenge) => {
            const done = challenge.status === 'completed';
            const busy = busyChallengeId === challenge.challenge_id;
            const isCustom = !!challenge.custom_habit_id;
            const deleting = deletingCustomId === challenge.custom_habit_id;
            return (
              <View
                key={challenge.challenge_id}
                style={[styles.challengeCard, done && styles.challengeCardDone]}
              >
                <View style={styles.challengeLeft}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={done ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.challengeText, done && styles.challengeTextDone]}>
                    {challenge.task ?? 'Habit'}
                  </Text>
                </View>
                <View style={styles.challengeRight}>
                  {done ? (
                    <Text style={styles.completedReward}>+10 coins</Text>
                  ) : (
                    <Pressable
                      disabled={busy}
                      style={[styles.smallButton, busy && styles.smallButtonDisabled]}
                      onPress={() => handleComplete(challenge)}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.smallButtonText}>Complete</Text>
                      )}
                    </Pressable>
                  )}
                  {isCustom && !done ? (
                    <Pressable
                      disabled={deleting}
                      style={styles.deleteChipBtn}
                      onPress={() => handleDeleteCustom(challenge.custom_habit_id)}
                    >
                      {deleting ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.addCustomRow}>
          <TextInput
            style={styles.addCustomInput}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder="Add custom challenge"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleAddCustom}
          />
          <Pressable
            style={[styles.addCustomBtn, (!customInput.trim() || addingCustom) && styles.addCustomBtnDisabled]}
            disabled={!customInput.trim() || addingCustom}
            onPress={handleAddCustom}
          >
            {addingCustom ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="add" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={factOpen} transparent animationType="fade" onRequestClose={() => setFactOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily fun fact</Text>
              <Pressable onPress={() => setFactOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {fact ? (
              <>
                <Text style={styles.factTopic}>{fact.topic}</Text>
                <Text style={styles.factContent}>{fact.content}</Text>
              </>
            ) : (
              <Text style={styles.factContent}>No fact available right now.</Text>
            )}
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
  loaderWrap: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 30, fontWeight: '800', color: colors.primary },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinBadge: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    borderWidth: 1, borderColor: '#f0d7a3', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fff8ea',
  },
  coinText: { fontWeight: '700', color: '#a86b10' },
  iconButton: {
    width: 32, height: 32, borderRadius: 999, borderWidth: 1,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  card: {
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, borderRadius: 16, padding: 14,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { color: colors.text, fontWeight: '600' },
  streakValue: { color: colors.warning, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekItem: { alignItems: 'center', gap: 4 },
  weekCircle: {
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: '#e9efe9', justifyContent: 'center', alignItems: 'center',
  },
  weekCircleDone: { backgroundColor: colors.primary },
  weekCircleText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  weekCircleTextDone: { color: '#fff' },
  weekLabel: { fontSize: 10, color: colors.textMuted },
  sectionTitle: { marginTop: 4, fontWeight: '700', color: colors.text },
  emptyBox: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, backgroundColor: '#f9fcfa',
  },
  emptyText: { color: colors.textMuted },
  linkText: { color: colors.primary, fontWeight: '700' },
  challengeCard: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 14, padding: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  challengeCardDone: { backgroundColor: colors.primarySoft, borderColor: '#b8d9c1' },
  challengeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  challengeRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeText: { color: colors.text, fontWeight: '500', flexShrink: 1 },
  challengeTextDone: { color: colors.primary, fontWeight: '700' },
  completedReward: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  deleteChipBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#f1d5d5',
    backgroundColor: '#fdecec', alignItems: 'center', justifyContent: 'center',
  },
  addCustomRow: { flexDirection: 'row', gap: 8 },
  addCustomInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.text,
    backgroundColor: colors.surface,
  },
  addCustomBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addCustomBtnDisabled: { opacity: 0.5 },
  smallButton: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  smallButtonDisabled: { opacity: 0.6 },
  smallButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', padding: 20,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  factTopic: { color: colors.primary, fontWeight: '700', textTransform: 'capitalize' },
  factContent: { color: colors.text, lineHeight: 20 },
});
