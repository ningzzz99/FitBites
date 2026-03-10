'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/community/PostCard';
import type { Post } from '@/types';

const TOPICS = ['general', 'nutrition', 'recipe', 'mental-health'];

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('general');
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/posts');
    if (res.status === 401) { router.push('/login'); return; }
    setPosts(await res.json());

    const meRes = await fetch('/api/auth/me');
    const { user } = await meRes.json();
    if (user) setCurrentUserId(user.id);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPostError('');
    if (content.trim().length < 5) { setPostError('Post must be at least 5 characters.'); return; }
    if (content.length > 500) { setPostError('Post must be under 500 characters.'); return; }

    setPosting(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim(), topic, anonymous }),
    });
    if (!res.ok) {
      setPostError('Failed to post. Please try again.');
    } else {
      setContent('');
      await loadPosts();
    }
    setPosting(false);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Community</h1>

      <form onSubmit={handlePost} className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ask a question or share a tip</h2>
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="e.g. Any quick healthy meal ideas for a busy student?"
          rows={3} maxLength={500}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 mb-3" />

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <select value={topic} onChange={(e) => setTopic(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none">
            {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="rounded" />
            Post anonymously
          </label>
        </div>

        {postError && <p className="text-red-500 text-xs mb-2">{postError}</p>}

        <button type="submit" disabled={posting || !content.trim()}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-xl transition disabled:opacity-50">
          {posting ? 'Posting…' : 'Post'}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-12">Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">No posts yet. Be the first to share something!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => <PostCard key={post.post_id} post={post} currentUserId={currentUserId} />)}
        </div>
      )}
    </div>
  );
}
