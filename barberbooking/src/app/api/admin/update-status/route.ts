import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminRequest } from '@/lib/adminAuth';

function stripBOM(s: string | undefined): string {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export async function POST(req: NextRequest) {
  const adminPassword = stripBOM(process.env.ADMIN_PASSWORD).trim();
  if (!isAdminRequest(req, adminPassword)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, status } = await req.json();

  if (!['approved', 'rejected', 'pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const url = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY) || stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabaseAdmin = createClient(url, key);

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
