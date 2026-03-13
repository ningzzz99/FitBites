'use client';

import { useState, useRef } from 'react';
import { CheckCircle, Upload, Loader2, Trash2 } from 'lucide-react';
import type { DailyChallenge } from '@/types';

interface Props {
  challenge: DailyChallenge;
  onComplete: (challengeId: number, newCoins: number) => void;
  onRemove?: () => void;
}

export default function ChallengeCard({ challenge, onComplete, onRemove }: Props) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const done = challenge.status === 'completed';

  async function handleRemove() {
    if (!confirm(`Remove "${challenge.task}" from your daily challenges?`)) return;
    setRemoving(true);
    try {
      const endpoint = challenge.custom_habit_id
        ? `/api/custom-habits/${challenge.custom_habit_id}`
        : `/api/user-habits/${challenge.habit_id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok && onRemove) {
        onRemove();
      } else {
        setError('Failed to remove habit.');
      }
    } catch {
      setError('An error occurred.');
    } finally {
      setRemoving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }

    setUploading(true);
    setError('');

    try {
      // Upload image
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) { setError('Upload failed.'); setUploading(false); return; }
      const { url } = await uploadRes.json() as { url: string };

      // Mark challenge complete
      const patchRes = await fetch(`/api/challenges/${challenge.challenge_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_image_url: url }),
      });
      if (!patchRes.ok) { setError('Could not save completion.'); setUploading(false); return; }
      const { coins } = await patchRes.json() as { coins: number; streak: number };

      setUploading(false);
      onComplete(challenge.challenge_id, coins);
    } catch {
      setError('An error occurred during upload.');
      setUploading(false);
    }
  }

  return (
    <div className={`group flex items-center justify-between p-4 rounded-xl border-2 transition ${done ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-green-200'
      }`}>
      <div className="flex items-center gap-3 overflow-hidden">
        <CheckCircle className={`w-5 h-5 shrink-0 ${done ? 'text-green-500' : 'text-gray-300'}`} />
        <span className={`text-sm font-medium truncate ${done ? 'text-green-700' : 'text-gray-700'}`}>
          {challenge.task}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!done && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || removing}
              className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Uploading…' : 'Complete'}
            </button>
            {error && <p className="text-[10px] text-red-500 text-right">{error}</p>}
          </div>
        )}

        <button
          onClick={handleRemove}
          disabled={removing}
          className="p-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition rounded-lg hover:bg-red-50 disabled:opacity-50"
          title="Remove habit"
        >
          {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {done && <span className="text-xs text-green-600 font-medium ml-2">+10 coins</span>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
