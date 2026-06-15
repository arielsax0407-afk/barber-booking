import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { WA_TEMPLATE_KEYS, WaTemplateKey } from '@/lib/waTemplates';

function stripBOM(s: string | undefined): string {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export async function POST(req: NextRequest) {
  const adminPassword = stripBOM(process.env.ADMIN_PASSWORD).trim();
  if (!isAdminRequest(req, adminPassword)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { templates } = (await req.json()) as { templates: Partial<Record<WaTemplateKey, string>> };
  if (!templates || typeof templates !== 'object') {
    return NextResponse.json({ error: 'Missing templates' }, { status: 400 });
  }

  const rows = WA_TEMPLATE_KEYS
    .filter(key => typeof templates[key] === 'string')
    .map(key => ({ key, body: templates[key] as string, updated_at: new Date().toISOString() }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid templates' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from('wa_templates').upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
