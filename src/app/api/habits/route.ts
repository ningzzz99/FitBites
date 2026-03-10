import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const habits = db.prepare('SELECT id as habit_id, task FROM habits ORDER BY id').all();
  return NextResponse.json(habits);
}
