import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const db = getDb();
  const user = db.prepare('SELECT id, username, password_hash FROM users WHERE email = ?').get(email) as
    | { id: number; username: string; password_hash: string }
    | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  await session.save();

  return NextResponse.json({ ok: true });
}
