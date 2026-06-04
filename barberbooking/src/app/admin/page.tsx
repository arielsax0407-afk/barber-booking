'use client';

import { useEffect, useState } from 'react';
import { supabase, Appointment } from '@/lib/supabase';
import { SERVICES } from '@/lib/services';
import { LogOut, Phone, MessageCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'ממתין לאישור', color: '#f59e0b' },
  approved: { label: 'מאושר', color: '#22c55e' },
  rejected: { label: 'נדחה', color: '#ef4444' },
};

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function groupByDate(appts: Appointment[]) {
  return appts.reduce<Record<string, Appointment[]>>((acc, a) => {
    (acc[a.date] = acc[a.date] || []).push(a);
    return acc;
  }, {});
}

function buildWhatsAppMessage(a: Appointment) {
  const svc = SERVICES.find((s) => s.id === a.service)?.name ?? a.service;
  const msg = `שלום ${a.name}! התור שלך לשירות "${svc}" בתאריך ${formatDate(a.date)} בשעה ${a.time} אושר. מחכים לך! ✂️`;
  const phone = a.phone.replace(/\D/g, '');
  const intlPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  async function login() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      loadAppointments();
    } else {
      setAuthError('סיסמה שגויה');
    }
  }

  async function loadAppointments() {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    setAppointments((data as Appointment[]) ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    await fetch('/api/admin/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  }

  useEffect(() => {
    if (authed) {
      const channel = supabase
        .channel('appointments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
          loadAppointments();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [authed]);

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-1 gold">פאנל ניהול</h1>
          <p className="text-gray-400 text-sm mb-6">הזן סיסמת ספר</p>
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            className="mb-3"
          />
          {authError && <p className="text-red-400 text-sm mb-3">{authError}</p>}
          <button className="btn-gold w-full" onClick={login}>כניסה</button>
        </div>
      </main>
    );
  }

  const displayed = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);
  const grouped = groupByDate(displayed);
  const dates = Object.keys(grouped).sort();

  return (
    <main className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold gold">פאנל ניהול</h1>
        <button onClick={() => setAuthed(false)} className="text-gray-400 hover:text-white">
          <LogOut size={20} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f ? 'bg-gold text-black' : 'text-gray-400 border border-gray-700'
            }`}
          >
            {f === 'all' ? 'הכל' : STATUS_LABELS[f].label}
            {f !== 'all' && (
              <span className="mr-1 text-xs opacity-70">
                ({appointments.filter((a) => a.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">טוען...</p>
      ) : dates.length === 0 ? (
        <p className="text-center text-gray-500 py-12">אין תורים להצגה</p>
      ) : (
        dates.map((date) => (
          <div key={date} className="mb-6">
            <h2 className="text-sm font-bold text-gray-400 mb-3 border-b pb-2" style={{ borderColor: 'var(--dark-border)' }}>
              📅 {formatDate(date)}
            </h2>
            <div className="flex flex-col gap-3">
              {grouped[date].map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onUpdate={updateStatus}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </main>
  );
}

function AppointmentCard({
  appointment: a,
  onUpdate,
}: {
  appointment: Appointment;
  onUpdate: (id: string, status: 'approved' | 'rejected' | 'pending') => void;
}) {
  const svc = SERVICES.find((s) => s.id === a.service)?.name ?? a.service;
  const st = STATUS_LABELS[a.status];

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-lg">{a.name}</p>
          <p className="text-gray-400 text-sm flex items-center gap-1">
            <Phone size={12} /> {a.phone}
          </p>
        </div>
        <div className="text-left">
          <p className="font-bold gold">{a.time}</p>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: st.color + '22', color: st.color }}>
            {st.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-3">✂️ {svc}</p>

      {a.status === 'pending' && (
        <div className="flex gap-2">
          <a
            href={buildWhatsAppMessage(a)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onUpdate(a.id, 'approved')}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-medium text-sm"
            style={{ background: '#1a2e1a', border: '1px solid #22c55e', color: '#22c55e' }}
          >
            <MessageCircle size={14} /> אשר + WhatsApp
          </a>
          <button
            onClick={() => onUpdate(a.id, 'rejected')}
            className="flex-1 py-2 rounded-lg font-medium text-sm"
            style={{ background: '#2e1a1a', border: '1px solid #ef4444', color: '#ef4444' }}
          >
            דחה
          </button>
        </div>
      )}

      {a.status === 'approved' && (
        <a
          href={buildWhatsAppMessage(a)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2 rounded-lg text-sm w-full"
          style={{ background: '#1a2e1a', border: '1px solid #22c55e', color: '#22c55e' }}
        >
          <MessageCircle size={14} /> שלח הודעת WhatsApp
        </a>
      )}

      {a.status === 'rejected' && (
        <button
          onClick={() => onUpdate(a.id, 'pending')}
          className="w-full py-2 rounded-lg text-sm text-gray-400 border border-gray-700"
        >
          שחזר לממתין
        </button>
      )}
    </div>
  );
}
