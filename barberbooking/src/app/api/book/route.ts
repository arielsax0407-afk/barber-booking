import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { name, phone, service, date, time } = await req.json();

  if (!name?.trim() || !phone?.trim() || !service || !date || !time) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('appointments')
    .insert({ name: name.trim(), phone: phone.trim(), service, date, time, status: 'pending' })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
