import { NextRequest, NextResponse } from 'next/server';
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
  const [, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}

export async function POST(req: NextRequest) {
  const { name, phone, service, date, time } = await req.json();

  const svcLabel = SVC_NAMES[service] ?? service;
  const message = `✂️ תור חדש נקבע!\n\n👤 שם: ${name}\n📞 טלפון: ${phone}\n✂️ שירות: ${svcLabel}\n📅 תאריך: ${formatDate(date)}\n🕐 שעה: ${time}\n\n${SHOP_NAME}`;

  // WhatsApp via Twilio
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ADMIN_WHATSAPP_NUMBER } = process.env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM && ADMIN_WHATSAPP_NUMBER) {
    try {
      const params = new URLSearchParams({
        From: TWILIO_WHATSAPP_FROM,
        To: ADMIN_WHATSAPP_NUMBER,
        Body: message,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          },
          body: params.toString(),
        }
      );
      if (res.ok) return NextResponse.json({ ok: true, channel: 'whatsapp' });
    } catch {
      // fall through to email
    }
  }

  // Email fallback via Resend
  const { RESEND_API_KEY, ADMIN_EMAIL } = process.env;

  if (RESEND_API_KEY && ADMIN_EMAIL) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'תורים <onboarding@resend.dev>',
          to: ADMIN_EMAIL,
          subject: `✂️ תור חדש: ${name} — ${svcLabel} ${time}`,
          text: message,
        }),
      });
      if (res.ok) return NextResponse.json({ ok: true, channel: 'email' });
    } catch {
      // log and continue
    }
  }

  console.log('[notify-admin] no channel configured — appointment:', { name, phone, service, date, time });
  return NextResponse.json({ ok: true, channel: 'none' });
}
