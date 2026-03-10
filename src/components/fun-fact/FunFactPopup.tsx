'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import type { FunFact } from '@/types';

const TOPIC_COLORS: Record<string, string> = {
  nutrition: 'bg-green-100 text-green-700',
  exercise: 'bg-blue-100 text-blue-700',
  recipe: 'bg-orange-100 text-orange-700',
  'mental-health': 'bg-purple-100 text-purple-700',
};

export default function FunFactPopup() {
  const [open, setOpen] = useState(false);
  const [fact, setFact] = useState<FunFact | null>(null);

  useEffect(() => {
    if (!open || fact) return;
    fetch('/api/fun-facts')
      .then((r) => r.json())
      .then((data) => setFact(data));
  }, [open, fact]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 rounded-full hover:bg-green-100 transition" aria-label="Daily fun fact">
        <Lightbulb className="w-5 h-5 text-green-600" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="font-bold text-gray-800">Daily Fun Fact</h2>
            </div>

            {fact ? (
              <>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TOPIC_COLORS[fact.topic] ?? 'bg-gray-100 text-gray-600'}`}>
                  {fact.topic}
                </span>
                <p className="mt-3 text-gray-700 text-sm leading-relaxed">{fact.content}</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm">Loading…</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
