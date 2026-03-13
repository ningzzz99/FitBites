'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bell, Apple, Droplets, Sparkles, User, Loader2 } from 'lucide-react';

interface Message {
    id: number;
    user_id: number | null;
    content: string;
    type: string;
    created_at: string;
    username?: string;
    banner_color?: string;
    banner_icon?: string;
}

interface Props {
    groupId: number;
    groupName: string;
    currentUserId: number;
}

export default function GroupChat({ groupId, groupName, currentUserId }: Props) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/groups/${groupId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    async function handleSend(e?: React.FormEvent, contentOverride?: string, typeOverride?: string) {
        e?.preventDefault();
        const content = contentOverride || newMessage;
        const type = typeOverride || 'text';

        if (!content.trim()) return;

        setSending(true);
        try {
            const res = await fetch(`/api/groups/${groupId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content.trim(), type }),
            });

            if (res.ok) {
                if (!contentOverride) setNewMessage('');
                fetchMessages();
            }
        } catch (err) {
            console.error('Failed to send message', err);
        } finally {
            setSending(false);
        }
    }

    function sendReminder(text: string) {
        handleSend(undefined, text, 'reminder');
    }

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Group Header */}
            <div className="bg-green-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <Bell className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold leading-tight">{groupName}</h3>
                        <p className="text-[10px] opacity-80 uppercase tracking-wider font-bold">Peer Support Group</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Sparkles className="w-8 h-8 text-yellow-400 mb-2" />
                        <p className="text-sm font-medium text-gray-500">Silence is healthy, but encouragement is better!</p>
                        <p className="text-xs text-gray-400">Be the first to say something or send a reminder.</p>
                    </div>
                ) : (
                    messages.map((m) => {
                        const isMe = m.user_id === currentUserId;

                        if (m.type === 'notification') {
                            return (
                                <div key={m.id} className="flex justify-center">
                                    <div className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold border border-green-200 shadow-sm flex items-center gap-2">
                                        <Sparkles className="w-3 h-3" />
                                        <span>{m.username} {m.content}</span>
                                    </div>
                                </div>
                            );
                        }

                        if (m.type === 'reminder') {
                            return (
                                <div key={m.id} className="flex justify-center">
                                    <div className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold border border-blue-200 shadow-sm flex items-center gap-2 italic">
                                        <Bell className="w-3 h-3" />
                                        <span>Reminder: {m.username} says, {m.content}</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                {!isMe && (
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                                        style={{ backgroundColor: m.banner_color || '#10b981' }}
                                    >
                                        <User className="w-4 h-4" />
                                    </div>
                                )}
                                <div className={`max-w-[75%] space-y-1`}>
                                    {!isMe && <p className="text-[10px] font-bold text-gray-400 ml-1 uppercase">{m.username}</p>}
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe
                                            ? 'bg-green-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                        }`}>
                                        {m.content}
                                    </div>
                                    <p className={`text-[9px] text-gray-300 font-medium ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Quick Reminders */}
            <div className="p-2 border-t border-gray-100 bg-white overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                    <button onClick={() => sendReminder('Drink some water 💧')} className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold transition">
                        <Droplets className="w-3.5 h-3.5" /> Drink Water
                    </button>
                    <button onClick={() => sendReminder('Time for a healthy snack 🍎')} className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded-xl text-xs font-bold transition">
                        <Apple className="w-3.5 h-3.5" /> Eat Fruit
                    </button>
                    <button onClick={() => sendReminder('Don\'t forget your habits! ✨')} className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-1.5 rounded-xl text-xs font-bold transition">
                        <Sparkles className="w-3.5 h-3.5" /> Reminder
                    </button>
                </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a supportive message..."
                    className="flex-1 bg-gray-100 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-400 transition"
                />
                <button
                    disabled={sending || !newMessage.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-2xl transition shadow-lg shadow-green-100 disabled:opacity-50"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
