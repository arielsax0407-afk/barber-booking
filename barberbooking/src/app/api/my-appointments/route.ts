import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function stripBOM(s: string | undefined): string {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')?.trim() ?? '';
  if (!phone) return NextResponse.json({ appointments: [] });

  const url = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY) || stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('phone', phone)
    .order('date', { ascending: false })
    .order('time', { ascending: false });

  if (error) {
    const stripped = phone.replace(/[-\s]/g, '');
    if (stripped !== phone) {
      const { data: data2, error: err2 } = await supabase
        .from('appointments')
        .select('*')
        .eq('phone', stripped)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
      return NextResponse.json({ appointments: data2 ?? [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    const stripped = phone.replace(/[-\s]/g, '');
    if (stripped !== phone) {
      const { data: data2 } = await supabase
        .from('appointments')
        .select('*')
        .eq('phone', stripped)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      return NextResponse.json({ appointments: data2 ?? [] });
    }
  }

  return NextResponse.json({ appointments: data ?? [] });
}
