'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SERVICES } from '@/lib/services';
import type { Appointment } from '@/lib/supabase';

type QueueAppt = { id: string; time: string; service: string; status: Appointment['status']; service_duration?: number | null };

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatDate(d: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}

// Prefer the name/duration snapshotted on the appointment at booking time —
// the old static SERVICES lookup is only a fallback for legacy rows booked
// before that snapshot existed, since service ids are per-barber
// (barber_services UUIDs) and won't match it. Durations can also legitimately
// differ per barber for "the same" service id, so a bare id lookup is no
// longer reliable even for current bookings.
function svcName(appt: { service: string; service_name?: string | null }) {
  return appt.service_name || SERVICES.find(s => s.id === appt.service)?.name || appt.service;
}

function svcDuration(appt: { service: string; service_duration?: number | null }) {
  if (appt.service_duration != null) return appt.service_duration;
  return SERVICES.find(s => s.id === appt.service)?.duration ?? 30;
}

const STATUS_CFG = {
  pending:     { text: 'ממתין לאישור',   color: '#b45309', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.28)',  icon: '⏳', desc: 'הספר יאשר את התור בקרוב' },
  approved:    { text: 'מאושר — בתור',  color: '#1d4ed8', bg: 'rgba(59,130,246,0.09)',  border: 'rgba(59,130,246,0.25)',  icon: '✓',  desc: 'התור שלך אושר! ממתין בתור' },
  in_progress: { text: 'בטיפול עכשיו!', color: '#065f46', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)',  icon: '✂️', desc: 'הספר מטפל בך כעת' },
  completed:   { text: 'הסתיים ✓',       color: '#065f46', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)',  icon: '✅', desc: 'התור הושלם בהצלחה' },
  cancelled:   { text: 'בוטל',           color: '#374151', bg: 'rgba(107,114,128,0.07)', border: 'rgba(107,114,128,0.18)', icon: '✕',  desc: 'התור בוטל' },
  rejected:    { text: 'נדחה',           color: '#991b1b', bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.20)',   icon: '✕',  desc: 'צרו קשר לקביעה חדשה' },
};

