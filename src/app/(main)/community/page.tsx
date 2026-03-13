'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, LayoutGrid, MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import PostCard from '@/components/community/PostCard';
import CreateGroupModal from '@/components/community/CreateGroupModal';
import GroupChat from '@/components/community/GroupChat';
import type { Post } from '@/types';

const TOPICS = ['general', 'nutrition', 'recipe', 'mental-health'];

interface Group {
  id: number;
  name: string;
  description?: string;
  member_count: number;
}

export default function CommunityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'feed' | 'groups'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('general');
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    const meRes = await fetch('/api/auth/me');
    const { user } = await meRes.json();

    if (user) {
      setCurrentUserId(user.id);
      // Load groups if logged in
      const groupsRes = await fetch('/api/groups');
      const groupsData = await groupsRes.json();
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    }

    const postsRes = await fetch('/api/posts');
    const postsData = await postsRes.json();
    setPosts(Array.isArray(postsData) ? postsData : []);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) { router.push('/login'); return; }
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
      await loadData();
    }
    setPosting(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-700">Community</h1>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => { setActiveTab('feed'); setSelectedGroup(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'feed' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutGrid className="w-4 h-4" /> Discovery
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'groups' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users className="w-4 h-4" /> Peer Groups
          </button>
        </div>
      </div>

      {activeTab === 'feed' ? (
        <div className="max-w-lg mx-auto">
          {currentUserId ? (
            <form onSubmit={handlePost} className="bg-white border border-gray-100 rounded-3xl p-5 mb-8 shadow-sm">
              <h2 className="text-sm font-bold text-gray-800 mb-3">Share a tip or ask a question</h2>
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="e.g. Any quick healthy meal ideas for a busy student?"
                rows={3} maxLength={500}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 mb-4 transition" />

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <select value={topic} onChange={(e) => setTopic(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-600 focus:outline-none">
                    {TOPICS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer select-none">
                    <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="rounded-md border-gray-300 text-green-600 focus:ring-green-500" />
                    Anonymous
                  </label>
                </div>
                {postError && <p className="text-red-500 text-xs font-medium">{postError}</p>}
              </div>

              <button type="submit" disabled={posting || !content.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-3 rounded-2xl transition shadow-lg shadow-green-100 disabled:opacity-50 active:scale-[0.98]">
                {posting ? 'Shaping your post…' : 'Post to Feed'}
              </button>
            </form>
          ) : (
            <div className="bg-white border-2 border-dashed border-green-100 rounded-3xl p-8 text-center mb-8 shadow-sm">
              <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium mb-4">Join our community to share your healthy habits!</p>
              <button onClick={() => router.push('/login')}
                className="bg-green-600 text-white text-sm font-bold px-8 py-3 rounded-2xl hover:bg-green-700 transition shadow-lg shadow-green-100 active:scale-95">
                Sign In to Share
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-3xl" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 px-6">
              <p className="text-gray-400 font-medium">No one has posted yet. Be the pioneer!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  currentUserId={currentUserId}
                  onAction={loadData}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Peer Groups Tab */
        <div className="max-w-xl mx-auto">
          {!currentUserId ? (
            <div className="bg-white border-2 border-dashed border-green-100 rounded-3xl p-12 text-center shadow-sm">
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Private Peer Motivation</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">Sign in to create small groups with your friends and encourage each other through chat and habit reminders.</p>
              <button onClick={() => router.push('/login')}
                className="bg-green-600 text-white text-sm font-bold px-8 py-3 rounded-2xl shadow-lg shadow-green-100 active:scale-95">
                Sign In
              </button>
            </div>
          ) : selectedGroup ? (
            /* Active Group Chat */
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <button
                onClick={() => setSelectedGroup(null)}
                className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-green-600 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to groups
              </button>
              <GroupChat
                groupId={selectedGroup.id}
                groupName={selectedGroup.name}
                currentUserId={currentUserId}
              />
            </div>
          ) : (
            /* Group List */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">My Groups</h2>
                <button
                  onClick={() => setIsGroupModalOpen(true)}
                  className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black transition active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Create Group
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-10 text-center">
                  <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Users className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-bold text-gray-500 mb-1">No groups yet</p>
                  <p className="text-xs text-gray-400 mb-6">Create a group and invite your friends for mutual motivation!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className="flex flex-col items-start p-5 bg-white border border-gray-100 rounded-3xl hover:border-green-300 hover:shadow-md transition text-left group"
                    >
                      <div className="bg-green-100 text-green-600 p-2.5 rounded-2xl mb-4 group-hover:bg-green-600 group-hover:text-white transition">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-800 mb-1">{group.name}</h3>
                      <p className="text-xs text-gray-400 line-clamp-1 mb-4">{group.description || 'No description'}</p>
                      <div className="mt-auto flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase">
                        <Users className="w-3 h-3" />
                        {group.member_count} Members
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreated={(newGroup) => {
          loadData();
          setSelectedGroup(newGroup as Group);
        }}
      />
    </div>
  );
}
