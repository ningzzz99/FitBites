import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  try {
    const { userId } = await requireAuth();
    const db = getDb();
    const rows = db.prepare(
      'SELECT id as ingredient_id, ingredient_name, category, quantity, unit, created_at FROM ingredients WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { ingredient_name, category, quantity, unit } = await req.json() as {
      ingredient_name: string; category?: string; quantity?: number; unit?: string;
    };
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO ingredients (user_id, ingredient_name, category, quantity, unit) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, ingredient_name, category ?? null, quantity ?? 1, unit ?? 'units');

    const row = db.prepare(
      'SELECT id as ingredient_id, ingredient_name, category, quantity, unit, created_at FROM ingredients WHERE id = ?'
    ).get(result.lastInsertRowid);
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
