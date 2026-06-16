import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { TIME_SLOTS } from '@/lib/services';

export async function GET() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('appointments')
    .select('time')
    .in('status', ['pending', 'approved', 'in_progress', 'completed']);

  const counts: Record<string, number> = {};
  for (const slot of TIME_SLOTS) counts[slot] = 0;
  for (const row of data ?? []) {
    if (row.time in counts) counts[row.time] += 1;
  }

  return NextResponse.json({ counts, total: data?.length ?? 0 });
}
