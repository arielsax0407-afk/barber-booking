import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SVC_NAMES: Record<string, string> = {
  haircut: 'תספורת',
  beard: 'עיצוב זקן',
  'haircut-beard': 'תספורת + זקן',
  kids: 'תספורת ילדים',
  fade: 'פייד',
};

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatDate(d: string) {
  const parts = d.split('-');
  return `${parseInt(parts[2])} ${MONTHS[parseInt(parts[1]) - 1]}`;
}

function jerusalemParts(d: Date): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) map[p.type] = p.value;
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
}

const CANCEL_WINDOW_MS = 3 * 60 * 60 * 1000;

// Compares Jerusalem wall-clock (date,time) strings, not raw UTC math — both
// "now" and "now + 3h" are converted through the same Asia/Jerusalem
// Intl formatter, so this stays correct across the DST transition without
// any manual offset handling.
function isTooLateToCancel(date: string, time: string): boolean {
  const cutoff = jerusalemParts(new Date(Date.now() + CANCEL_WINDOW_MS));
  return `${date} ${time}` <= `${cutoff.date} ${cutoff.time}`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith('re_xxx')) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: 'ברבר פרמיום <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });
  } catch {
    // fire-and-forget — ignore errors
  }
}

async function sendCustomerCancelNotice(params: {
  name: string;
  service: string;
  service_name?: string | null;
  date: string;
  time: string;
  barber_id: string | null;
}) {
  const { name, service, service_name, date, time, barber_id } = params;
  if (!barber_id) return;

  const svc = service_name || SVC_NAMES[service] || service;
  const dateStr = formatDate(date);

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0908;color:#f3ecdd;border-radius:10px;">
      <h2 style="color:#ef4444;margin:0 0 20px">❌ לקוח ביטל תור</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#ef4444;font-weight:bold;width:100px">שם:</td><td style="padding:8px 0">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#ef4444;font-weight:bold">שירות:</td><td style="padding:8px 0">${svc}</td></tr>
        <tr><td style="padding:8px 0;color:#ef4444;font-weight:bold">תאריך:</td><td style="padding:8px 0">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#ef4444;font-weight:bold">שעה:</td><td style="padding:8px 0">${time}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:12px;color:rgba(243,236,221,0.45)">ברבר פרמיום — מערכת ניהול תורים</p>
    </div>`;

  const subject = `❌ לקוח ביטל תור — ${name} · ${svc} · ${time}`;

  const sb = supabaseAdmin();
  const { data } = await sb.from('barbers').select('email').eq('id', barber_id).maybeSingle();
  if (data?.email) await sendEmail(data.email, subject, html);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: appt } = await sb
    .from('appointments')
    .select('name, service, service_name, date, time, status, barbers(name)')
    .eq('cancel_token', token)
    .maybeSingle();

  if (!appt) {
    return NextResponse.json({ error: 'התור לא נמצא' }, { status: 404 });
  }

  const alreadyCancelled = appt.status === 'cancelled';
  const tooLate = !alreadyCancelled && isTooLateToCancel(appt.date, appt.time);

  return NextResponse.json({
    appointment: {
      name: appt.name,
      service: appt.service,
      service_name: appt.service_name,
      date: appt.date,
      time: appt.time,
      status: appt.status,
      barber_name: (appt.barbers as unknown as { name: string } | null)?.name ?? null,
    },
    cancellable: !alreadyCancelled && !tooLate,
    alreadyCancelled,
    tooLate,
  });
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: appt } = await sb
    .from('appointments')
    .select('id, name, service, service_name, date, time, status, barber_id')
    .eq('cancel_token', token)
    .maybeSingle();

  if (!appt) {
    return NextResponse.json({ error: 'התור לא נמצא' }, { status: 404 });
  }
  if (appt.status === 'cancelled') {
    return NextResponse.json({ error: 'התור כבר בוטל', alreadyCancelled: true }, { status: 409 });
  }
  if (isTooLateToCancel(appt.date, appt.time)) {
    return NextResponse.json(
      { error: 'לא ניתן לבטל תור פחות מ-3 שעות לפני המועד. אנא צרו קשר עם המספרה.' },
      { status: 400 }
    );
  }

  const { error } = await sb.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void sendCustomerCancelNotice({
    name: appt.name,
    service: appt.service,
    service_name: appt.service_name,
    date: appt.date,
    time: appt.time,
    barber_id: appt.barber_id,
  });

  return NextResponse.json({
    ok: true,
    appointment: { name: appt.name, service: appt.service, date: appt.date, time: appt.time },
  });
}
