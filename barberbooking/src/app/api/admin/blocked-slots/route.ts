import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function stripBOM(s: string | undefined): string {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

type Slot = { date: string; time: string };

export async function POST(req: NextRequest) {
  const adminPassword = stripBOM(process.env.ADMIN_PASSWORD).trim();
  if (!isAdminRequest(req, adminPassword)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slots } = (await req.json()) as { slots: Slot[] };
  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'Missing slots' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const rows = slots.map(s => ({ blocked_date: s.date, blocked_time: s.time, barber_id: null }));
  const { error } = await sb.from('blocked_slots').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const adminPassword = stripBOM(process.env.ADMIN_PASSWORD).trim();
  if (!isAdminRequest(req, adminPassword)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slots } = (await req.json()) as { slots: Slot[] };
  if (!Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'Missing slots' }, { status: 400 });
  }

  // Validated before being interpolated into the .or() filter string below.
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}:\d{2}$/;
  if (slots.some(s => !DATE_RE.test(s.date) || !TIME_RE.test(s.time))) {
    return NextResponse.json({ error: 'Invalid slot format' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  // Single atomic delete instead of looping per slot — a failure partway
  // through the loop used to leave some slots deleted and others not.
  const orFilter = slots.map(s => `and(blocked_date.eq.${s.date},blocked_time.eq.${s.time})`).join(',');
  const { error } = await sb
    .from('blocked_slots')
    .delete()
    .is('barber_id', null)
    .or(orFilter);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
