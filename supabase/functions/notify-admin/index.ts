import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

serve(async (req) => {
  const { record } = await req.json();
  const { name, phone, service, date, time } = record;

  const svcLabel = SVC_NAMES[service] ?? service;
  const message = `✂️ תור חדש נקבע!\n\n👤 שם: ${name}\n📞 טלפון: ${phone}\n✂️ שירות: ${svcLabel}\n📅 תאריך: ${formatDate(date)}\n🕐 שעה: ${time}\n\nברבר בודפשט`;

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from       = Deno.env.get('TWILIO_WHATSAPP_FROM');
  const to         = Deno.env.get('ADMIN_WHATSAPP_NUMBER');

  if (accountSid && authToken && from && to) {
    const params = new URLSearchParams({ From: from, To: to, Body: message });
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: params.toString(),
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
