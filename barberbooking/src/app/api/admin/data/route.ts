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
    sb.from('blocked_slots').select('date,time'),
    sb.from('wa_templates').select('key,body'),
  ]);

  const templates = { ...DEFAULT_WA_TEMPLATES };
  for (const t of tmpls ?? []) {
    if (t.key in templates) templates[t.key as WaTemplateKey] = t.body;
  }

  return NextResponse.json({ appointments: appts ?? [], blockedSlots: blocked ?? [], templates });
}
