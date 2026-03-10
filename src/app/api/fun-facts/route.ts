import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // Try today's fact first, then any fact
  const fact =
    db.prepare("SELECT id as fact_id, topic, content, fact_date FROM fun_facts WHERE fact_date = ? LIMIT 1").get(today) ??
    db.prepare("SELECT id as fact_id, topic, content, fact_date FROM fun_facts ORDER BY RANDOM() LIMIT 1").get();

  return NextResponse.json(fact ?? null);
}
