'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Check, X } from 'lucide-react';
import LeaderboardRow from '@/components/leaderboard/LeaderboardRow';
import type { LeaderboardEntry } from '@/types';

type Tab = 'global' | 'friends';

interface FriendRow {
  id: number;
  user_id_1: number;
  user_id_2: number;
  status: string;
  username_1: string;
  username_2: string;
}

interface UserResult {
  id: number;
  username: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('global');
  const [globalEntries, setGlobalEntries] = useState<LeaderboardEntry[]>([]);
  const [friendEntries, setFriendEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [friendRows, setFriendRows] = useState<FriendRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const loadLeaderboard = useCallback(() => {
    fetch('/api/leaderboard')
      .then((r) => { if (r.status === 401) { router.push('/login'); throw new Error(); } return r.json(); })
      .then(({ global, friends, currentUserId: uid }) => {
        setGlobalEntries(global);
        setFriendEntries(friends);
        setCurrentUserId(uid);
        setLoading(false);
      })
      .catch(() => {});
  }, [router]);

  const loadFriends = useCallback(async () => {
    const res = await fetch('/api/friends');
    if (res.ok) setFriendRows(await res.json());
  }, []);

  useEffect(() => {
    loadLeaderboard();
    loadFriends();
  }, [loadLeaderboard, loadFriends]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setSearchResults(await res.json());
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function handleAddFriend(targetUserId: number) {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    if (res.ok || res.status === 409) {
      setAddedIds((prev) => new Set(prev).add(targetUserId));
      await loadFriends();
    }
  }

  async function handleRespond(friendId: number, status: 'accepted' | 'rejected') {
    await fetch(`/api/friends/${friendId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadFriends();
    loadLeaderboard();
  }

  const pendingIncoming = friendRows.filter(
    (r) => r.user_id_2 === currentUserId && r.status === 'pending'
  );

  const isFriendOrPending = (uid: number) =>
    friendRows.some(
      (r) =>
        (r.user_id_1 === currentUserId && r.user_id_2 === uid) ||
        (r.user_id_2 === currentUserId && r.user_id_1 === uid)
    ) || addedIds.has(uid);

  const displayed = tab === 'global' ? globalEntries : friendEntries;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Leaderboard</h1>

      {/* Pending friend requests */}
      {pendingIncoming.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-blue-700 mb-3">Friend Requests</p>
          <div className="flex flex-col gap-2">
            {pendingIncoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-800">{r.username_1}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleRespond(r.id, 'accepted')}
                    className="flex items-center gap-1 text-xs bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded-lg transition">
                    <Check className="w-3 h-3" /> Accept
                  </button>
                  <button onClick={() => handleRespond(r.id, 'rejected')}
                    className="flex items-center gap-1 text-xs bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-600 px-2.5 py-1 rounded-lg transition">
                    <X className="w-3 h-3" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Find friends */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Find Friends</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500" />
        </div>
        {searchLoading && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-800">{u.username}</span>
                {isFriendOrPending(u.id) ? (
                  <span className="text-xs text-gray-400">Request sent</span>
                ) : (
                  <button onClick={() => handleAddFriend(u.id)}
                    className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg transition">
                    <UserPlus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
        {(['global', 'friends'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'global' ? 'Worldwide' : 'Friends Only'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-12">Loading…</p>
      ) : displayed.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">
          {tab === 'friends' ? 'Add friends to see their streaks here.' : 'No users on the leaderboard yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {displayed.map((entry, idx) => (
            <LeaderboardRow key={entry.user_id} entry={entry} rank={idx + 1}
              isCurrentUser={Number(entry.user_id) === currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
