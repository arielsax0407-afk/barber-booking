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

async function sendBookingEmails(params: {
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  barber_id?: string | null;
}) {
  const { name, phone, service, date, time, barber_id } = params;
  const svc = SVC_NAMES[service] ?? service;
  const dateStr = formatDate(date);

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0908;color:#f3ecdd;border-radius:10px;">
      <h2 style="color:#B266FF;margin:0 0 20px">✂️ תור חדש נקבע!</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold;width:100px">שם:</td><td style="padding:8px 0">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">טלפון:</td><td style="padding:8px 0">${phone}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">שירות:</td><td style="padding:8px 0">${svc}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">תאריך:</td><td style="padding:8px 0">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">שעה:</td><td style="padding:8px 0">${time}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:12px;color:rgba(243,236,221,0.45)">ברבר פרמיום — מערכת ניהול תורים</p>
    </div>`;

  const subject = `תור חדש נקבע! ✂️ — ${name} · ${svc} · ${time}`;

  const sb = supabaseAdmin();

  // Send to barber
  let barberEmail: string | null | undefined = process.env.ADMIN_EMAIL_BARBER_DEFAULT;
  if (barber_id) {
    const { data } = await sb.from('barbers').select('email').eq('id', barber_id).maybeSingle();
    if (data?.email) barberEmail = data.email;
  }
  if (barberEmail) await sendEmail(barberEmail, subject, html);

  // Send to manager
  const managerEmail = process.env.ADMIN_EMAIL;
  if (managerEmail && managerEmail !== 'admin@example.com') {
    await sendEmail(managerEmail, subject, html);
  }
}

export async function POST(req: NextRequest) {
  const { name, phone, service, date, time, barber_id } = await req.json();

  if (!name?.trim() || !phone?.trim() || !service || !date || !time) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('appointments')
    .insert({
      name: name.trim(),
      phone: phone.trim(),
      service,
      date,
      time,
      status: 'approved',
      barber_id: barber_id || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  // Fire-and-forget email notifications
  void sendBookingEmails({ name, phone, service, date, time, barber_id });

  return NextResponse.json({ id: data.id });
}
