'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SERVICES, LOYALTY_THRESHOLD, LOYALTY_REWARD_LABEL } from '@/lib/services';
import type { Appointment } from '@/lib/supabase';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]} ${y}`;
}

function svcName(id: string) {
  return SERVICES.find(s => s.id === id)?.name ?? id;
}

function svcPrice(id: string) {
  return SERVICES.find(s => s.id === id)?.price ?? '';
}

// UX-only mirror of the server-side 3-hour rule in /api/cancel — this just
// decides whether to show the link; the actual cancel is re-validated there.
function isCancellable(appt: Appointment): boolean {
  if (appt.status !== 'approved' || !appt.cancel_token) return false;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(Date.now() + 3 * 60 * 60 * 1000))) map[p.type] = p.value;
  const cutoff = `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`;
  return `${appt.date} ${appt.time}` > cutoff;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'ממתין לאישור',  color: '#92400e', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)'  },
  approved:    { label: 'אושר ✓',         color: '#065f46', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)'  },
  in_progress: { label: 'בטיפול עכשיו',  color: '#1e40af', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)'  },
  completed:   { label: 'הושלם',          color: '#065f46', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.20)'  },
  rejected:    { label: 'נדחה',           color: '#991b1b', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.20)'   },
  cancelled:   { label: 'בוטל',           color: '#374151', bg: 'rgba(107,114,128,0.07)', border: 'rgba(107,114,128,0.18)' },
};

function AppointmentCard({ appt }: { appt: Appointment }) {
  const cfg = STATUS_CFG[appt.status] ?? STATUS_CFG.pending;
  const isApproved = appt.status === 'approved' || appt.status === 'in_progress' || appt.status === 'completed';
  const isDone = appt.status === 'cancelled' || appt.status === 'rejected';

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${isApproved ? 'rgba(16,185,129,0.22)' : isDone ? 'rgba(28,25,23,0.08)' : 'rgba(28,25,23,0.10)'}`,
      borderRadius: 'var(--radius)',
      padding: '1.25rem 1.5rem',
      opacity: isDone ? 0.6 : 1,
      transition: 'all 0.3s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div>
          <p className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
            {svcName(appt.service)}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            {svcPrice(appt.service)}
          </p>
        </div>
        <span style={{
          padding: '0.25rem 0.75rem', borderRadius: 999,
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
          whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Date & time — always show */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: isApproved ? '0.875rem' : 0 }}>
        <div>
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.2rem' }}>תאריך</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{formatDate(appt.date)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.2rem' }}>שעה</p>
          <p className="serif" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--amber)' }}>{appt.time}</p>
        </div>
      </div>

      {/* Confirmed banner */}
      {isApproved && (
        <div style={{
          marginTop: '0.5rem',
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
          borderRadius: 8, padding: '0.625rem 0.875rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>✓</span>
          <p style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>
            {appt.status === 'completed' ? 'הטיפול הושלם — תודה שבאת!' :
             appt.status === 'in_progress' ? 'הטיפול מתבצע עכשיו' :
             'התור אושר — נשמח לראותך!'}
          </p>
        </div>
      )}

      {isCancellable(appt) && (
        <div style={{ marginTop: '0.625rem', textAlign: 'center' }}>
          <Link href={`/cancel/${appt.cancel_token}`} style={{ fontSize: '0.78rem', color: '#991b1b', textDecoration: 'underline' }}>
            בטל תור
          </Link>
        </div>
      )}
    </div>
  );
}

function LoyaltyCard({ appointments }: { appointments: Appointment[] }) {
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const progress = completedCount % LOYALTY_THRESHOLD;
  const rewardReady = completedCount > 0 && progress === 0;
  const remaining = LOYALTY_THRESHOLD - progress;
  const stampsFilled = rewardReady ? LOYALTY_THRESHOLD : progress;

  if (completedCount === 0) return null;

  return (
    <div
      className={`glass-card-amber animate-fade-up${rewardReady ? ' animate-pulse-gold' : ''}`}
      style={{ padding: '1.5rem', marginBottom: '2rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.125rem' }}>
        <div>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 700, marginBottom: '0.25rem' }}>
            מועדון הלקוחות
          </p>
          <p className="serif" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)' }}>
            {rewardReady ? `🎉 מגיע לך ${LOYALTY_REWARD_LABEL}!` : `עוד ${remaining} ביקורים ל${LOYALTY_REWARD_LABEL}`}
          </p>
        </div>
        <span style={{ fontSize: '1.75rem', flexShrink: 0 }}>{rewardReady ? '🎁' : '✂️'}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {Array.from({ length: LOYALTY_THRESHOLD }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.95rem',
              background: i < stampsFilled ? 'linear-gradient(135deg, var(--amber-dark), var(--amber-light))' : 'rgba(157,78,221,0.06)',
              border: i < stampsFilled ? '1.5px solid var(--amber)' : '1.5px dashed rgba(157,78,221,0.30)',
              color: i < stampsFilled ? '#fff' : 'var(--text-dim)',
              boxShadow: i < stampsFilled ? 'var(--shadow-amber)' : 'none',
              transition: 'var(--transition)',
            }}
          >
            {i < stampsFilled ? '✂️' : i + 1}
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        {rewardReady
          ? 'הציגו את המסך הזה לספר בתור הבא לקבלת המתנה'
          : `סה״כ ${completedCount} תספורות הושלמו — כל ${LOYALTY_THRESHOLD} מקנות ${LOYALTY_REWARD_LABEL}`}
      </p>
    </div>
  );
}

function MyAppointmentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPhone = searchParams.get('phone') ?? '';

  const [phone, setPhone] = useState(prefillPhone);
  const [submitted, setSubmitted] = useState(!!prefillPhone);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAppointments = useCallback(async (p: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/my-appointments?phone=${encodeURIComponent(p.trim())}`);
      const json = await res.json();
      if (json.error) { setError(`שגיאה: ${json.error}`); return; }
      setAppointments(json.appointments as Appointment[]);
    } catch (e) {
      setError(`שגיאת רשת: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!submitted || !phone) return;
    fetchAppointments(phone);
    const interval = setInterval(() => fetchAppointments(phone), 30000);
    return () => clearInterval(interval);
  }, [submitted, phone, fetchAppointments]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSubmitted(true);
  }

  // Completed must only appear in history — excluding it from `upcoming` too
  // (in addition to cancelled/rejected) keeps the two lists mutually exclusive.
  const upcoming = appointments.filter(a => !['cancelled','rejected','completed'].includes(a.status));
  const past = appointments.filter(a => ['cancelled','rejected','completed'].includes(a.status));

  return (
    <div className="page-bg min-h-screen px-4 py-10" dir="rtl">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: '2.5rem' }}>
          <button onClick={() => router.push('/')} className="btn-outline" style={{
            marginBottom: '1.5rem', fontSize: '0.8125rem', padding: '0.625rem 1.5rem',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          }}>
            חזרה לדף הבית
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 700, marginBottom: '0.5rem' }}>
            ברבר פרמיום
          </p>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 400, color: 'var(--text)' }}>
            התורים שלי
          </h1>
        </div>

        {/* Phone search */}
        <form onSubmit={handleSearch} className="animate-fade-up" style={{ marginBottom: '2rem' }}>
          <div className="glass-card" style={{ background: '#fff', padding: '1.5rem' }}>
            <label style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '0.625rem' }}>
              מספר טלפון
            </label>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setSubmitted(false); }}
                placeholder="05X-XXXXXXX"
                dir="ltr"
                style={{
                  flex: 1, background: 'rgba(28,25,23,0.04)', border: '1px solid rgba(28,25,23,0.12)',
                  borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
                  fontSize: '1rem', color: 'var(--text)', outline: 'none', direction: 'ltr',
                  fontFamily: 'monospace',
                }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                חפש
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        {submitted && (
          <div className="animate-fade-up">
            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ width: 36, height: 36, margin: '0 auto 0.75rem', border: '2px solid rgba(28,25,23,0.12)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>מחפש תורים...</p>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'center', color: '#991b1b', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            {!loading && !error && appointments.length > 0 && (
              <LoyaltyCard appointments={appointments} />
            )}

            {!loading && !error && appointments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>לא נמצאו תורים למספר זה</p>
                <button className="btn-primary" onClick={() => router.push('/book')} style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
                  קבע תור עכשיו
                </button>
              </div>
            )}

            {!loading && upcoming.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.875rem' }}>
                  תורים פעילים
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
                </div>
              </div>
            )}

            {!loading && past.length > 0 && (
              <div>
                <p style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.875rem' }}>
                  היסטוריה
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {past.map(a => <AppointmentCard key={a.id} appt={a} />)}
                </div>
              </div>
            )}

            {!loading && (
              <button onClick={() => router.push('/')} className="btn-outline" style={{
                width: '100%', marginTop: '2rem', padding: '0.875rem 1.5rem',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}>
                חזרה לדף הבית
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function MyAppointmentsPage() {
  return (
    <Suspense>
      <MyAppointmentsInner />
    </Suspense>
  );
}
