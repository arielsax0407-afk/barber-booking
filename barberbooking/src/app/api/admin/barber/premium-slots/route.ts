import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedBarberId } from '@/lib/barberAuth';
import { SERVICES } from '@/lib/services';

function jerusalemNow(): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) map[p.type] = p.value;
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
}

export async function POST(req: NextRequest) {
  const barberId = getAuthenticatedBarberId(req);
  if (!barberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { date, time, service, premium_price } = await req.json();

  if (!date || !time || !service) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!SERVICES.some(s => s.id === service)) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
  }
  if (!Number.isInteger(premium_price) || premium_price <= 0) {
    return NextResponse.json({ error: 'מחיר פרמיום לא תקין' }, { status: 400 });
  }

  const { date: todayJ, time: nowJ } = jerusalemNow();
  if (date < todayJ || (date === todayJ && time < nowJ)) {
    return NextResponse.json({ error: 'לא ניתן לפתוח תור פרמיום לתאריך או שעה שכבר עברו' }, { status: 400 });
  }
  if (new Date(`${date}T12:00:00`).getDay() === 6) {
    return NextResponse.json({ error: 'המספרה סגורה בשבת — בחר תאריך אחר' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Availability pre-check (same pattern as /api/availability) — the partial
  // unique index appointments_active_slot_unique is the hard backstop against
  // races, this just gives a clean 409 instead of a raw constraint error.
  const [{ data: existingAppt }, { data: blockedRows }] = await Promise.all([
    sb.from('appointments')
      .select('id')
      .eq('barber_id', barberId)
      .eq('date', date)
      .eq('time', time)
      .not('status', 'in', '("cancelled","rejected")')
      .maybeSingle(),
    sb.from('blocked_slots')
      .select('blocked_time')
      .eq('blocked_date', date)
      .or(`barber_id.eq.${barberId},barber_id.is.null`),
  ]);

  if (existingAppt) {
    return NextResponse.json({ error: 'השעה הזו תפוסה כבר' }, { status: 409 });
  }
  const isBlocked = (blockedRows ?? []).some(b => (b.blocked_time as string).slice(0, 5) === time);
  if (isBlocked) {
    return NextResponse.json({ error: 'השעה הזו חסומה' }, { status: 409 });
  }

  const { data, error } = await sb
    .from('appointments')
    .insert({
      barber_id: barberId,
      date,
      time,
      service,
      is_premium: true,
      premium_price,
      status: 'premium_open',
      name: '',
      phone: '',
    })
    .select('*')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'השעה הזו נתפסה הרגע — אנא בחר שעה אחרת' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ appointment: data });
}

export async function DELETE(req: NextRequest) {
  const barberId = getAuthenticatedBarberId(req);
  if (!barberId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const sb = supabaseAdmin();
  // Only ever cancels a still-unbooked premium slot — a slot a customer has
  // already booked has status 'approved' by then and won't match this filter,
  // so this route can never be used to silently cancel a real booking.
  const { data, error } = await sb
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('barber_id', barberId)
    .eq('status', 'premium_open')
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'תור הפרמיום לא נמצא או שכבר נקבע' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
