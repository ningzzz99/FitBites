import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { email, password, username } = await req.json();

  if (!email || !password || !username) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return NextResponse.json({ error: 'Email or username already in use' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)'
  ).run(email, username, password_hash);

  const userId = result.lastInsertRowid as number;
  const session = await getSession();
  session.userId = userId;
  session.username = username;
  await session.save();

  return NextResponse.json({ ok: true });
}
