import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isManagerRequest } from '@/lib/barberAuth';

export async function POST(req: NextRequest) {
  if (!isManagerRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, ids } = await req.json();

  // Bulk path (e.g. cancelling every appointment on a day being blocked) — a
  // single .in() update instead of N round-trips. The single-id path stays
  // for the existing per-row cancel button.
  if (Array.isArray(ids)) {
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }
    const sb = supabaseAdmin();
    const { error } = await sb
      .from('appointments')
      .update({ status: 'cancelled' })
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, cancelled: ids.length });
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
