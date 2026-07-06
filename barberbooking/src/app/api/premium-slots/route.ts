import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateCancelToken } from '@/lib/cancelToken';
import { SHOP_NAME } from '@/lib/siteConfig';

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

function jerusalemNow(): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) map[p.type] = p.value;
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith('re_xxx')) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: `${SHOP_NAME} <onboarding@resend.dev>`,
        to,
        subject,
        html,
      }),
    });
  } catch {
    // fire-and-forget — ignore errors
  }
}

// Same shape as sendBookingEmails in /api/book, but barber-only (no admin
// fallback recipient) and with the premium price called out — a premium
// booking always has a barber_id since it can only be created by a barber
// opening a slot on their own calendar.
async function sendPremiumBookingEmail(params: {
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  barber_id: string;
  premium_price: number;
}) {
  const { name, phone, service, date, time, barber_id, premium_price } = params;
  const svc = SVC_NAMES[service] ?? service;
  const dateStr = formatDate(date);

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0908;color:#f3ecdd;border-radius:10px;">
      <h2 style="color:#D4AF37;margin:0 0 20px">⭐ תור פרמיום חדש נקבע!</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#D4AF37;font-weight:bold;width:100px">שם:</td><td style="padding:8px 0">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#D4AF37;font-weight:bold">טלפון:</td><td style="padding:8px 0">${phone}</td></tr>
        <tr><td style="padding:8px 0;color:#D4AF37;font-weight:bold">שירות:</td><td style="padding:8px 0">${svc}</td></tr>
        <tr><td style="padding:8px 0;color:#D4AF37;font-weight:bold">תאריך:</td><td style="padding:8px 0">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#D4AF37;font-weight:bold">שעה:</td><td style="padding:8px 0">${time}</td></tr>
        <tr><td style="padding:8px 0;color:#D4AF37;font-weight:bold">מחיר פרמיום:</td><td style="padding:8px 0">₪${premium_price}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:12px;color:rgba(243,236,221,0.45)">${SHOP_NAME} — מערכת ניהול תורים</p>
    </div>`;

  const subject = `תור פרמיום חדש! ⭐ — ${name} · ${svc} · ${time}`;

  const sb = supabaseAdmin();
  const { data } = await sb.from('barbers').select('email').eq('id', barber_id).maybeSingle();
  if (data?.email) await sendEmail(data.email, subject, html);
}

export async function GET() {
  const sb = supabaseAdmin();
  const { date: today } = jerusalemNow();

  const { data, error } = await sb
    .from('appointments')
    .select('id, date, time, service, premium_price, barber_id, barbers(name)')
    .eq('is_premium', true)
    .eq('status', 'premium_open')
    .gte('date', today)
    .order('date')
    .order('time');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The shop is closed Saturday — open premium slots never land there in
  // practice (the barber-open route blocks it), but filter defensively.
  const slots = (data ?? []).filter(s => new Date(`${s.date}T12:00:00`).getDay() !== 6);

  return NextResponse.json({ slots });
}

export async function POST(req: NextRequest) {
  const { id, name, phone } = await req.json();

  const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  if (!id || !name?.trim() || !cleanPhone) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: slot } = await sb
    .from('appointments')
    .select('id, date, time, service, barber_id, premium_price, status')
    .eq('id', id)
    .maybeSingle();

  if (!slot) {
    return NextResponse.json({ error: 'תור הפרמיום לא נמצא' }, { status: 404 });
  }
  if (slot.status !== 'premium_open') {
    return NextResponse.json({ error: 'תור הפרמיום הזה נתפס כבר — בחר תור אחר' }, { status: 409 });
  }

  const { date: todayJ, time: nowJ } = jerusalemNow();
  if (slot.date < todayJ || (slot.date === todayJ && slot.time < nowJ)) {
    return NextResponse.json({ error: 'לא ניתן לקבוע תור לתאריך או שעה שכבר עברו' }, { status: 400 });
  }
  if (new Date(`${slot.date}T12:00:00`).getDay() === 6) {
    return NextResponse.json({ error: 'המספרה סגורה בשבת — בחר תאריך אחר' }, { status: 400 });
  }

  const cancelToken = generateCancelToken();

  // .eq('status', 'premium_open') on the update is the atomic re-check — if
  // two customers race for the same slot, only the first update matches a
  // row and the second gets back null here.
  const { data: updated, error } = await sb
    .from('appointments')
    .update({ name: name.trim(), phone: cleanPhone, status: 'approved', cancel_token: cancelToken })
    .eq('id', id)
    .eq('status', 'premium_open')
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: 'תור הפרמיום הזה נתפס הרגע — בחר תור אחר' }, { status: 409 });
  }

  if (slot.barber_id) {
    void sendPremiumBookingEmail({
      name: name.trim(),
      phone: cleanPhone,
      service: slot.service,
      date: slot.date,
      time: slot.time,
      barber_id: slot.barber_id,
      premium_price: slot.premium_price,
    });
  }

  return NextResponse.json({ id: updated.id, cancel_token: cancelToken });
}
