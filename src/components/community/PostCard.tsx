'use client';

import { useState, useCallback } from 'react';
import { ThumbsUp, MessageSquare, Send, MoreVertical, Trash2, EyeOff } from 'lucide-react';
import type { Post } from '@/types';

const TOPIC_COLORS: Record<string, string> = {
  nutrition: 'bg-green-100 text-green-700',
  recipe: 'bg-orange-100 text-orange-700',
  'mental-health': 'bg-purple-100 text-purple-700',
  general: 'bg-blue-100 text-blue-700',
};

interface Reply {
  reply_id: number;
  content: string;
  anonymous: number;
  created_at: string;
  username: string;
}

interface Props {
  post: Post;
  currentUserId: number;
  onAction?: () => void;
  isHiddenView?: boolean;
}

export default function PostCard({ post, currentUserId, onAction, isHiddenView }: Props) {
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [voted, setVoted] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleUpvote() {
    if (voted) return;
    const res = await fetch(`/api/posts/${post.post_id}/upvote`, { method: 'POST' });
    if (res.ok) {
      const { upvotes: newCount } = await res.json() as { upvotes: number };
      setUpvotes(newCount);
      setVoted(true);
    }
  }

  const loadReplies = useCallback(async () => {
    const res = await fetch(`/api/posts/${post.post_id}/replies`);
    if (res.ok) {
      setReplies(await res.json());
      setRepliesLoaded(true);
    }
  }, [post.post_id]);

  async function toggleReplies() {
    if (!repliesOpen && !repliesLoaded) await loadReplies();
    setRepliesOpen((v) => !v);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (replyContent.trim().length < 5) return;
    setSubmitting(true);
    const res = await fetch(`/api/posts/${post.post_id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyContent.trim(), anonymous: replyAnon }),
    });
    if (res.ok) {
      setReplyContent('');
      await loadReplies();
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const res = await fetch(`/api/posts/${post.post_id}`, { method: 'DELETE' });
    if (res.ok) onAction?.();
  }

  async function handleHide() {
    const res = await fetch(`/api/posts/${post.post_id}/hide`, { method: 'POST' });
    if (res.ok) onAction?.();
  }

  async function handleUnhide() {
    const res = await fetch(`/api/posts/${post.post_id}/unhide`, { method: 'POST' });
    if (res.ok) onAction?.();
  }

  const displayName = post.anonymous ? 'Anonymous' : (post.username ?? 'User');
  const isAuthor = currentUserId === post.user_id;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
          <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {post.topic && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TOPIC_COLORS[post.topic] ?? 'bg-gray-100 text-gray-600'}`}>
              {post.topic}
            </span>
          )}
          {currentUserId > 0 && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                    {isAuthor ? (
                      <button
                        onClick={() => { handleDelete(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Post
                      </button>
                    ) : isHiddenView ? (
                      <button
                        onClick={() => { handleUnhide(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-600 hover:bg-green-50 transition"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Unhide Post
                      </button>
                    ) : (
                      <button
                        onClick={() => { handleHide(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide Post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.content}</p>

      <div className="flex items-center gap-2">
        <button onClick={handleUpvote} disabled={voted}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition ${voted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
            }`}>
          <ThumbsUp className="w-3.5 h-3.5" />
          {upvotes}
        </button>
        <button onClick={toggleReplies}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition ${repliesOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'
            }`}>
          <MessageSquare className="w-3.5 h-3.5" />
          {repliesLoaded ? `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}` : 'Reply'}
        </button>
      </div>

      {repliesOpen && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {replies.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {replies.map((r) => (
                <div key={r.reply_id} className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">
                    {r.anonymous ? 'Anonymous' : r.username}
                    <span className="font-normal text-gray-400 ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                  </p>
                  <p className="text-xs text-gray-600">{r.content}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleReply} className="flex flex-col gap-2">
            <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply…" rows={2} maxLength={300}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                <input type="checkbox" checked={replyAnon} onChange={(e) => setReplyAnon(e.target.checked)} className="rounded" />
                Anonymous
              </label>
              <button type="submit" disabled={submitting || replyContent.trim().length < 5}
                className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                <Send className="w-3 h-3" />
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
