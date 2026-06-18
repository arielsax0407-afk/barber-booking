import { NextRequest, NextResponse } from 'next/server';
import { managerSessionToken } from '@/lib/barberAuth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const managerPassword = process.env.MANAGER_PASSWORD || 'manager123';

  if (password !== managerPassword) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('manager_session', managerSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  void req;
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('manager_session');
  return res;
}
