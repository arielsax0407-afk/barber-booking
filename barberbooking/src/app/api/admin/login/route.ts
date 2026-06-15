import { NextRequest, NextResponse } from 'next/server';
import { adminSessionToken } from '@/lib/adminAuth';

function cleanEnv(s: string | undefined): string {
  if (!s) return '';
  const noBom = s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
  return noBom.trim();
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = cleanEnv(process.env.ADMIN_PASSWORD);

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', adminSessionToken(adminPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
