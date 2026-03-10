import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const { quantity } = await req.json() as { quantity: number };
    const db = getDb();
    db.prepare('UPDATE ingredients SET quantity = ? WHERE id = ? AND user_id = ?').run(quantity, Number(id), userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM ingredients WHERE id = ? AND user_id = ?').run(Number(id), userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
