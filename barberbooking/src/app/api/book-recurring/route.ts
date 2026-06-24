import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateCancelToken } from '@/lib/cancelToken';

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

async function sendRecurringSummaryEmail(params: {
  name: string;
  phone: string;
  service: string;
  time: string;
  barber_id: string | null;
  bookedDates: string[];
}) {
  const { name, phone, service, time, barber_id, bookedDates } = params;
  if (bookedDates.length === 0) return;

  const svc = SVC_NAMES[service] ?? service;
  const first = formatDate(bookedDates[0]);
  const last = formatDate(bookedDates[bookedDates.length - 1]);

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0a0908;color:#f3ecdd;border-radius:10px;">
      <h2 style="color:#B266FF;margin:0 0 20px">🔁 תור קבוע נקבע — ${bookedDates.length} תורים</h2>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold;width:100px">שם:</td><td style="padding:8px 0">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">טלפון:</td><td style="padding:8px 0">${phone}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">שירות:</td><td style="padding:8px 0">${svc}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">שעה:</td><td style="padding:8px 0">${time}</td></tr>
        <tr><td style="padding:8px 0;color:#B266FF;font-weight:bold">טווח:</td><td style="padding:8px 0">${first} — ${last}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:12px;color:rgba(243,236,221,0.45)">ברבר פרמיום — מערכת ניהול תורים</p>
    </div>`;

  const subject = `🔁 תור קבוע נקבע — ${name} · ${svc} · ${bookedDates.length} תורים`;

  const sb = supabaseAdmin();

  let barberEmail: string | null | undefined = process.env.ADMIN_EMAIL_BARBER_DEFAULT;
  if (barber_id) {
    const { data } = await sb.from('barbers').select('email').eq('id', barber_id).maybeSingle();
    if (data?.email) barberEmail = data.email;
  }
  if (barberEmail) await sendEmail(barberEmail, subject, html);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonthsStr(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return toDateStr(d);
}

// weekly/biweekly: same weekday every 7 or 14 days. monthly: same day-of-month
// each month — a month that doesn't have that day-of-month is skipped
// entirely (not rolled forward/back), so it never appears as an occurrence at all.
function generateOccurrences(startDate: string, frequency: 'weekly' | 'biweekly' | 'monthly', endDate: string): string[] {
  const dates: string[] = [];

  if (frequency === 'weekly' || frequency === 'biweekly') {
    const stepDays = frequency === 'biweekly' ? 14 : 7;
    let cursor = new Date(`${startDate}T12:00:00`);
    while (toDateStr(cursor) <= endDate) {
      dates.push(toDateStr(cursor));
      cursor = new Date(cursor.getTime());
      cursor.setDate(cursor.getDate() + stepDays);
    }
    return dates;
  }

  const start = new Date(`${startDate}T12:00:00`);
  const day = start.getDate();
  let monthOffset = 0;
  while (true) {
    const firstOfMonth = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1, 12, 0, 0);
    if (toDateStr(firstOfMonth) > endDate) break;
    const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
    if (day <= daysInMonth) {
      const occurrence = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), day, 12, 0, 0);
      const occurrenceStr = toDateStr(occurrence);
      if (occurrenceStr <= endDate) dates.push(occurrenceStr);
    }
    monthOffset++;
  }
  return dates;
}

type SkipReason = 'past' | 'saturday' | 'taken';

export async function POST(req: NextRequest) {
  const { name, phone, service, barber_id, time, startDate, frequency, endDate } = await req.json();

  // Normalize to digits-only at write time — same convention as /api/book.
  const cleanPhone = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';

  if (!name?.trim() || !cleanPhone || !service || !startDate || !time || !endDate) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (frequency !== 'weekly' && frequency !== 'biweekly' && frequency !== 'monthly') {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
  }

  // Cap at 3 months from the first appointment — clamp, don't error.
  const cappedEnd = addMonthsStr(startDate, 3);
  const effectiveEndDate = endDate > cappedEnd ? cappedEnd : endDate;

  const occurrenceDates = generateOccurrences(startDate, frequency, effectiveEndDate);

  const { date: todayJ } = jerusalemNow();

  const candidateDates: string[] = [];
  const skipped: { date: string; reason: SkipReason }[] = [];

  for (const date of occurrenceDates) {
    if (date < todayJ) {
      skipped.push({ date, reason: 'past' });
      continue;
    }
    if (new Date(`${date}T12:00:00`).getDay() === 6) {
      skipped.push({ date, reason: 'saturday' });
      continue;
    }
    candidateDates.push(date);
  }

  const sb = supabaseAdmin();
  const barberId: string | null = barber_id || null;

  const takenDates = new Set<string>();

  if (candidateDates.length > 0) {
    let apptQuery = sb
      .from('appointments')
      .select('date')
      .eq('time', time)
      .in('date', candidateDates)
      .in('status', ['pending', 'approved', 'in_progress']);
    if (barberId) apptQuery = apptQuery.eq('barber_id', barberId);

    // Two separate queries (not a single .or() filter) so neither barberId
    // nor any other value ever has to be interpolated into a raw PostgREST
    // filter string.
    const blockedShopWideQuery = sb
      .from('blocked_slots')
      .select('blocked_date, blocked_time')
      .in('blocked_date', candidateDates)
      .is('barber_id', null);
    const blockedBarberQuery = barberId
      ? sb.from('blocked_slots').select('blocked_date, blocked_time').in('blocked_date', candidateDates).eq('barber_id', barberId)
      : null;

    const [{ data: apptRows }, { data: blockedShopWide }, blockedBarberRes] = await Promise.all([
      apptQuery,
      blockedShopWideQuery,
      blockedBarberQuery ?? Promise.resolve({ data: [] as { blocked_date: string; blocked_time: string }[] }),
    ]);

    for (const row of apptRows ?? []) takenDates.add(row.date);
    for (const row of [...(blockedShopWide ?? []), ...(blockedBarberRes.data ?? [])]) {
      if ((row.blocked_time as string).slice(0, 5) === time) takenDates.add(row.blocked_date);
    }
  }

  const bookableDates: string[] = [];
  for (const date of candidateDates) {
    if (takenDates.has(date)) {
      skipped.push({ date, reason: 'taken' });
    } else {
      bookableDates.push(date);
    }
  }

  // Each occurrence is its own appointment row, so each gets its own
  // independent self-cancel token (cancelling one shouldn't affect the rest).
  const rows = bookableDates.map((date) => ({
    name: name.trim(),
    phone: cleanPhone,
    service,
    date,
    time,
    status: 'approved',
    barber_id: barberId,
    cancel_token: generateCancelToken(),
  }));

  let bookedDates: string[] = [];
  const cancelTokens: Record<string, string> = {};

  if (rows.length > 0) {
    const { data: inserted, error } = await sb.from('appointments').insert(rows).select('date, cancel_token');

    if (error) {
      if (error.code === '23505') {
        // The whole bulk insert rolled back because of one colliding row —
        // none of these rows actually landed, so retry every one of them
        // individually and only skip the ones that genuinely collide.
        for (const row of rows) {
          const { error: rowError } = await sb.from('appointments').insert(row);
          if (rowError) {
            if (rowError.code === '23505') {
              skipped.push({ date: row.date, reason: 'taken' });
            } else {
              return NextResponse.json({ error: rowError.message }, { status: 500 });
            }
          } else {
            bookedDates.push(row.date);
            cancelTokens[row.date] = row.cancel_token;
          }
        }
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      for (const r of inserted ?? []) cancelTokens[r.date] = r.cancel_token;
      bookedDates = (inserted ?? []).map((r) => r.date);
    }
  }

  bookedDates.sort();
  skipped.sort((a, b) => a.date.localeCompare(b.date));

  // Fire-and-forget — one summary email, never one per occurrence.
  void sendRecurringSummaryEmail({ name: name.trim(), phone: cleanPhone, service, time, barber_id: barberId, bookedDates });

  return NextResponse.json({ booked: bookedDates.length, bookedDates, skipped, cancelTokens });
}
