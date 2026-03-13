'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Flame, Eye, EyeOff, LogOut, Award, Lock } from 'lucide-react';
import type { Badge } from '@/types';

const BANNER_COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa', '#34d399', '#fbbf24'];
const BANNER_ICONS = ['leaf', 'flame', 'star', 'heart', 'apple'];
const ICON_MAP: Record<string, string> = { leaf: '🌿', flame: '🔥', star: '⭐', heart: '❤️', apple: '🍎' };
const DEFAULT_COLOR = '#4ade80';
const DEFAULT_ICON = 'leaf';

interface ProfileData {
  id: number; username: string; height: number | null; weight: number | null;
  dietary_req: string | null; total_coins: number; shown_in_leaderboard: boolean;
  banner_color: string; banner_icon: string;
}

interface UnlockedItem { item_type: string; item_value: string; }

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dietaryReq, setDietaryReq] = useState('');
  const [bannerColor, setBannerColor] = useState('#4ade80');
  const [bannerIcon, setBannerIcon] = useState('leaf');
  const [shownOnLb, setShownOnLb] = useState(true);
  const [unlockedItems, setUnlockedItems] = useState<UnlockedItem[]>([]);

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/profile');
    if (res.status === 401) { router.push('/login'); return; }
    const { profile: p, badges: b, streak: s, unlocked_items: ui } = await res.json() as {
      profile: ProfileData; badges: Badge[]; streak: number; unlocked_items: UnlockedItem[];
    };
    setProfile(p);
    setHeight(p.height?.toString() ?? '');
    setWeight(p.weight?.toString() ?? '');
    setDietaryReq(p.dietary_req ?? '');
    setBannerColor(p.banner_color);
    setBannerIcon(p.banner_icon);
    setShownOnLb(p.shown_in_leaderboard);
    setBadges(b);
    setStreak(s);
    setUnlockedItems(ui ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleSave() {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        height: height ? parseInt(height) : null,
        weight: weight ? parseInt(weight) : null,
        dietary_req: dietaryReq || null,
        banner_color: bannerColor,
        banner_icon: bannerIcon,
        shown_in_leaderboard: shownOnLb,
      }),
    });
    setSaving(false);
    await loadProfile();
  }

  function isUnlocked(type: 'color' | 'icon', value: string) {
    if (type === 'color' && value === DEFAULT_COLOR) return true;
    if (type === 'icon' && value === DEFAULT_ICON) return true;
    return unlockedItems.some((u) => u.item_type === type && u.item_value === value);
  }

  async function handleUnlock(type: 'color' | 'icon', value: string) {
    setUnlockError('');
    const key = `${type}:${value}`;
    setUnlocking(key);
    const res = await fetch('/api/profile/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: type, item_value: value }),
    });
    if (!res.ok) {
      const { error } = await res.json() as { error: string };
      setUnlockError(error === 'Insufficient coins' ? 'Not enough coins!' : 'Failed to unlock.');
    } else {
      await loadProfile();
      if (type === 'color') setBannerColor(value);
      else setBannerIcon(value);
    }
    setUnlocking(null);
  }

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 text-sm">Loading profile…</p></div>;
  if (!profile) return null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: bannerColor }}>
          {ICON_MAP[bannerIcon] ?? '🌿'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{profile.username}</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-yellow-500">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-semibold">{profile.total_coins} coins</span>
            </div>
            <div className="flex items-center gap-1 text-orange-500">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-semibold">{streak} day streak</span>
            </div>
          </div>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div key={b.badge_id} className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
                <Award className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs font-medium text-yellow-700">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Personal Info</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="65"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Dietary requirements</label>
          <input type="text" value={dietaryReq} onChange={(e) => setDietaryReq(e.target.value)} placeholder="e.g. vegetarian, nut allergy"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Leaderboard Banner</h2>
        <p className="text-xs text-gray-400 mb-4">Unlock colours for 100🪙 · icons for 200🪙</p>
        {unlockError && <p className="text-xs text-red-500 mb-3">{unlockError}</p>}
        <p className="text-xs text-gray-500 mb-2">Banner colour</p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {BANNER_COLORS.map((c) => {
            const owned = isUnlocked('color', c);
            const isActive = bannerColor === c;
            const isLoading = unlocking === `color:${c}`;
            return (
              <button key={c} disabled={isLoading}
                onClick={() => owned ? setBannerColor(c) : handleUnlock('color', c)}
                style={{ backgroundColor: c }}
                className={`relative w-9 h-9 rounded-full transition flex items-center justify-center ${isActive ? 'ring-2 ring-offset-2 ring-green-500' : ''} ${!owned ? 'opacity-60' : ''}`}>
                {!owned && !isLoading && <Lock className="w-3 h-3 text-white drop-shadow" />}
                {isLoading && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mb-2">Banner icon</p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {BANNER_ICONS.map((icon) => {
            const owned = isUnlocked('icon', icon);
            const isActive = bannerIcon === icon;
            const isLoading = unlocking === `icon:${icon}`;
            return (
              <button key={icon} disabled={isLoading}
                onClick={() => owned ? setBannerIcon(icon) : handleUnlock('icon', icon)}
                className={`relative w-11 h-11 rounded-xl text-lg transition flex items-center justify-center ${isActive ? 'bg-green-100 ring-2 ring-green-400' : 'bg-gray-100 hover:bg-gray-200'} ${!owned ? 'opacity-60' : ''}`}>
                {owned ? ICON_MAP[icon] : (
                  isLoading
                    ? <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    : <Lock className="w-4 h-4 text-gray-500" />
                )}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div onClick={() => setShownOnLb((v) => !v)}
            className={`w-10 h-6 rounded-full relative transition ${shownOnLb ? 'bg-green-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${shownOnLb ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {shownOnLb
                ? <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> Visible on leaderboard</span>
                : <span className="flex items-center gap-1"><EyeOff className="w-4 h-4" /> Hidden from leaderboard</span>}
            </p>
            <p className="text-xs text-gray-400">{shownOnLb ? 'Others can see your streak' : 'Your streak is private'}</p>
          </div>
        </label>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 mb-3">
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      <button onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 py-2.5 rounded-xl transition text-sm">
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}
