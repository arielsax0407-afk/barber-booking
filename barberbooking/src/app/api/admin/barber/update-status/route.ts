import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedBarberId } from '@/lib/barberAuth';

export async function POST(req: NextRequest) {
  const barberId = getAuthenticatedBarberId(req);
  if (!barberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, status } = await req.json();

  if (!['approved', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .eq('barber_id', barberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
