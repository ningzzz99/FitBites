import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import {
  ApiError,
  createPost,
  createReply,
  getPosts,
  getReplies,
  upvotePost,
  type Reply,
} from '../../src/lib/api';
import { colors } from '../../src/constants/theme';
import type { Post } from '../../src/types';

const TOPICS = ['general', 'nutrition', 'recipe', 'mental-health'];

export default function CommunityScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('general');
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<Record<number, Reply[]>>({});
  const [replyDraft, setReplyDraft] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);

  const loadPosts = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);

    try {
      const data = await getPosts();
      setPosts(data);
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
      loadPosts();
    }, [loadPosts])
  );

  async function refresh() {
    setRefreshing(true);
    await loadPosts(false);
  }

  async function handlePost() {
    if (content.trim().length < 5) return;
    setPosting(true);

    try {
      await createPost(content.trim(), topic, anonymous);
      setContent('');
      await loadPosts(false);
    } finally {
      setPosting(false);
    }
  }

  async function handleUpvote(postId: number) {
    try {
      const data = await upvotePost(postId);
      setPosts((prev) => prev.map((p) => (p.post_id === postId ? { ...p, upvotes: data.upvotes } : p)));
    } catch {
      // Ignore duplicate upvote errors.
    }
  }

  async function toggleReplies(postId: number) {
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

  async function sendReply(postId: number) {
    if (replyDraft.trim().length < 5) return;

    await createReply(postId, replyDraft.trim(), replyAnon);
    const rows = await getReplies(postId);
    setRepliesByPost((prev) => ({ ...prev, [postId]: rows }));
    setReplyDraft('');
    setReplyAnon(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Community</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ask or share</Text>
        <TextInput
          style={styles.textArea}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={500}
          placeholder="Share a question, tip, or motivation"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.topicRow}>
          {TOPICS.map((t) => (
            <Pressable key={t} style={[styles.topicChip, topic === t && styles.topicChipActive]} onPress={() => setTopic(t)}>
              <Text style={[styles.topicChipText, topic === t && styles.topicChipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.muted}>Post anonymously</Text>
          <Switch value={anonymous} onValueChange={setAnonymous} />
        </View>

        <Pressable style={styles.postButton} disabled={posting || content.trim().length < 5} onPress={handlePost}>
          {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Post</Text>}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loadingSpinner} />
      ) : posts.length === 0 ? (
        <Text style={styles.muted}>No posts yet.</Text>
      ) : (
        posts.map((post) => {
          const postReplies = repliesByPost[post.post_id] ?? [];
          const repliesOpen = expandedPostId === post.post_id;
          return (
            <View key={post.post_id} style={styles.card}>
              <View style={styles.postHeader}>
                <Text style={styles.postUser}>{post.anonymous ? 'Anonymous' : post.username ?? 'User'}</Text>
                <Text style={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.postActions}>
                <Pressable style={styles.actionBtn} onPress={() => handleUpvote(post.post_id)}>
                  <Text style={styles.actionBtnText}>Upvote {post.upvotes}</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => toggleReplies(post.post_id)}>
                  <Text style={styles.actionBtnText}>{repliesOpen ? 'Hide replies' : 'Replies'}</Text>
                </Pressable>
              </View>

              {repliesOpen ? (
                <View style={styles.repliesWrap}>
                  {postReplies.map((reply) => (
                    <View key={reply.reply_id} style={styles.replyCard}>
                      <Text style={styles.replyMeta}>
                        {reply.anonymous ? 'Anonymous' : reply.username} {new Date(reply.created_at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.replyContent}>{reply.content}</Text>
                    </View>
                  ))}

                  <TextInput
                    style={styles.replyInput}
                    value={replyDraft}
                    onChangeText={setReplyDraft}
                    multiline
                    placeholder="Write a reply"
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={styles.toggleRow}>
                    <Text style={styles.muted}>Reply anonymously</Text>
                    <Switch value={replyAnon} onValueChange={setReplyAnon} />
                  </View>

                  <Pressable
                    style={styles.postButton}
                    onPress={() => sendReply(post.post_id)}
                    disabled={replyDraft.trim().length < 5}
                  >
                    <Text style={styles.postButtonText}>Send reply</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}
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
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    padding: 12,
    gap: 10,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 90,
    textAlignVertical: 'top',
    color: colors.text,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  topicChipText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  topicChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingSpinner: {
    marginTop: 20,
  },
  muted: {
    color: colors.textMuted,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postUser: {
    color: colors.text,
    fontWeight: '700',
  },
  postDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  postContent: {
    color: colors.text,
    lineHeight: 20,
  },
  postActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#edf3ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  repliesWrap: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#ecf0ec',
    paddingTop: 8,
  },
  replyCard: {
    borderRadius: 10,
    backgroundColor: '#f4f7f4',
    padding: 8,
    gap: 3,
  },
  replyMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  replyContent: {
    color: colors.text,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
