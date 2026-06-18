import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { barberSessionToken } from '@/lib/barberAuth';
import { verifyPassword } from '@/lib/passwordHash';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: 'Missing password' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: barbers, error } = await sb
    .from('barbers')
    .select('id, name, specialty, password')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const barber = (barbers ?? []).find(b => verifyPassword(password, b.password)) ?? null;

  if (!barber) {
    return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
  }

  const sessionData = JSON.stringify({ id: barber.id, token: barberSessionToken(barber.id) });

  const res = NextResponse.json({ ok: true, barber: { id: barber.id, name: barber.name } });
  res.cookies.set('barber_session', sessionData, {
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
  res.cookies.delete('barber_session');
  return res;
}
