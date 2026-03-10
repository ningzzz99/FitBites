import { Flame } from 'lucide-react';
import type { LeaderboardEntry } from '@/types';

interface Props {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}

const ICON_MAP: Record<string, string> = {
  leaf: '🌿',
  flame: '🔥',
  star: '⭐',
  heart: '❤️',
  apple: '🍎',
};

export default function LeaderboardRow({ entry, rank, isCurrentUser }: Props) {
  const medalColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600'];
  const rankColor = rank <= 3 ? medalColors[rank - 1] : 'text-gray-500';

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition ${
        isCurrentUser
          ? 'border-green-300 bg-green-50'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      {/* Rank */}
      <span className={`w-6 text-center font-bold text-sm ${rankColor}`}>{rank}</span>

      {/* Avatar / Banner */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: entry.banner_color }}
      >
        {ICON_MAP[entry.banner_icon] ?? '🌿'}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-green-700' : 'text-gray-800'}`}>
          {entry.username} {isCurrentUser && <span className="text-xs font-normal text-green-500">(you)</span>}
        </p>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-1 text-orange-500">
        <Flame className="w-4 h-4" />
        <span className="text-sm font-bold">{entry.streak_count}</span>
      </div>
    </div>
  );
}
