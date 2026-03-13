'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Coins, Plus } from 'lucide-react';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import FunFactPopup from '@/components/fun-fact/FunFactPopup';
import HabitModal from '@/components/habits/HabitModal';
import type { DailyChallenge } from '@/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeekDay { date: string; completed: boolean }

export default function HomePage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    const res = await fetch('/api/challenges');
    if (res.status === 401) { router.push('/login'); return; }
    const data = await res.json();
    setChallenges(data.challenges ?? []);
    setStreak(data.streak ?? 0);
    setCoins(data.coins ?? 0);
    setWeekDays((data.week ?? []).map((d: { date: string; completed: boolean }) => ({ date: d.date, completed: d.completed })));
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleComplete(challengeId: number, newCoins: number) {
    setChallenges((prev) =>
      prev.map((c) => c.challenge_id === challengeId ? { ...c, status: 'completed' } : c)
    );
    setCoins(newCoins);
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 text-sm">Loading your challenges…</p></div>;
  }

  const currentHabitIds = challenges
    .map(c => c.habit_id)
    .filter((id): id is number => id !== undefined && id !== null);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-green-700">FitBites</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-yellow-700">{coins}</span>
          </div>
          <FunFactPopup />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Your Streak</span>
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-5 h-5" />
            <span className="font-bold text-lg">{streak}</span>
          </div>
        </div>
        <div className="flex justify-between gap-1">
          {weekDays.map(({ date, completed }, idx) => {
            const day = new Date(date + 'T00:00:00');
            const label = DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1];
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${completed ? 'bg-green-500 text-white'
                    : idx === weekDays.length - 1 ? 'bg-gray-100 border-2 border-dashed border-gray-300 text-gray-400'
                      : 'bg-gray-100 text-gray-300'
                  }`}>{completed ? '✓' : ''}</div>
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Today&apos;s Challenges</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Manage
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No habits selected yet.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-green-600 text-sm font-medium hover:underline mt-1 block w-full text-center"
          >
            Manage habits →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {challenges.map((c) => (
            <ChallengeCard
              key={c.challenge_id}
              challenge={c}
              onComplete={handleComplete}
              onRemove={loadData}
            />
          ))}
        </div>
      )}

      <HabitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={loadData}
        currentHabitIds={currentHabitIds}
      />
    </div>
  );
}
