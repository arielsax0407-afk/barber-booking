import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ barberId: string }> }) {
  const { barberId } = await params;
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('barber_services')
    .select('id, name, price, duration')
    .eq('barber_id', barberId)
    .eq('is_active', true)
    .order('sort_order');

  return NextResponse.json({ services: data ?? [] });
}
