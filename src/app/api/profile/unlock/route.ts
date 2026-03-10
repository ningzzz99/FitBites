import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

const COSTS: Record<string, number> = { color: 100, icon: 200 };

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { item_type, item_value } = (await req.json()) as {
      item_type: 'color' | 'icon';
      item_value: string;
    };

    const cost = COSTS[item_type];
    if (!cost || !item_value) {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
    }

    const db = getDb();

    // Check if already unlocked
    const existing = db
      .prepare(
        'SELECT id FROM unlocked_banner_items WHERE user_id = ? AND item_type = ? AND item_value = ?'
      )
      .get(userId, item_type, item_value);

    if (existing) return NextResponse.json({ ok: true, already_owned: true });

    // Check coins
    const user = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId) as
      | { total_coins: number }
      | undefined;

    if (!user || user.total_coins < cost) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 402 });
    }

    // Deduct and unlock
    db.prepare('UPDATE users SET total_coins = total_coins - ? WHERE id = ?').run(cost, userId);
    db.prepare(
      'INSERT OR IGNORE INTO unlocked_banner_items (user_id, item_type, item_value) VALUES (?, ?, ?)'
    ).run(userId, item_type, item_value);

    const updated = db.prepare('SELECT total_coins FROM users WHERE id = ?').get(userId) as {
      total_coins: number;
    };

    return NextResponse.json({ ok: true, remaining_coins: updated.total_coins });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
