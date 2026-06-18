import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isManagerRequest } from '@/lib/barberAuth';
import { TIME_SLOTS } from '@/lib/services';

export async function POST(req: NextRequest) {
  if (!isManagerRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { date, time, barber_id, reason } = await req.json();
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 });

  const sb = supabaseAdmin();
  const barberId: string | null = barber_id || null;
  const times: string[] = time ? [time] : TIME_SLOTS;

  // Clear any existing blocks for this date/barber combo first, so re-blocking
  // a whole day (or a single slot) is idempotent instead of erroring on conflict.
  let clearQuery = sb.from('blocked_slots').delete().eq('blocked_date', date).in('blocked_time', times);
  clearQuery = barberId ? clearQuery.eq('barber_id', barberId) : clearQuery.is('barber_id', null);
  const { error: clearError } = await clearQuery;
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

  const rows = times.map(t => ({
    blocked_date: date,
    blocked_time: t,
    barber_id: barberId,
    reason: reason || null,
  }));

  const { error } = await sb.from('blocked_slots').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, blocked: rows.length });
}

export async function DELETE(req: NextRequest) {
  if (!isManagerRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sb = supabaseAdmin();
  const { error } = await sb.from('blocked_slots').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
