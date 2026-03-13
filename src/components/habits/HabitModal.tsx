'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw, Plus, Trash2, Check, Sparkles } from 'lucide-react';
import type { Habit } from '@/types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
    currentHabitIds: number[];
}

export default function HabitModal({ isOpen, onClose, onRefresh, currentHabitIds }: Props) {
    const [allHabits, setAllHabits] = useState<Habit[]>([]);
    const [customTask, setCustomTask] = useState('');
    const [spinning, setSpinning] = useState(false);
    const [randomHabit, setRandomHabit] = useState<Habit | null>(null);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/habits')
                .then((r) => r.json())
                .then((data) => {
                    setAllHabits(data);
                    setLoading(false);
                });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const availableHabits = allHabits.filter(h => !currentHabitIds.includes(h.habit_id));

    async function addHabit(habitId: number) {
        setAdding(true);
        await fetch('/api/user-habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habitIds: [habitId] }),
        });
        onRefresh();
        setAdding(false);
    }

    async function addCustom() {
        if (!customTask.trim()) return;
        setAdding(true);
        await fetch('/api/user-habits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habitIds: [], customTask: customTask.trim() }),
        });
        setCustomTask('');
        onRefresh();
        setAdding(false);
    }

    function pickRandom() {
        if (availableHabits.length === 0 || spinning) return;
        setSpinning(true);
        setRandomHabit(null);

        // Simulate a brief "shuffling" animation for feel
        let count = 0;
        const interval = setInterval(() => {
            const random = availableHabits[Math.floor(Math.random() * availableHabits.length)];
            setRandomHabit(random);
            count++;
            if (count > 12) {
                clearInterval(interval);
                setSpinning(false);
            }
        }, 80);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Manage Habits</h2>
                        <p className="text-xs text-gray-400">Add or customize your daily challenges</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 space-y-8">
                    {/* Random Habit Section */}
                    <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-green-600" />
                            <h3 className="font-bold text-green-800">Habit Discovery</h3>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className={`w-full py-6 mb-4 rounded-xl border-2 border-dashed border-green-200 flex items-center justify-center min-h-[80px] bg-white transition-all ${spinning ? 'scale-105 shadow-inner' : ''}`}>
                                {randomHabit ? (
                                    <span className="text-base font-bold text-green-700">{randomHabit.task}</span>
                                ) : (
                                    <span className="text-sm text-gray-400">Discover a random daily challenge</span>
                                )}
                            </div>

                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={pickRandom}
                                    disabled={spinning || availableHabits.length === 0}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-100 flex items-center justify-center gap-2 transition disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
                                    {spinning ? 'Picking...' : 'Challenge a random habit'}
                                </button>

                                {randomHabit && !spinning && (
                                    <button
                                        onClick={() => { addHabit(randomHabit.habit_id); setRandomHabit(null); }}
                                        className="flex-none bg-gray-900 hover:bg-black text-white px-5 rounded-xl transition flex items-center justify-center"
                                        title="Add this habit"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Add Custom Section */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Custom Habit</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customTask}
                                onChange={(e) => setCustomTask(e.target.value)}
                                placeholder="e.g. Read for 20 mins"
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                            <button
                                onClick={addCustom}
                                disabled={adding || !customTask.trim()}
                                className="bg-gray-800 hover:bg-black text-white px-4 rounded-xl transition disabled:opacity-50"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </section>

                    {/* All Habits List */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">All Habits</h3>
                        {loading ? (
                            <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {allHabits.map((h) => {
                                    const isCurrent = currentHabitIds.includes(h.habit_id);
                                    return (
                                        <div key={h.habit_id} className={`flex items-center justify-between p-3 rounded-2xl border transition ${isCurrent ? 'bg-green-50 border-green-100 opacity-60' : 'bg-white border-gray-100 hover:border-green-200'}`}>
                                            <span className="text-xs font-medium text-gray-700">{h.task}</span>
                                            {isCurrent ? (
                                                <div className="bg-green-100 p-1.5 rounded-full">
                                                    <Check className="w-3 h-3 text-green-600" />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => addHabit(h.habit_id)}
                                                    className="p-1.5 hover:bg-green-100 rounded-full text-green-600 transition"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
