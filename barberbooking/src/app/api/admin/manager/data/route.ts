import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isManagerRequest } from '@/lib/barberAuth';

export async function GET(req: NextRequest) {
  if (!isManagerRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const [{ data: appointments }, { data: barbers }, { data: blocked }, { data: barberServices }] = await Promise.all([
    sb.from('appointments').select('*, barbers(name, specialty)').order('date').order('time'),
    sb.from('barbers').select('id, name, specialty, image_url, is_active').order('created_at'),
    sb.from('blocked_slots')
      .select('id, barber_id, blocked_date, blocked_time, reason, barbers(name)')
      .order('blocked_date')
      .order('blocked_time'),
    sb.from('barber_services').select('*').order('barber_id').order('sort_order'),
  ]);

  return NextResponse.json({
    appointments: appointments ?? [],
    barbers: barbers ?? [],
    blocked_slots: blocked ?? [],
    barber_services: barberServices ?? [],
  });
}
