import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('barbers')
    .select('id, name, specialty, image_url')
    .eq('is_active', true)
    .order('created_at');

  return NextResponse.json({ barbers: data ?? [] });
}
