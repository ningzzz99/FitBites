import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: number;
  username: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fitbites-dev-secret-32-chars-min!!',
  cookieName: 'fitbites-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    throw new Error('Unauthorized');
  }
  return session;
}
