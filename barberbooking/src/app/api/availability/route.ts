import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { TIME_SLOTS } from '@/lib/services';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  const barberId = req.nextUrl.searchParams.get('barber_id');
  if (!date) return NextResponse.json({ takenSlots: [] });

  // The shop is closed on Saturday — report every slot as taken instead of
  // silently saying the day is wide open.
  if (new Date(`${date}T12:00:00`).getDay() === 6) {
    return NextResponse.json({ takenSlots: TIME_SLOTS });
  }

  const sb = supabaseAdmin();

  let apptQuery = sb
    .from('appointments')
    .select('time')
    .eq('date', date)
    .in('status', ['pending', 'approved', 'in_progress', 'premium_open']);

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
