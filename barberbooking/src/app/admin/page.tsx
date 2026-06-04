'use client';

import { useEffect, useState } from 'react';
import { supabase, Appointment } from '@/lib/supabase';
import { SERVICES } from '@/lib/services';

const STATUS = {
  pending:  { label: 'ממתין', badge: 'badge-pending' },
  approved: { label: 'מאושר', badge: 'badge-approved' },
  rejected: { label: 'נדחה',  badge: 'badge-rejected' },
} as const;

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
}

function groupByDate(appts: Appointment[]) {
  return appts.reduce<Record<string, Appointment[]>>((acc, a) => {
    (acc[a.date] = acc[a.date] || []).push(a); return acc;
  }, {});
}

function buildWhatsAppLink(a: Appointment) {
  const svc = SERVICES.find((s) => s.id === a.service)?.name ?? a.service;
  const [y, m, day] = a.date.split('-');
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const dateStr = `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
  const msg = `שלום ${a.name}! 🎉\nהתור שלך אושר:\n✂️ ${svc}\n📅 ${dateStr}\n⏰ ${a.time}\n\nמחכים לך ב-ברבר בודפשט!`;
  const phone = a.phone.replace(/\D/g, '');
  const intlPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  async function login() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setAuthed(true); loadAppointments(); }
    else setAuthError('סיסמה שגויה');
  }

  async function loadAppointments() {
    setLoading(true);
    const { data } = await supabase.from('appointments').select('*')
      .order('date', { ascending: true }).order('time', { ascending: true });
    setAppointments((data as Appointment[]) ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    await fetch('/api/admin/update-status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  }

  useEffect(() => {
    if (!authed) return;
    const ch = supabase.channel('appts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadAppointments)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authed]);

  /* ── Login ─────────────────────────────────────────────── */
  if (!authed) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      background: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.06), transparent 70%), #080808`,
    }}>
      <div className="glass-card animate-fade-up" style={{ width: '100%', maxWidth: 380, padding: '2.5rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="serif gold-gradient" style={{ fontSize: '1.75rem', fontWeight: 400, marginBottom: '0.25rem' }}>
            ברבר בודפשט
          </div>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            פאנל ניהול
          </p>
        </div>

        <div className="divider" />

        <div style={{ marginBottom: '1.25rem' }}>
          <label className="input-label">סיסמת ספר</label>
          <input
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            autoFocus
          />
        </div>

        {authError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>
            {authError}
          </div>
        )}

        <button className="btn-primary" onClick={login} style={{ width: '100%' }}>
          כניסה
        </button>
      </div>
    </div>
  );

  const counts = { all: appointments.length, pending: 0, approved: 0, rejected: 0 };
  appointments.forEach((a) => { counts[a.status as keyof typeof counts]++; });

  const displayed = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);
  const grouped = groupByDate(displayed);
  const dates = Object.keys(grouped).sort();

  /* ── Dashboard ─────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#080808' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(8,8,8,0.9)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        padding: '1rem 1.5rem',
      }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="serif gold-gradient" style={{ fontSize: '1.25rem', lineHeight: 1 }}>ברבר בודפשט</p>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: '0.2rem' }}>לוח ניהול</p>
          </div>
          <button
            className="btn-ghost"
            onClick={() => setAuthed(false)}
            style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            יציאה
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Stats row */}
        <div className="grid gap-3 mb-8 animate-fade-up" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { key: 'pending', label: 'ממתינים', color: '#f59e0b' },
            { key: 'approved', label: 'מאושרים', color: '#22c55e' },
            { key: 'rejected', label: 'נדחו', color: '#ef4444' },
          ].map(({ key, label, color }) => (
            <div key={key} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 400, color, lineHeight: 1 }}>
                {counts[key as keyof typeof counts]}
              </div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: '0.375rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 animate-fade-in overflow-x-auto" style={{ paddingBottom: 4 }}>
          {(['all', 'pending', 'approved', 'rejected'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1.125rem',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: filter === f ? 'linear-gradient(135deg, var(--gold-dim), var(--gold-light))' : 'var(--glass)',
                border: filter === f ? '1px solid var(--gold)' : '1px solid var(--glass-border)',
                color: filter === f ? '#080808' : 'var(--text-muted)',
              }}
            >
              {f === 'all' ? 'הכל' : STATUS[f].label}
              <span style={{ marginRight: 6, opacity: 0.7 }}>({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin-slow 0.8s linear infinite' }} />
          </div>
        ) : dates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-dim)' }}>
            <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '0.5rem' }}>אין תורים</p>
            <p style={{ fontSize: '0.875rem' }}>לא נמצאו תורים בקטגוריה זו</p>
          </div>
        ) : (
          dates.map((date) => (
            <div key={date} className="mb-8 animate-fade-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <p className="serif" style={{ fontSize: '1.25rem', fontWeight: 400 }}>{formatDate(date)}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                    {grouped[date].length} {grouped[date].length === 1 ? 'תור' : 'תורים'}
                  </p>
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              </div>
              <div className="flex flex-col gap-3">
                {grouped[date].map((a) => <AppCard key={a.id} appt={a} onUpdate={updateStatus} />)}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`@keyframes spin-slow { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AppCard({ appt: a, onUpdate }: {
  appt: Appointment;
  onUpdate: (id: string, status: 'approved' | 'rejected' | 'pending') => void;
}) {
  const svc = SERVICES.find((s) => s.id === a.service)?.name ?? a.service;
  const st = STATUS[a.status];

  return (
    <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
      {/* Top row */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.2rem' }}>{a.name}</p>
          <a
            href={`tel:${a.phone}`}
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.7 19.79 19.79 0 01.01 3.1 2 2 0 012 .92h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            {a.phone}
          </a>
        </div>
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <p className="serif gold" style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: 1 }}>{a.time}</p>
          <span className={`badge ${st.badge}`}>{st.label}</span>
        </div>
      </div>

      {/* Service */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1rem' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{svc}</span>
      </div>

      {/* Actions */}
      {a.status === 'pending' && (
        <div className="flex gap-2">
          <a
            href={buildWhatsAppLink(a)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onUpdate(a.id, 'approved')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '0.625rem', borderRadius: 'var(--radius)',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              color: '#22c55e', fontSize: '0.8rem', fontWeight: 500,
              letterSpacing: '0.05em', textDecoration: 'none', cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            אשר + שלח
          </a>
          <button
            onClick={() => onUpdate(a.id, 'rejected')}
            style={{
              flex: 1, padding: '0.625rem', borderRadius: 'var(--radius)',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            דחה
          </button>
        </div>
      )}

      {a.status === 'approved' && (
        <div className="flex gap-2">
          <a
            href={buildWhatsAppLink(a)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '0.625rem', borderRadius: 'var(--radius)',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
              color: '#22c55e', fontSize: '0.8rem', textDecoration: 'none',
            }}
          >
            שלח הודעת WhatsApp
          </a>
          <button
            onClick={() => onUpdate(a.id, 'rejected')}
            style={{
              padding: '0.625rem 1rem', borderRadius: 'var(--radius)',
              background: 'var(--glass)', border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            בטל
          </button>
        </div>
      )}

      {a.status === 'rejected' && (
        <button
          onClick={() => onUpdate(a.id, 'pending')}
          style={{
            width: '100%', padding: '0.625rem', borderRadius: 'var(--radius)',
            background: 'var(--glass)', border: '1px solid var(--glass-border)',
            color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          שחזר לממתין
        </button>
      )}
    </div>
  );
}
