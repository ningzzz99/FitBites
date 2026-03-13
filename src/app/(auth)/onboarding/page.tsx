'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Habit } from '@/types';

export default function OnboardingPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customTask, setCustomTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/habits')
      .then((r) => r.json())
      .then((data) => { setHabits(data); setLoading(false); });
  }, []);

  function toggleHabit(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleFinish() {
    if (selected.size === 0) return;
    setSaving(true);
    const res = await fetch('/api/user-habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitIds: [...selected], customTask: customTask.trim() || undefined }),
    });
    if (res.status === 401) { router.push('/login'); return; }
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-green-700 mb-1">Choose Your Habits</h1>
        <p className="text-gray-500 text-sm mb-6">Select the habits you want to work on every day.</p>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading habits…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {habits.map((h) => (
              <button key={h.habit_id} onClick={() => toggleHabit(h.habit_id)}
                className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                  selected.has(h.habit_id)
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-green-300'
                }`}>
                {selected.has(h.habit_id) ? '✓ ' : ''}{h.task}
              </button>
            ))}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Add a custom habit (optional)</label>
          <input type="text" value={customTask} onChange={(e) => setCustomTask(e.target.value)}
            placeholder="e.g. Read for 20 minutes" maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500" />
        </div>

        <button onClick={handleFinish} disabled={selected.size === 0 || saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50">
          {saving ? 'Saving…' : `Start with ${selected.size} habit${selected.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
