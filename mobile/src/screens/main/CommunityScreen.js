import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ApiError,
  createPost,
  createReply,
  getPosts,
  getReplies,
  upvotePost,
} from '../../api';
import { colors } from '../../theme';

export default function CommunityScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [repliesByPost, setRepliesByPost] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyAnons, setReplyAnons] = useState({});
  const [sendingReplyId, setSendingReplyId] = useState(null);
  const [replyErrors, setReplyErrors] = useState({});

  const loadPosts = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const data = await getPosts();
      setPosts(data);
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
      loadPosts();
    }, [loadPosts])
  );

  async function handlePost() {
    if (content.trim().length < 5) return;
    setPosting(true);
    try {
      await createPost(content.trim(), anonymous);
      setContent('');
      await loadPosts(false);
    } finally {
      setPosting(false);
    }
  }

  async function handleUpvote(postId) {
    try {
      const data = await upvotePost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.post_id === postId ? { ...p, upvotes: data.upvotes, user_upvoted: data.upvoted } : p))
      );
    } catch {}
  }

  async function toggleReplies(postId) {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    if (!repliesByPost[postId]) {
      try {
        const rows = await getReplies(postId);
        setRepliesByPost((prev) => ({ ...prev, [postId]: rows }));
      } catch {
        setRepliesByPost((prev) => ({ ...prev, [postId]: [] }));
      }
    }
  }

  async function sendReply(postId) {
    const draft = (replyDrafts[postId] ?? '').trim();
    if (draft.length < 5) return;
    setSendingReplyId(postId);
    try {
      setReplyErrors((prev) => ({ ...prev, [postId]: null }));
      await createReply(postId, draft, replyAnons[postId] ?? false);
      const rows = await getReplies(postId);
      setRepliesByPost((prev) => ({ ...prev, [postId]: rows }));
      setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
      setReplyAnons((prev) => ({ ...prev, [postId]: false }));
    } catch (err) {
      setReplyErrors((prev) => ({
        ...prev,
        [postId]: err instanceof ApiError ? err.message : 'Could not send reply.',
      }));
    } finally {
      setSendingReplyId(null);
    }
  }

  function renderPost({ item: post }) {
    const postReplies = repliesByPost[post.post_id] ?? [];
    const repliesOpen = expandedPostId === post.post_id;
    const isReplyDisabled = (replyDrafts[post.post_id] ?? '').trim().length < 5 || sendingReplyId === post.post_id;

    return (
      <View style={[styles.card, styles.postCard]}>
        <View style={styles.postHeader}>
          <Text style={styles.postUser}>
            {post.anonymous ? 'Anonymous' : post.username ?? 'User'}
          </Text>
          <Text style={styles.postDate}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.postContent}>{post.content}</Text>
        <View style={styles.postActions}>
          <Pressable
            style={[styles.actionBtn, post.user_upvoted && styles.actionBtnActive]}
            onPress={() => handleUpvote(post.post_id)}
          >
            <Text style={[styles.actionBtnText, post.user_upvoted && styles.actionBtnTextActive]}>
              ▲ {post.upvotes}
            </Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => toggleReplies(post.post_id)}>
            <Text style={styles.actionBtnText}>
              {repliesOpen ? 'Hide replies' : 'Replies'}
            </Text>
          </Pressable>
        </View>

        {repliesOpen ? (
          <View style={styles.repliesWrap}>
            {postReplies.map((reply) => (
              <View key={reply.reply_id} style={styles.replyCard}>
                <Text style={styles.replyMeta}>
                  {reply.anonymous ? 'Anonymous' : reply.username}{' '}
                  {new Date(reply.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.replyContent}>{reply.content}</Text>
              </View>
            ))}
            <TextInput
              style={styles.replyInput}
              value={replyDrafts[post.post_id] ?? ''}
              onChangeText={(text) =>
                setReplyDrafts((prev) => ({ ...prev, [post.post_id]: text }))
              }
              multiline
              scrollEnabled={false}
              placeholder="Write a reply (min 5 characters)"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.toggleRow}>
              <Text style={styles.muted}>Reply anonymously</Text>
              <Switch
                value={replyAnons[post.post_id] ?? false}
                onValueChange={(val) =>
                  setReplyAnons((prev) => ({ ...prev, [post.post_id]: val }))
                }
              />
            </View>
            {replyErrors[post.post_id] ? (
              <Text style={styles.replyError}>{replyErrors[post.post_id]}</Text>
            ) : null}
            <Pressable
              style={[styles.postButton, isReplyDisabled && styles.postButtonDisabled]}
              onPress={() => sendReply(post.post_id)}
              disabled={isReplyDisabled}
            >
              {sendingReplyId === post.post_id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Send reply</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  const isPostDisabled = posting || content.trim().length < 5;

  const listHeader = (
    <View>
      <Text style={styles.title}>Community</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ask or share</Text>
        <TextInput
          style={styles.textArea}
          value={content}
          onChangeText={setContent}
          multiline
          scrollEnabled={false}
          maxLength={500}
          placeholder="Share a question, tip, or motivation (min 5 chars)"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.toggleRow}>
          <Text style={styles.muted}>Post anonymously</Text>
          <Switch value={anonymous} onValueChange={setAnonymous} />
        </View>
        <Pressable
          style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}
          disabled={isPostDisabled}
          onPress={handlePost}
        >
          {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Post</Text>}
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.post_id)}
        renderItem={renderPost}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={colors.primary} style={styles.loadingSpinner} />
            : <Text style={[styles.muted, styles.emptyText]}>No posts yet.</Text>
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(false); }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontWeight: '700', marginBottom: 8 },
  card: {
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    backgroundColor: '#fff', padding: 12, gap: 10,
  },
  postCard: { marginBottom: 0 },
  textArea: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 10, minHeight: 90, textAlignVertical: 'top', color: colors.text,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postButton: {
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: { color: '#fff', fontWeight: '700' },
  loadingSpinner: { marginTop: 20 },
  emptyText: { marginTop: 8 },
  muted: { color: colors.textMuted },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  postUser: { color: colors.text, fontWeight: '700' },
  postDate: { color: colors.textMuted, fontSize: 12 },
  postContent: { color: colors.text, lineHeight: 20 },
  postActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: '#edf3ed', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnActive: { backgroundColor: colors.primary },
  actionBtnText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  actionBtnTextActive: { color: '#fff' },
  repliesWrap: { gap: 8, borderTopWidth: 1, borderTopColor: '#ecf0ec', paddingTop: 8 },
  replyCard: { borderRadius: 10, backgroundColor: '#f4f7f4', padding: 8, gap: 3 },
  replyMeta: { color: colors.textMuted, fontSize: 11 },
  replyContent: { color: colors.text },
  replyError: { color: colors.danger, fontSize: 12 },
  replyInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, color: colors.text,
    minHeight: 70, textAlignVertical: 'top',
  },
});
