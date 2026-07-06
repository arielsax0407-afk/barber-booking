import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const sb = supabaseAdmin();

  const { data: appt, error } = await sb
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: dayAppts } = await sb
    .from('appointments')
    .select('id,time,service,status,service_duration')
    .eq('date', appt.date)
    .order('time', { ascending: true });

  return NextResponse.json({ appointment: appt, queue: dayAppts ?? [] });
}
