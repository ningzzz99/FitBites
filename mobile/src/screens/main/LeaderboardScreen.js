import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
  addFriend,
  getFriends,
  getLeaderboard,
  respondFriend,
  searchUsers,
} from '../../api';
import { colors } from '../../theme';

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('global');
  const [globalRows, setGlobalRows] = useState([]);
  const [friendRowsLeaderboard, setFriendRowsLeaderboard] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(0);
  const [friendRows, setFriendRows] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadData = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const [board, friends] = await Promise.all([getLeaderboard(), getFriends()]);
      setGlobalRows(board.global);
      setFriendRowsLeaderboard(board.friends);
      setCurrentUserId(board.currentUserId);
      setFriendRows(friends);
    } catch {
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

  const pendingIncoming = friendRows.filter((row) => row.user_id_2 === currentUserId && row.status === 'pending');

  const visibleRows = tab === 'global' ? globalRows : friendRowsLeaderboard;

  async function runSearch(value) {
    setQuery(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const rows = await searchUsers(value);
      setSearchResults(rows);
    } finally {
      setSearchLoading(false);
    }
  }

  function hasFriendRelation(userId) {
    return friendRows.some(
      (row) =>
        (row.user_id_1 === currentUserId && row.user_id_2 === userId) ||
        (row.user_id_2 === currentUserId && row.user_id_1 === userId)
    );
  }

  async function requestFriend(targetUserId) {
    try {
      await addFriend(targetUserId);
      await loadData(false);
    } catch {}
  }

  async function handleRespond(friendId, status) {
    await respondFriend(friendId, status);
    await loadData(false);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Leaderboard</Text>

      {pendingIncoming.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          {pendingIncoming.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Text style={styles.requestName}>{request.username_1}</Text>
              <View style={styles.requestActions}>
                <Pressable style={styles.acceptBtn} onPress={() => handleRespond(request.id, 'accepted')}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.rejectBtn} onPress={() => handleRespond(request.id, 'rejected')}>
                  <Text style={styles.rejectText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Find friends</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={runSearch}
          placeholder="Search by username"
          placeholderTextColor={colors.textMuted}
        />
        {searchLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {searchResults.map((result) => (
          <View key={result.id} style={styles.searchRow}>
            <Text style={styles.requestName}>{result.username}</Text>
            {hasFriendRelation(result.id) ? (
              <Text style={styles.muted}>Requested</Text>
            ) : (
              <Pressable style={styles.addBtn} onPress={() => requestFriend(result.id)}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <View style={styles.segmentWrap}>
        <Pressable
          style={[styles.segmentBtn, tab === 'global' && styles.segmentBtnActive]}
          onPress={() => setTab('global')}
        >
          <Text style={[styles.segmentText, tab === 'global' && styles.segmentTextActive]}>
            Worldwide
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, tab === 'friends' && styles.segmentBtnActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.segmentText, tab === 'friends' && styles.segmentTextActive]}>
            Friends
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />
      ) : visibleRows.length === 0 ? (
        <Text style={styles.muted}>No leaderboard data yet.</Text>
      ) : (
        <View style={styles.card}>
          {visibleRows.map((row, idx) => (
            <View key={row.user_id} style={styles.rankRow}>
              <Text style={styles.rankIndex}>#{idx + 1}</Text>
              <View style={styles.rankMain}>
                <Text style={[styles.rankName, row.user_id === currentUserId && styles.currentUserName]}>
                  {row.username}
                </Text>
                <Text style={styles.rankMeta}>
                  Streak {row.streak_count} | Coins {row.total_coins}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: colors.primary },
  card: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    backgroundColor: '#fff', padding: 12, gap: 8,
  },
  sectionTitle: { color: colors.text, fontWeight: '700' },
  requestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestName: { color: colors.text, fontWeight: '600' },
  requestActions: { flexDirection: 'row', gap: 6 },
  acceptBtn: {
    borderRadius: 8, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5,
  },
  acceptText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rejectBtn: {
    borderRadius: 8, backgroundColor: '#f2f2f2', paddingHorizontal: 10, paddingVertical: 5,
  },
  rejectText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.text,
  },
  searchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: {
    borderRadius: 8, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  segmentWrap: {
    flexDirection: 'row', backgroundColor: '#e9efe9', borderRadius: 12, padding: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#fff' },
  segmentText: { color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  muted: { color: colors.textMuted },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#edf2ed', paddingVertical: 8,
  },
  rankIndex: { color: colors.textMuted, fontWeight: '700', width: 28 },
  rankMain: { flex: 1 },
  rankName: { color: colors.text, fontWeight: '700' },
  currentUserName: { color: colors.primary },
  rankMeta: { color: colors.textMuted, fontSize: 12 },
});
