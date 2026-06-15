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
  const { error } = await sb.from('blocked_slots').upsert(slots);
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

  const sb = supabaseAdmin();
  for (const s of slots) {
    const { error } = await sb.from('blocked_slots').delete().eq('date', s.date).eq('time', s.time);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
