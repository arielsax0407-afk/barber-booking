import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  const barberId = req.nextUrl.searchParams.get('barber_id');
  if (!date) return NextResponse.json({ takenSlots: [] });

  const sb = supabaseAdmin();

  let apptQuery = sb
    .from('appointments')
    .select('time')
    .eq('date', date)
    .in('status', ['pending', 'approved', 'in_progress']);

  if (barberId) {
    apptQuery = apptQuery.eq('barber_id', barberId);
  }

  let blockedQuery = sb
    .from('blocked_slots')
    .select('blocked_time')
    .eq('blocked_date', date);

  if (barberId) {
    blockedQuery = blockedQuery.or(`barber_id.eq.${barberId},barber_id.is.null`);
  } else {
    blockedQuery = blockedQuery.is('barber_id', null);
  }

  const [{ data: appts }, { data: blocked }] = await Promise.all([apptQuery, blockedQuery]);

  const takenSlots = [
    ...(appts?.map((a) => a.time) ?? []),
    ...(blocked?.map((b) => (b.blocked_time as string).slice(0, 5)) ?? []),
  ];

  return NextResponse.json({ takenSlots });
}
