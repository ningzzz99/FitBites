'use client';

import { useState, useRef } from 'react';
import { CheckCircle, Upload, Loader2 } from 'lucide-react';
import type { DailyChallenge } from '@/types';

interface Props {
  challenge: DailyChallenge;
  onComplete: (challengeId: number, newCoins: number) => void;
}

export default function ChallengeCard({ challenge, onComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const done = challenge.status === 'completed';

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }

    setUploading(true);
    setError('');

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
  }

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition ${
      done ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-green-200'
    }`}>
      <div className="flex items-center gap-3">
        <CheckCircle className={`w-5 h-5 shrink-0 ${done ? 'text-green-500' : 'text-gray-300'}`} />
        <span className={`text-sm font-medium ${done ? 'text-green-700' : 'text-gray-700'}`}>
          {challenge.task}
        </span>
      </div>

      {!done && (
        <div className="flex flex-col items-end gap-1">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {uploading ? 'Uploading…' : 'Complete'}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}

      {done && <span className="text-xs text-green-600 font-medium">+10 coins</span>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
