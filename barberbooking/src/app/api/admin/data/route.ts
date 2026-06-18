import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_WA_TEMPLATES, WaTemplateKey } from '@/lib/waTemplates';

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
  const [{ data: appts }, { data: blocked }, { data: tmpls }] = await Promise.all([
    sb.from('appointments').select('*').order('date').order('time'),
    sb.from('blocked_slots').select('blocked_date,blocked_time').is('barber_id', null),
    sb.from('wa_templates').select('key,body'),
  ]);

  const templates = { ...DEFAULT_WA_TEMPLATES };
  for (const t of tmpls ?? []) {
    if (t.key in templates) templates[t.key as WaTemplateKey] = t.body;
  }

  // Remap new column names to legacy format for old single-barber admin
  const blockedSlots = (blocked ?? []).map(b => ({
    date: b.blocked_date,
    time: (b.blocked_time as string).slice(0, 5),
  }));

  return NextResponse.json({ appointments: appts ?? [], blockedSlots, templates });
}
