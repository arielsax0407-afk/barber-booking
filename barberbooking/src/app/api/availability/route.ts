import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ takenSlots: [] });

  const sb = supabaseAdmin();
  const [{ data: appts }, { data: blocked }] = await Promise.all([
    sb.from('appointments').select('time').eq('date', date).neq('status', 'rejected'),
    sb.from('blocked_slots').select('time').eq('date', date),
  ]);

  const takenSlots = [
    ...(appts?.map((a) => a.time) ?? []),
    ...(blocked?.map((b) => b.time) ?? []),
  ];

  return NextResponse.json({ takenSlots });
}
