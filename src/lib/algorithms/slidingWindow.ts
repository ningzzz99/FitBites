import type { ChallengeLog, CalorieLog } from '@/types';

/**
 * Compute the current consecutive-day streak from a list of challenge logs.
 *
 * A day "counts" if at least one challenge was completed on that date.
 * The streak is the number of consecutive calendar days ending today (or yesterday,
 * to handle the case where today's challenges are not yet done).
 */
export function computeStreak(challenges: ChallengeLog[]): number {
  if (challenges.length === 0) return 0;

  // Build a set of all dates on which at least one challenge was completed
  const completedDates = new Set<string>(
    challenges
      .filter((c) => c.completed)
      .map((c) => c.date)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);

  // Walk backwards from today
  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // Allow a one-day grace: if today hasn't been completed yet, try yesterday
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        const yestStr = cursor.toISOString().split('T')[0];
        if (completedDates.has(yestStr)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  return streak;
}

/**
 * Calculate the rolling 7-day average calorie intake using a sliding window.
 *
 * Maintains a FIFO queue of the last 7 days and a running sum for O(1) mean.
 * Days with no log are treated as 0 calories.
 */
export function sevenDayAverage(logs: CalorieLog[]): number {
  if (logs.length === 0) return 0;

  // Build a map: date -> calories
  const byDate = new Map<string, number>();
  for (const log of logs) {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.calories);
  }

  // Generate the last 7 calendar days
  const days: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  // FIFO queue sliding window
  const queue: number[] = [];
  let runningSum = 0;

  for (const day of days) {
    const cal = byDate.get(day) ?? 0;
    queue.push(cal);
    runningSum += cal;
    if (queue.length > 7) {
      runningSum -= queue.shift()!;
    }
  }

  return queue.length > 0 ? Math.round(runningSum / queue.length) : 0;
}

/**
 * Return a weekly summary: array of { date, completed, calories } for the past 7 days.
 */
export function weeklyView(
  challenges: ChallengeLog[],
  calories: CalorieLog[]
): { date: string; completed: boolean; calories: number }[] {
  const completedSet = new Set(challenges.filter((c) => c.completed).map((c) => c.date));
  const calMap = new Map<string, number>();
  for (const log of calories) {
    calMap.set(log.date, (calMap.get(log.date) ?? 0) + log.calories);
  }

  const result = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      completed: completedSet.has(dateStr),
      calories: calMap.get(dateStr) ?? 0,
    });
  }
  return result;
}
