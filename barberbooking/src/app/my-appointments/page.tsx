'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SERVICES } from '@/lib/services';
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
    // normalize: strip dashes and spaces so "050-123" matches "050123"
    const normalized = p.replace(/[-\s]/g, '');
    const { data, error: err } = await supabase
      .from('appointments')
      .select('*')
      .or(`phone.eq.${p},phone.eq.${normalized}`)
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    setLoading(false);
    if (err) {
      console.error('[my-appointments] error:', JSON.stringify(err));
      setError(`שגיאה (${err.code}): ${err.message}`);
      return;
    }
    setAppointments((data ?? []) as Appointment[]);
  }, []);

  useEffect(() => {
    if (!submitted || !phone) return;
    fetchAppointments(phone);

    const channel = supabase
      .channel(`my-appts-${phone}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (payload) => {
        const updated = payload.new as Appointment;
        setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [submitted, phone, fetchAppointments]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSubmitted(true);
  }

  const upcoming = appointments.filter(a => !['cancelled','rejected'].includes(a.status));
  const past = appointments.filter(a => ['cancelled','rejected','completed'].includes(a.status));

  return (
    <div className="page-bg min-h-screen px-4 py-10" dir="rtl">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: '2.5rem' }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.375rem', padding: 0,
          }}>
            ← חזרה לדף הבית
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