export default function QueuePage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const router = useRouter();

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [dayAppts, setDayAppts] = useState<QueueAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue/${appointmentId}`);
      if (!res.ok) { setNotFound(true); return; }

      const json = await res.json();
      const a = json.appointment as Appointment;

      if (prevStatusRef.current !== null && prevStatusRef.current !== a.status) {
        setFlash(true);
        setTimeout(() => setFlash(false), 1200);
      }
      prevStatusRef.current = a.status;

      setAppt(a);
      setDayAppts((json.queue ?? []) as QueueAppt[]);
    } catch {
      // Network blip — the 8s interval will retry; don't show "not found" for this.
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Queue position — only counts non-done appointments
  const activeQueue = dayAppts
    .filter(a => !['completed', 'cancelled', 'rejected'].includes(a.status))
    .sort((a, b) => a.time.localeCompare(b.time));

  const myIndex = appt ? activeQueue.findIndex(a => a.id === appt.id) : -1;
  const position = myIndex + 1;
  const peopleAhead = Math.max(0, myIndex);
  const waitMinutes = appt
    ? activeQueue.slice(0, myIndex).reduce((sum, a) => sum + svcDuration(a), 0)
    : 0;

  /* ── Loading ─────────────────────────────────────── */
  if (loading) return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, margin: '0 auto 1rem', border: '2px solid rgba(28,25,23,0.15)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>טוען...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Not found ───────────────────────────────────── */
  if (notFound) return (
    <div className="page-bg min-h-screen flex items-center justify-center px-6">
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</p>
        <h2 className="serif" style={{ fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.75rem' }}>תור לא נמצא</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>הקישור אינו תקין או שהתור נמחק.</p>
        <button className="btn-primary" onClick={() => router.push('/book')} style={{ width: '100%' }}>קבע תור חדש</button>
      </div>
    </div>
  );

  if (!appt) return null;

  const cfg = STATUS_CFG[appt.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
  const showQueue = ['approved', 'in_progress'].includes(appt.status) && myIndex >= 0;
  const isDone = ['completed', 'cancelled', 'rejected'].includes(appt.status);

  /* ── Main render ─────────────────────────────────── */
  return (
    <div className="page-bg min-h-screen px-4 py-10" dir="rtl">
      <div style={{ maxWidth: 440, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="animate-fade-in">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 700, marginBottom: '0.5rem' }}>
            ברבר פרמיום
          </p>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 400, color: 'var(--text)' }}>
            התור שלך
          </h1>
        </div>

        {/* Status card */}
        <div className="animate-fade-up" style={{
          background: flash ? cfg.bg : '#fff',
          border: `1.5px solid ${cfg.border}`,
          borderRadius: 'var(--radius)',
          padding: '1.75rem',
          marginBottom: '1.25rem',
          textAlign: 'center',
          transition: 'background 0.5s ease',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: cfg.bg,
            border: `1.5px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '1.75rem',
            animation: appt.status === 'in_progress' ? 'pulse-ring 2s ease-in-out infinite' : 'none',
          }}>
            {cfg.icon}
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: cfg.color, marginBottom: '0.375rem' }}>
            {cfg.text}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{cfg.desc}</p>
        </div>

        {/* Queue position bar — approved and in active queue */}
        {showQueue && appt.status === 'approved' && (
          <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', marginBottom: '1.25rem', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>מיקום בתור</span>
              <span className="serif" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>
                #{position}
              </span>
            </div>

            {/* Progress dots */}
            {activeQueue.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: 4, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {activeQueue.map((a, i) => (
                    <div key={a.id} style={{
                      flex: '1 1 0', minWidth: 6, height: 7, borderRadius: 4,
                      background: i < myIndex
                        ? 'rgba(16,185,129,0.45)'
                        : a.id === appt.id
                        ? 'var(--amber)'
                        : 'rgba(28,25,23,0.10)',
                      transition: 'background 0.6s ease',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  <span style={{ fontWeight: 600 }}>
                    {peopleAhead === 0 ? '🎉 אתה הבא!' : `${peopleAhead} ${peopleAhead === 1 ? 'אדם' : 'אנשים'} לפניך`}
                  </span>
                  <span>
                    {waitMinutes > 0 ? `כ-${waitMinutes} דק׳ המתנה` : 'כמעט תורך!'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* In-progress banner */}
        {appt.status === 'in_progress' && (
          <div className="animate-fade-up" style={{
            background: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.22)',
            borderRadius: 'var(--radius)', padding: '1.25rem',
            textAlign: 'center', marginBottom: '1.25rem',
          }}>
            <p style={{ color: '#065f46', fontWeight: 700, fontSize: '1rem' }}>
              ✂️ הספר מטפל בך עכשיו
            </p>
            <p style={{ color: '#065f46', fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.75 }}>
              אל תתרחק!
            </p>
          </div>
        )}

        {/* Appointment details */}
        <div className="glass-card animate-fade-up" style={{ padding: '1.5rem', background: '#fff', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '1rem' }}>
            פרטי התור
          </p>
          {([
            ['שם', appt.name],
            ['שירות', svcName(appt)],
            ['תאריך', formatDate(appt.date)],
            ['שעה', appt.time],
          ] as [string, string][]).map(([label, value], i) => (
            <div key={label}>
              {i > 0 && <div className="divider" style={{ margin: '0.75rem 0' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {isDone && (
            <button className="btn-primary" onClick={() => router.push('/book')} style={{ width: '100%' }}>
              קבע תור חדש
            </button>
          )}
          <button className="btn-ghost" onClick={() => router.push('/')} style={{ width: '100%' }}>
            חזרה לדף הבית
          </button>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.68rem', marginTop: '2rem', letterSpacing: '0.08em' }}>
          הדף מתעדכן אוטומטית בזמן אמת
        </p>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0.08); }
        }
      `}</style>
    </div>
  );
}
