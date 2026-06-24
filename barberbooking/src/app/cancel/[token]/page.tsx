'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SERVICES } from '@/lib/services';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatDate(d: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}

function svcName(id: string) {
  return SERVICES.find(s => s.id === id)?.name ?? id;
}

type CancelAppt = {
  name: string;
  service: string;
  date: string;
  time: string;
  status: string;
  barber_name: string | null;
};

export default function CancelPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [appt, setAppt] = useState<CancelAppt | null>(null);
  const [cancellable, setCancellable] = useState(false);
  const [alreadyCancelled, setAlreadyCancelled] = useState(false);
  const [tooLate, setTooLate] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cancel?token=${encodeURIComponent(token)}`);
      if (!res.ok) { setNotFound(true); return; }
      const json = await res.json();
      setAppt(json.appointment);
      setCancellable(json.cancellable);
      setAlreadyCancelled(json.alreadyCancelled);
      setTooLate(json.tooLate);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function confirmCancel() {
    setCancelling(true);
    setError('');
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'הביטול נכשל — נסה שוב');
        if (json.alreadyCancelled) setAlreadyCancelled(true);
        return;
      }
      setDone(true);
    } catch {
      setError('שגיאת תקשורת — בדוק את החיבור לאינטרנט ונסה שוב');
    } finally {
      setCancelling(false);
    }
  }

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
  if (notFound || !appt) return (
    <div className="page-bg min-h-screen flex items-center justify-center px-6">
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</p>
        <h2 className="serif" style={{ fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.75rem' }}>התור לא נמצא</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>הקישור אינו תקין, או שהתור הוסר.</p>
        <button className="btn-primary" onClick={() => router.push('/')} style={{ width: '100%' }}>לדף הבית</button>
      </div>
    </div>
  );

  /* ── Main ────────────────────────────────────────── */
  return (
    <div className="page-bg min-h-screen px-4 py-10" dir="rtl">
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 700, marginBottom: '0.5rem' }}>
            ברבר פרמיום
          </p>
          <h1 className="serif" style={{ fontSize: '1.75rem', fontWeight: 400, color: 'var(--text)' }}>
            ביטול תור
          </h1>
        </div>

        <div className="glass-card p-6 mb-6" style={{ background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            ['ספר', appt.barber_name ?? '—'],
            ['שירות', svcName(appt.service)],
            ['תאריך', formatDate(appt.date)],
            ['שעה', appt.time],
            ['שם', appt.name],
          ].map(([l, v], i) => (
            <div key={l}>
              {i > 0 && <div className="divider" style={{ margin: '0.75rem 0' }} />}
              <div className="flex justify-between items-start" style={{ gap: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>{l}</span>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)', wordBreak: 'break-word', textAlign: 'left', minWidth: 0 }}>{v}</span>
              </div>
            </div>
          ))}
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✓</p>
            <p style={{ fontWeight: 700, color: '#065f46', marginBottom: '1.5rem' }}>התור בוטל בהצלחה</p>
            <button className="btn-primary" onClick={() => router.push('/book')} style={{ width: '100%' }}>קבע תור חדש</button>
          </div>
        ) : alreadyCancelled ? (
          <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(107,114,128,0.07)', border: '1px solid rgba(107,114,128,0.18)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            התור הזה כבר בוטל
          </div>
        ) : tooLate ? (
          <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', color: '#991b1b', fontSize: '0.9rem' }}>
            לא ניתן לבטל תור פחות מ-3 שעות לפני המועד. אנא צרו קשר עם המספרה.
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              לביטול ניתן עד 3 שעות לפני מועד התור
            </p>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.875rem', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <button
              className="btn-primary w-full"
              onClick={confirmCancel}
              disabled={cancelling || !cancellable}
              style={{ width: '100%', background: 'linear-gradient(135deg, #991b1b, #ef4444)', boxShadow: '0 4px 18px rgba(239,68,68,0.34)' }}
            >
              {cancelling ? 'מבטל...' : 'בטל את התור'}
            </button>
          </>
        )}

        <button className="btn-ghost w-full" onClick={() => router.push('/')} style={{ width: '100%', marginTop: '1rem' }}>
          חזרה לדף הבית
        </button>
      </div>
    </div>
  );
}
