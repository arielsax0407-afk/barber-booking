import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isManagerRequest } from '@/lib/barberAuth';
import { hashPassword } from '@/lib/passwordHash';

export async function POST(req: NextRequest) {
  if (!isManagerRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, password } = await req.json();
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'שם חסר' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('barbers')
    .insert({ name: name.trim(), password: hashPassword(password), is_active: true })
    .select('id, name, specialty, image_url, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ barber: data });
}

export async function PATCH(req: NextRequest) {
  if (!isManagerRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name } = await req.json();
  if (!id || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('barbers')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id, name, specialty, image_url, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ barber: data });
}
