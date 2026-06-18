import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedBarberId } from '@/lib/barberAuth';

export async function GET(req: NextRequest) {
  const barberId = getAuthenticatedBarberId(req);
  if (!barberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  const { data } = await sb
    .from('blocked_slots')
    .select('id, blocked_date, blocked_time, reason, barber_id')
    .or(`barber_id.eq.${barberId},barber_id.is.null`)
    .order('blocked_date')
    .order('blocked_time');

  return NextResponse.json({ blocked_slots: data ?? [] });
}

export async function POST(req: NextRequest) {
  const barberId = getAuthenticatedBarberId(req);
  if (!barberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { date, time, reason } = await req.json();
  if (!date || !time) return NextResponse.json({ error: 'Missing date/time' }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb.from('blocked_slots').insert({
    barber_id: barberId,
    blocked_date: date,
    blocked_time: time,
    reason: reason || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const barberId = getAuthenticatedBarberId(req);
  if (!barberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb
    .from('blocked_slots')
    .delete()
    .eq('id', id)
    .eq('barber_id', barberId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
