import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function stripBOM(s: string | undefined): string {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export async function GET(req: NextRequest) {
  const adminPassword = stripBOM(process.env.ADMIN_PASSWORD).trim();
  if (!isAdminRequest(req, adminPassword)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const [{ data: appts }, { data: blocked }] = await Promise.all([
    sb.from('appointments').select('*').order('date').order('time'),
    sb.from('blocked_slots').select('date,time'),
  ]);

  return NextResponse.json({ appointments: appts ?? [], blockedSlots: blocked ?? [] });
}
