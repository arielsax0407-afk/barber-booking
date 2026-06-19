import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const rawPhone = req.nextUrl.searchParams.get('phone')?.trim() ?? '';
  if (!rawPhone) return NextResponse.json({ appointments: [] });

  const sb = supabaseAdmin();

  // Phone numbers may have been stored with or without dashes/spaces depending
  // on how the customer typed them at booking time. An exact match alone can
  // miss a real appointment if the customer searches with a different format
  // than they booked with — so we also match on the last 9 digits (Israeli
  // operator prefix + subscriber number), which stays stable across leading
  // "0"/"+972"/dash/space variations without being short enough to risk
  // matching a different customer's number.
  const digits = rawPhone.replace(/\D/g, '');
  const suffix = digits.length >= 9 ? digits.slice(-9) : null;

  const [exactRes, suffixRes] = await Promise.all([
    sb.from('appointments').select('*').eq('phone', rawPhone),
    suffix
      ? sb.from('appointments').select('*').ilike('phone', `%${suffix}`)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (exactRes.error) {
    return NextResponse.json({ error: exactRes.error.message }, { status: 500 });
  }

  const merged = new Map<string, Record<string, unknown>>();
  for (const row of exactRes.data ?? []) merged.set(row.id, row);
  for (const row of suffixRes.data ?? []) merged.set(row.id, row);

  const appointments = Array.from(merged.values()).sort((a, b) => {
    const dateCmp = String(b.date).localeCompare(String(a.date));
    return dateCmp !== 0 ? dateCmp : String(b.time).localeCompare(String(a.time));
  });

  return NextResponse.json({ appointments });
}
