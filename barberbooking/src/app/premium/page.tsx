'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICES } from '@/lib/services';
import { SHOP_NAME } from '@/lib/siteConfig';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const WEEKDAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

function formatDate(d: string) {
  const [, m, day] = d.split('-');
  const weekday = WEEKDAYS[new Date(`${d}T12:00:00`).getDay()];
  return `יום ${weekday}, ${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}

function svcName(id: string) {
  return SERVICES.find(s => s.id === id)?.name ?? id;
}

type PremiumSlot = {
  id: string;
  date: string;
  time: string;
  service: string;
  premium_price: number;
  barber_id: string | null;
  barbers?: { name: string } | null;
};

function PremiumCard({ slot, onBooked }: { slot: PremiumSlot; onBooked: () => void }) {
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  async function submit() {
    if (!name.trim() || !phone.trim()) {
      setError('נא למלא שם וטלפון');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/premium-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slot.id, name, phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'הקביעה נכשלה');
        if (res.status === 409) setTimeout(onBooked, 1200);
        return;
      }
      setDone(true);
      setTimeout(onBooked, 1400);
    } catch {
      setError('הקביעה נכשלה — נסה שוב');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', border: '1.5px solid rgba(212,175,55,0.45)' }}>
        <p style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✓</p>
        <p style={{ fontWeight: 700, color: 'var(--text)' }}>התור הפרמיום שלך נקבע!</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>הספר יקבל הודעה ויחכה לך</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem', border: '1.5px solid rgba(212,175,55,0.35)', boxShadow: '0 0 26px rgba(212,175,55,0.10)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8932E', fontWeight: 700, marginBottom: '0.3rem' }}>
            ⭐ {slot.barbers?.name ?? 'ספר'}
          </p>
          <p className="serif" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)' }}>{svcName(slot.service)}</p>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#B8932E' }}>₪{slot.premium_price}</span>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.125rem' }}>
        <div>
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.2rem' }}>תאריך</p>
          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{formatDate(slot.date)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.2rem' }}>שעה</p>
          <p className="serif" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#B8932E' }}>{slot.time}</p>
        </div>
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg,#B8932E,#D4AF37)',
          border: 'none', borderRadius: 'var(--radius)', color: '#1a1305', fontWeight: 700,
          fontSize: '0.85rem', cursor: 'pointer',
        }}>
          ⭐ קבע תור פרמיום
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <input
            placeholder="שם מלא" value={name} onChange={e => setName(e.target.value)}
            style={{ background: 'rgba(28,25,23,0.04)', border: '1px solid rgba(28,25,23,0.12)', borderRadius: 'var(--radius)', padding: '0.7rem 0.875rem', fontSize: '0.9rem', color: 'var(--text)', outline: 'none' }}
          />
          <input
            type="tel" placeholder="050-1234567" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr"
            style={{ background: 'rgba(28,25,23,0.04)', border: '1px solid rgba(28,25,23,0.12)', borderRadius: 'var(--radius)', padding: '0.7rem 0.875rem', fontSize: '0.9rem', color: 'var(--text)', outline: 'none', fontFamily: 'monospace', direction: 'ltr' }}
          />
          {error && <p style={{ color: '#991b1b', fontSize: '0.78rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={submit} disabled={submitting} style={{
              flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg,#B8932E,#D4AF37)',
              border: 'none', borderRadius: 'var(--radius)', color: '#1a1305', fontWeight: 700, fontSize: '0.85rem',
              cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1,
            }}>
              {submitting ? 'קובע...' : 'אישור'}
            </button>
            <button onClick={() => setOpen(false)} style={{
              padding: '0.75rem 1rem', background: 'transparent', border: '1px solid rgba(28,25,23,0.12)',
              borderRadius: 'var(--radius)', color: 'var(--text-dim)', fontSize: '0.85rem', cursor: 'pointer',
            }}>
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PremiumPage() {
  const router = useRouter();
  const [slots, setSlots]     = useState<PremiumSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSlots = useCallback(async () => {
    try {
      const res = await fetch('/api/premium-slots');
      if (res.ok) {
        const json = await res.json();
        setSlots(json.slots ?? []);
      }
    } catch {
      // Network blip — keep showing the last known list instead of clearing it.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
    const id = setInterval(loadSlots, 30000);
    return () => clearInterval(id);
  }, [loadSlots]);

  return (
    <div className="page-bg min-h-screen px-4 py-10" dir="rtl">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
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
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B8932E', fontWeight: 700, marginBottom: '0.5rem' }}>
            ⭐ {SHOP_NAME}
          </p>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 400, color: 'var(--text)' }}>
            תורי פרמיום
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            תורים מיוחדים שהספרים פותחים בעצמם — חוויה משודרגת במחיר שנקבע מיוחד
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ width: 36, height: 36, margin: '0 auto 0.75rem', border: '2px solid rgba(212,175,55,0.2)', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'premium-spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>טוען תורי פרמיום...</p>
          </div>
        )}

        {!loading && slots.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⭐</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>אין כרגע תורי פרמיום פתוחים</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.25rem' }}>בדוק שוב בקרוב — ספרים פותחים תורי פרמיום חדשים מעת לעת</p>
            <button className="btn-primary" onClick={() => router.push('/book')} style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
              קבע תור רגיל עכשיו
            </button>
          </div>
        )}

        {!loading && slots.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {slots.map(slot => (
              <PremiumCard key={slot.id} slot={slot} onBooked={loadSlots} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes premium-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
