'use client';

import { useState, useEffect, useCallback } from 'react';
import { SERVICES, TIME_SLOTS } from '@/lib/services';
import { DEFAULT_WA_TEMPLATES } from '@/lib/waTemplates';
import { fillTemplate, waLink } from '@/lib/waLink';

// ── Design tokens ─────────────────────────────────────────────
const G    = 'var(--adm-g)';
const GL   = 'var(--adm-gl)';
const GD   = 'var(--adm-gd)';
const GG   = 'var(--adm-gg)';
const B0   = 'var(--adm-b0)';
const B1   = 'var(--adm-b1)';
const B2   = 'var(--adm-b2)';
const B3   = 'var(--adm-b3)';
const T    = 'var(--adm-t)';
const TM   = 'var(--adm-tm)';
const TD   = 'var(--adm-td)';
const BDR  = 'var(--adm-bdr)';
const BDRG = 'var(--adm-bdrg)';
const R    = 12;
const RL   = 18;

const PRICE_MAP: Record<string, number> = {
  haircut: 60, beard: 40, 'haircut-beard': 90, kids: 40, fade: 70,
};

const S_CFG = {
  pending:     { label: 'ממתין',  color: '#f59e0b', bg: 'rgba(245,158,11,0.14)',  bdr: 'rgba(245,158,11,0.30)'  },
  approved:    { label: 'מאושר',  color: '#22c55e', bg: 'rgba(34,197,94,0.14)',   bdr: 'rgba(34,197,94,0.30)'   },
  rejected:    { label: 'נדחה',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   bdr: 'rgba(239,68,68,0.25)'   },
  in_progress: { label: 'בטיפול', color: '#3b82f6', bg: 'rgba(59,130,246,0.14)', bdr: 'rgba(59,130,246,0.28)'  },
  completed:   { label: 'הושלם', color: '#10b981', bg: 'rgba(16,185,129,0.12)',  bdr: 'rgba(16,185,129,0.25)'  },
  cancelled:   { label: 'בוטל',  color: '#6b7280', bg: 'rgba(107,114,128,0.10)',bdr: 'rgba(107,114,128,0.22)' },
} as const;

const STATUS_LABELS: Record<string, string> = {
  approved: 'מאושר', completed: 'הושלם', cancelled: 'בוטל',
  pending: 'ממתין', in_progress: 'בטיפול', rejected: 'נדחה',
};
const SVC_LABELS: Record<string, string> = {
  haircut: 'תספורת', beard: 'עיצוב זקן', 'haircut-beard': 'תספורת + זקן',
  kids: 'תספורת ילדים', fade: 'פייד',
};

const MONTHS     = ['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ'];

type Appointment = {
  id: string; name: string; phone: string; service: string;
  date: string; time: string; status: string; created_at: string;
  barber_id?: string | null;
  barbers?: { name: string; specialty: string | null } | null;
  is_premium?: boolean; premium_price?: number | null;
};
type Barber = {
  id: string; name: string; specialty: string | null;
  image_url: string | null; is_active: boolean; email?: string | null;
};
type BlockedSlot = {
  id: string; barber_id: string | null; blocked_date: string;
  blocked_time: string; reason: string | null;
  barbers?: { name: string } | null;
};

function svcName(id: string) { return SERVICES.find(s => s.id === id)?.name ?? id; }
function apptPrice(a: { service: string; is_premium?: boolean; premium_price?: number | null }): number {
  return a.is_premium && a.premium_price ? a.premium_price : (PRICE_MAP[a.service] ?? 0);
}
function getToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function fmtDate(d: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}

function getWeekDays(ref: string): string[] {
  const d   = new Date(ref + 'T12:00:00');
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(sun);
    dt.setDate(sun.getDate() + i);
    return dt.toISOString().split('T')[0];
  });
}

function normTime(t: string) { return t ? t.slice(0, 5) : t; }

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getPrevMonthPrefix(todayStr: string): string {
  const d = new Date(todayStr + 'T12:00:00');
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function pctChange(curr: number, prev: number): number {
  if (prev > 0) return Math.round(((curr - prev) / prev) * 100);
  return curr > 0 ? 100 : 0;
}

// Same 3-month cap as /api/book-recurring (which clamps server-side too) —
// this just keeps the manager's date picker from offering an out-of-range date.
function maxRecurringEnd(start: string) {
  const d = new Date(`${start}T12:00:00`);
  d.setMonth(d.getMonth() + 3);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const RECURRING_SKIP_LABELS: Record<string, string> = {
  taken: 'כבר תפוס',
  saturday: 'שבת',
  past: 'תאריך עבר',
};

function cancelWaLink(a: { name: string; phone: string; service: string; date: string; time: string; is_premium?: boolean; premium_price?: number | null }): string {
  const msg = fillTemplate(DEFAULT_WA_TEMPLATES.cancel, {
    name: a.name, service: svcName(a.service), date: fmtDate(a.date), time: a.time, price: apptPrice(a),
  });
  return waLink(a.phone, msg);
}

// ── Revenue bar chart ─────────────────────────────────────────
function BarChart({ barbers, appointments }: { barbers: Barber[]; appointments: Appointment[] }) {
  const today     = getToday();
  const monthPfx  = today.slice(0, 7);
  const data = barbers.map(b => {
    const rev = appointments
      .filter(a => a.barber_id === b.id && a.date.startsWith(monthPfx) && ['approved','completed'].includes(a.status))
      .reduce((s, a) => s + apptPrice(a), 0);
    return { name: b.name, revenue: rev };
  });
  const max = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.875rem', height: 100, padding: '0 0.25rem' }}>
      {data.map(d => (
        <div key={d.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.65rem', color: G, fontWeight: 600 }}>₪{d.revenue}</span>
          <div style={{
            width: '100%',
            background: d.revenue > 0 ? `linear-gradient(180deg,${GL},${GD})` : B3,
            borderRadius: '4px 4px 0 0',
            height: `${Math.max(4, (d.revenue / max) * 72)}px`,
            transition: 'height 0.8s ease',
            border: `1px solid ${d.revenue > 0 ? BDRG : BDR}`,
          }} />
          <span style={{ fontSize: '0.62rem', color: TD, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60, textAlign: 'center' }}>{d.name}</span>
        </div>
      ))}
    </div>
  );
}

// ── 30-day line chart ─────────────────────────────────────────
function LineChart({ appointments }: { appointments: Appointment[] }) {
  const today = getToday();
  const days  = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const data = days.map(day => ({
    day,
    rev: appointments
      .filter(a => a.date === day && ['approved','completed'].includes(a.status))
      .reduce((s, a) => s + apptPrice(a), 0),
  }));

  const maxRev = Math.max(...data.map(d => d.rev), 1);
  const W = 600; const H = 90; const PAD = 8;

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (d.rev / maxRev) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPath = `M${PAD},${H - PAD} ${pts.join(' ')} ${(W - PAD).toFixed(1)},${H - PAD}Z`;
  const totalRevArr = data.map(d => d.rev);
  const totalRev = totalRevArr.reduce((s, v) => s + v, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: TM }}>30 יום אחרונים</span>
        <span style={{ fontSize: '0.7rem', color: G, fontWeight: 600 }}>סה&quot;כ ₪{totalRev}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 90, display: 'block' }}>
        <defs>
          <linearGradient id="ln-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B266FF" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#B266FF" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#ln-grad)" />
        <polyline points={pts.join(' ')} fill="none" stroke="#B266FF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: '0.6rem', color: TD }}>{fmtDate(days[0])}</span>
        <span style={{ fontSize: '0.6rem', color: TD }}>{fmtDate(days[days.length - 1])}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ManagerPage() {
  const [authed, setAuthed]         = useState(false);
  const [password, setPassword]     = useState('');
  const [authError, setAuthError]   = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers]       = useState<Barber[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading]       = useState(false);
  const [tab, setTab] = useState<'overview' | 'barbers' | 'appointments' | 'blocked'>('overview');
  const [chartMode, setChartMode]   = useState<'bar' | 'line'>('bar');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const t = localStorage.getItem('barber_admin_theme');
      if (t === 'light' || t === 'dark') setTheme(t);
    } catch {}
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('barber_admin_theme', next); } catch {}
  }

  // Appointments tab state
  const [filterBarber, setFilterBarber] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [sortBy, setSortBy]                 = useState<'date' | 'barber' | 'service' | 'revenue'>('date');
  const [sortDir, setSortDir]               = useState<'asc' | 'desc'>('desc');

  // Barbers tab state
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);
  const [togglingBarber, setTogglingBarber] = useState<string | null>(null);

  // Blocked-slots tab: new-block form state
  const [newBlockBarber, setNewBlockBarber] = useState('all');
  const [newBlockMode, setNewBlockMode]     = useState<'day' | 'time'>('day');
  const [newBlockDate, setNewBlockDate]     = useState('');
  const [newBlockTime, setNewBlockTime]     = useState(TIME_SLOTS[0]);
  const [newBlockReason, setNewBlockReason] = useState('');
  const [addingBlock, setAddingBlock]       = useState(false);
  const [addBlockError, setAddBlockError]   = useState('');

  // Day-block-with-cancel modal (block a whole day + auto-cancel its appointments)
  const [dayBlockModalOpen, setDayBlockModalOpen] = useState(false);
  const [dbBarberId, setDbBarberId]   = useState('all');
  const [dbDate, setDbDate]           = useState('');
  const [dbStep, setDbStep]           = useState<'pick' | 'warn' | 'result'>('pick');
  const [dbAffected, setDbAffected]   = useState<Appointment[]>([]);
  const [dbSubmitting, setDbSubmitting] = useState(false);
  const [dbError, setDbError]         = useState('');

  // Recurring-appointment modal (manager creates on a customer's behalf)
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [rcBarberId, setRcBarberId]     = useState('');
  const [rcService, setRcService]       = useState(SERVICES[0].id);
  const [rcName, setRcName]             = useState('');
  const [rcPhone, setRcPhone]           = useState('');
  const [rcStartDate, setRcStartDate]   = useState('');
  const [rcTime, setRcTime]             = useState(TIME_SLOTS[0]);
  const [rcFrequency, setRcFrequency]   = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [rcEndDate, setRcEndDate]       = useState('');
  const [rcSubmitting, setRcSubmitting] = useState(false);
  const [rcError, setRcError]           = useState('');
  const [rcResult, setRcResult] = useState<{ booked: number; skipped: { date: string; reason: string }[] } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/manager/data');
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.appointments ?? []);
        setBarbers(json.barbers ?? []);
        setBlockedSlots(json.blocked_slots ?? []);
      }
    } catch {
      // Network blip — keep showing the last known data instead of clearing it.
    } finally {
      setLoading(false);
    }
  }, []);

  async function login() {
    setAuthError('');
    const res = await fetch('/api/admin/manager-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (res.ok) { setAuthed(true); loadData(); }
    else setAuthError(json.error || 'סיסמה שגויה');
  }

  async function cancelAppointment(id: string) {
    try {
      const res = await fetch('/api/admin/manager/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    } catch {
      alert('ביטול התור נכשל — נסה שוב 😕');
    }
  }

  async function toggleBarber(id: string, newActive: boolean) {
    setTogglingBarber(id);
    try {
      const res = await fetch('/api/admin/manager/toggle-barber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: newActive }),
      });
      if (!res.ok) throw new Error();
      setBarbers(prev => prev.map(b => b.id === id ? { ...b, is_active: newActive } : b));
    } catch {
      alert('עדכון סטטוס הספר נכשל — נסה שוב 😕');
    } finally {
      setTogglingBarber(null);
    }
  }

  async function unblockSlot(id: string) {
    try {
      const res = await fetch('/api/admin/manager/blocked-slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setBlockedSlots(prev => prev.filter(b => b.id !== id));
    } catch {
      alert('ביטול החסימה נכשל — נסה שוב 😕');
    }
  }

  async function addBlock() {
    if (!newBlockDate) { setAddBlockError('בחר תאריך'); return; }
    setAddingBlock(true);
    setAddBlockError('');
    const res = await fetch('/api/admin/manager/blocked-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newBlockDate,
        time: newBlockMode === 'time' ? newBlockTime : undefined,
        barber_id: newBlockBarber === 'all' ? null : newBlockBarber,
        reason: newBlockReason.trim() || null,
      }),
    });
    setAddingBlock(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setAddBlockError(j.error || 'שגיאה בחסימה');
      return;
    }
    setNewBlockDate('');
    setNewBlockReason('');
    await loadData();
  }

  function openDayBlockModal() {
    setDbBarberId('all');
    setDbDate('');
    setDbStep('pick');
    setDbAffected([]);
    setDbError('');
    setDayBlockModalOpen(true);
  }

  function checkDayBlockImpact() {
    if (!dbDate) { setDbError('בחר תאריך'); return; }
    setDbError('');
    const affected = appointments.filter(a =>
      a.date === dbDate &&
      (dbBarberId === 'all' || a.barber_id === dbBarberId) &&
      !['cancelled', 'rejected', 'completed'].includes(a.status)
    );
    setDbAffected(affected);
    setDbStep('warn');
  }

  async function confirmDayBlock() {
    setDbSubmitting(true);
    setDbError('');
    try {
      if (dbAffected.length > 0) {
        const cancelRes = await fetch('/api/admin/manager/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: dbAffected.map(a => a.id) }),
        });
        if (!cancelRes.ok) throw new Error();
      }

      const blockRes = await fetch('/api/admin/manager/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dbDate,
          barber_id: dbBarberId === 'all' ? null : dbBarberId,
          reason: 'יום חסום ע"י מנהל',
        }),
      });
      if (!blockRes.ok) throw new Error();

      setDbStep('result');
      await loadData();
    } catch {
      setDbError('הפעולה נכשלה — נסה שוב');
    } finally {
      setDbSubmitting(false);
    }
  }

  function openRecurringModal() {
    setRcBarberId(barbers.find(b => b.is_active)?.id ?? '');
    setRcService(SERVICES[0].id);
    setRcName('');
    setRcPhone('');
    setRcStartDate(getToday());
    setRcTime(TIME_SLOTS[0]);
    setRcFrequency('weekly');
    setRcEndDate('');
    setRcError('');
    setRcResult(null);
    setRecurringModalOpen(true);
  }

  async function submitRecurring() {
    if (!rcName.trim() || !rcPhone.trim()) { setRcError('נא למלא שם וטלפון'); return; }
    if (!rcEndDate) { setRcError('בחר תאריך סיום'); return; }
    setRcSubmitting(true);
    setRcError('');
    try {
      const res = await fetch('/api/book-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rcName, phone: rcPhone, service: rcService,
          barber_id: rcBarberId || null, time: rcTime,
          startDate: rcStartDate, frequency: rcFrequency, endDate: rcEndDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setRcError(json.error || 'שגיאה בקביעת התור הקבוע'); return; }
      setRcResult({ booked: json.booked, skipped: json.skipped ?? [] });
      await loadData();
    } catch {
      setRcError('שגיאת תקשורת — נסה שוב');
    } finally {
      setRcSubmitting(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/manager-login', { method: 'DELETE' });
    setAuthed(false);
    setPassword('');
  }

  function exportCSV() {
    const header = ['תאריך','שעה','שם לקוח','טלפון','שירות','ספר','סטטוס','הכנסה'];
    const rows = filteredSorted.map(a => {
      const bName = barbers.find(b => b.id === a.barber_id)?.name ?? '—';
      return [
        a.date, a.time, a.name, a.phone,
        (a.is_premium ? '⭐ ' : '') + (SVC_LABELS[a.service] || a.service),
        bName,
        STATUS_LABELS[a.status] || a.status,
        apptPrice(a),
      ].map(v => `"${v}"`).join(',');
    });
    const csv  = '﻿' + header.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `appointments-${getToday()}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!authed) return;
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [authed, loadData]);

  /* ── Login ───────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${GG} 0%, transparent 70%), ${B0}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BDR}`, borderRadius: RL, padding: '2.5rem', backdropFilter: 'blur(20px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/images/logo.png" alt="" style={{ width: 64, height: 64, margin: '0 auto 0.875rem', borderRadius: '50%', display: 'block', boxShadow: `0 0 24px ${GG}` }} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: T }}>פאנל מנהל 👑</p>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: G, marginTop: '0.25rem' }}>לצפייה בנתוני כלל הספרים</p>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${BDR},transparent)`, marginBottom: '1.5rem' }} />
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>סיסמת מנהל</label>
            <input
              type="password" placeholder="••••••••" value={password} autoFocus
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: R, padding: '0.875rem 1rem', color: T, fontSize: '1rem', outline: 'none', direction: 'rtl', boxSizing: 'border-box' }}
            />
          </div>
          {authError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>
              {authError}
            </div>
          )}
          <button onClick={login} style={{ width: '100%', padding: '0.875rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 4px 16px ${GG}` }}>
            כניסה
          </button>
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: TD }}>
            <a href="/admin" style={{ color: G, textDecoration: 'none' }}>פאנל ראשי</a>
            {' · '}
            <a href="/admin/barber" style={{ color: G, textDecoration: 'none' }}>פאנל ספר</a>
          </p>
        </div>
      </div>
    );
  }

  /* ── Dashboard ────────────────────────────────────────────── */
  const today        = getToday();
  const monthPfx     = today.slice(0, 7);
  const weekDays     = getWeekDays(today);

  const todayAppts   = appointments.filter(a => a.date === today);
  const weekAppts    = appointments.filter(a => weekDays.includes(a.date));
  const monthAppts   = appointments.filter(a => a.date.startsWith(monthPfx));

  const active       = (arr: Appointment[]) => arr.filter(a => ['approved','completed'].includes(a.status));
  const totalRev     = (arr: Appointment[]) => active(arr).reduce((s, a) => s + apptPrice(a), 0);

  const todayRev     = totalRev(todayAppts);
  const weekRev      = totalRev(weekAppts);
  const monthRev     = totalRev(monthAppts);
  const monthApptCnt = monthAppts.filter(a => a.status !== 'cancelled').length;

  // Best barber this month by revenue
  const barberMonthRev = barbers.map(b => ({
    b,
    rev: totalRev(monthAppts.filter(a => a.barber_id === b.id)),
  })).sort((a, b) => b.rev - a.rev);
  const bestBarber = barberMonthRev[0];

  // ── Extended KPIs: run-rate, period-over-period change, utilization, cancellations ──
  const prevWeekDays  = weekDays.map(d => shiftDate(d, -7));
  const prevWeekAppts = appointments.filter(a => prevWeekDays.includes(a.date));
  const prevWeekRev   = totalRev(prevWeekAppts);
  const weekChangePct = pctChange(weekRev, prevWeekRev);

  const prevMonthPfx   = getPrevMonthPrefix(today);
  const prevMonthAppts = appointments.filter(a => a.date.startsWith(prevMonthPfx));
  const prevMonthRev   = totalRev(prevMonthAppts);
  const monthChangePct = pctChange(monthRev, prevMonthRev);

  const dayOfMonth  = parseInt(today.split('-')[2], 10);
  const daysInMonth = new Date(parseInt(today.slice(0, 4), 10), parseInt(today.slice(5, 7), 10), 0).getDate();
  const runRate      = dayOfMonth > 0 ? Math.round((monthRev / dayOfMonth) * daysInMonth) : 0;

  const activeBarberCount = Math.max(1, barbers.filter(b => b.is_active).length);
  const slotsToday  = TIME_SLOTS.length * activeBarberCount;
  const slotsWeek   = TIME_SLOTS.length * activeBarberCount * 7;
  const utilToday   = Math.round((todayAppts.filter(a => a.status !== 'cancelled').length / slotsToday) * 100);
  const utilWeek    = Math.round((weekAppts.filter(a => a.status !== 'cancelled').length / slotsWeek) * 100);

  const monthCancelled = monthAppts.filter(a => a.status === 'cancelled').length;
  const cancelRateMonth = monthAppts.length > 0 ? Math.round((monthCancelled / monthAppts.length) * 100) : 0;

  // ── Barber leaderboard: revenue, utilization, cancellation rate per barber ──
  const leaderboard = barbers.filter(b => b.is_active).map(b => {
    const bMonthAppts = monthAppts.filter(a => a.barber_id === b.id);
    const bRev        = totalRev(bMonthAppts);
    const bCancelled  = bMonthAppts.filter(a => a.status === 'cancelled').length;
    const bCancelRate = bMonthAppts.length > 0 ? Math.round((bCancelled / bMonthAppts.length) * 100) : 0;
    const bActiveCnt  = active(bMonthAppts).length;
    const bAvgTicket  = bActiveCnt > 0 ? Math.round(bRev / bActiveCnt) : 0;
    const bWeekAppts  = weekAppts.filter(a => a.barber_id === b.id && a.status !== 'cancelled').length;
    const bUtilWeek   = Math.round((bWeekAppts / (TIME_SLOTS.length * 7)) * 100);
    return { barber: b, monthRev: bRev, cancelRate: bCancelRate, avgTicket: bAvgTicket, utilWeek: bUtilWeek, monthApptCnt: bActiveCnt };
  }).sort((a, b) => b.monthRev - a.monthRev);

  // ── Appointments tab: filter + sort ──
  let filtered = appointments;
  if (filterBarber !== 'all') filtered = filtered.filter(a => a.barber_id === filterBarber);
  if (filterDateFrom) filtered = filtered.filter(a => a.date >= filterDateFrom);
  if (filterDateTo)   filtered = filtered.filter(a => a.date <= filterDateTo);
  if (filterStatus !== 'all') filtered = filtered.filter(a => a.status === filterStatus);

  const filteredSorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'date')    cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    if (sortBy === 'barber')  cmp = (a.barbers?.name ?? '').localeCompare(b.barbers?.name ?? '');
    if (sortBy === 'service') cmp = (a.service).localeCompare(b.service);
    if (sortBy === 'revenue') cmp = apptPrice(a) - apptPrice(b);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  // ── Blocked slots: this week ──
  const thisWeekBlocked = blockedSlots.filter(b => weekDays.includes(b.blocked_date));

  const navItems = [
    { id: 'overview'     as const, icon: '▦',  label: 'סקירה'    },
    { id: 'barbers'      as const, icon: '✂️', label: 'ספרים'    },
    { id: 'appointments' as const, icon: '≡',  label: 'תורים'    },
    { id: 'blocked'      as const, icon: '🔒', label: 'חסימות'   },
  ];

  return (
    <div data-admin-theme={theme} style={{ minHeight: '100vh', background: B0, color: T, direction: 'rtl', fontFamily: 'var(--font-body)', transition: 'background 0.25s ease, color 0.25s ease' }}>

      {/* Header */}
      <header style={{ background: B1, borderBottom: `1px solid ${BDR}`, padding: '0.5rem 1rem', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
          <img src="/images/logo.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%', marginInlineEnd: '0.25rem', flexShrink: 0 }} />
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.65rem', borderRadius: R, border: 'none', cursor: 'pointer', background: tab === item.id ? GG : 'transparent', color: tab === item.id ? GL : TM, fontSize: '0.8rem', fontWeight: tab === item.id ? 600 : 400, whiteSpace: 'nowrap' }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.8rem', color: G, fontWeight: 600, whiteSpace: 'nowrap' }}>👑 מנהל</span>
          <button onClick={openRecurringModal}
            style={{ padding: '0.3rem 0.75rem', background: GG, border: `1px solid ${BDRG}`, borderRadius: 8, color: GL, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            צור תור קבוע ⭐
          </button>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
            style={{ padding: '0.3rem 0.6rem', background: B3, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button onClick={logout} style={{ padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>יציאה</button>
        </div>
      </header>

      <main style={{ padding: '1.5rem 1rem', maxWidth: 1040, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* ══ OVERVIEW TAB ════════════════════════════════════ */}
        {tab === 'overview' && (
          <div>
            <div style={{ marginBottom: '1.75rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.25rem' }}>סקירה כללית</p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>לוח מנהל 👑</h1>
            </div>

            {/* 6 KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
              {[
                { label: 'תורים היום',    value: todayAppts.filter(a => a.status !== 'cancelled').length, sub: `₪${todayRev} הכנסות`,   color: G  },
                { label: 'הכנסות היום',   value: `₪${todayRev}`,   sub: `${todayAppts.filter(a => a.status === 'completed').length} הושלמו`, color: GL },
                { label: 'הכנסות השבוע',  value: `₪${weekRev}`,    sub: `${weekAppts.filter(a => a.status !== 'cancelled').length} תורים`,   color: G  },
                { label: 'הכנסות חודש',   value: `₪${monthRev}`,   sub: `${monthApptCnt} תורים`,                                            color: GL },
                { label: 'ספר מוביל',     value: bestBarber?.b.name ?? '—', sub: bestBarber ? `₪${bestBarber.rev} החודש` : 'אין נתונים',   color: G  },
                { label: 'תורים בחודש',   value: monthApptCnt,      sub: `${monthAppts.filter(a => a.status === 'completed').length} הושלמו`, color: GL },
              ].map(k => (
                <div key={k.label} style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1rem 1.125rem' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.4rem' }}>{k.label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 600, color: k.color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</p>
                  <p style={{ fontSize: '0.68rem', color: TD, marginTop: '0.3rem' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Extended KPIs: run-rate, period-over-period change, utilization, cancellations */}
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.625rem' }}>מדדים מתקדמים</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
              {[
                { label: 'קצב חודשי צפוי',  value: `₪${runRate}`,        sub: 'תחזית לפי הקצב הנוכחי',                          color: GL },
                { label: 'שינוי שבועי',     value: `${weekChangePct >= 0 ? '+' : ''}${weekChangePct}%`, sub: `לעומת ₪${prevWeekRev} שבוע שעבר`,  color: weekChangePct >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'שינוי חודשי',     value: `${monthChangePct >= 0 ? '+' : ''}${monthChangePct}%`, sub: `לעומת ₪${prevMonthRev} חודש שעבר`, color: monthChangePct >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'תפוסה היום',      value: `${utilToday}%`,       sub: 'מכל השעות הזמינות',                              color: utilToday >= 60 ? '#22c55e' : G },
                { label: 'תפוסה השבוע',     value: `${utilWeek}%`,        sub: 'מכל השעות הזמינות',                              color: utilWeek >= 60 ? '#22c55e' : G },
                { label: 'שיעור ביטולים',    value: `${cancelRateMonth}%`, sub: `${monthCancelled} מתוך ${monthAppts.length} החודש`, color: cancelRateMonth > 15 ? '#ef4444' : GL },
              ].map(k => (
                <div key={k.label} style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1rem 1.125rem' }}>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.4rem' }}>{k.label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: k.color, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</p>
                  <p style={{ fontSize: '0.65rem', color: TD, marginTop: '0.3rem' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Chart card */}
            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G }}>
                  {chartMode === 'bar' ? 'הכנסות לפי ספר (החודש)' : 'הכנסות יומיות — 30 יום'}
                </p>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={() => setChartMode('bar')}
                    style={{ padding: '0.3rem 0.625rem', borderRadius: 7, border: `1px solid ${chartMode === 'bar' ? BDRG : BDR}`, background: chartMode === 'bar' ? GG : B3, color: chartMode === 'bar' ? GL : TM, fontSize: '0.7rem', cursor: 'pointer' }}>
                    עמודות
                  </button>
                  <button onClick={() => setChartMode('line')}
                    style={{ padding: '0.3rem 0.625rem', borderRadius: 7, border: `1px solid ${chartMode === 'line' ? BDRG : BDR}`, background: chartMode === 'line' ? GG : B3, color: chartMode === 'line' ? GL : TM, fontSize: '0.7rem', cursor: 'pointer' }}>
                    קו
                  </button>
                </div>
              </div>
              {loading ? (
                <p style={{ color: TD, fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>טוען...</p>
              ) : chartMode === 'bar' ? (
                <BarChart barbers={barbers.filter(b => b.is_active)} appointments={appointments} />
              ) : (
                <LineChart appointments={appointments} />
              )}
            </div>

            {/* Leaderboard */}
            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>לוח מנהיגות — החודש</p>
              {leaderboard.length === 0 ? (
                <p style={{ color: TD, fontSize: '0.85rem' }}>אין נתונים</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {leaderboard.map((row, i) => {
                    const medal = ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`;
                    return (
                      <div key={row.barber.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: B1, borderRadius: R, border: `1px solid ${BDR}`, flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <span style={{ fontSize: '1rem' }}>{medal}</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: T }}>{row.barber.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', fontSize: '0.78rem', color: TM }}>
                          <span>{row.monthApptCnt} תורים</span>
                          <span>תפוסה {row.utilWeek}%</span>
                          <span style={{ color: row.cancelRate > 15 ? '#ef4444' : TM }}>ביטולים {row.cancelRate}%</span>
                          <span style={{ fontFamily: 'var(--font-display)', color: G, fontWeight: 600, fontSize: '0.95rem' }}>₪{row.monthRev}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Barber today split */}
            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>תורים היום לפי ספר</p>
              {barbers.filter(b => b.is_active).map(b => {
                const cnt = todayAppts.filter(a => a.barber_id === b.id && a.status !== 'cancelled').length;
                const rev = todayAppts.filter(a => a.barber_id === b.id && ['approved','completed'].includes(a.status)).reduce((s, a) => s + apptPrice(a), 0);
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: `1px solid ${BDR}` }}>
                    <span style={{ fontSize: '0.875rem', color: T, fontWeight: 500 }}>{b.name}</span>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: TM }}>{cnt} תורים</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: cnt > 0 ? G : TD, fontWeight: 600 }}>₪{rev}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ BARBERS TAB ══════════════════════════════════════ */}
        {tab === 'barbers' && (
          <div>
            <div style={{ marginBottom: '1.75rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.25rem' }}>ניהול</p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>הספרים</h1>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 80px 80px', gap: '0.5rem', padding: '0.5rem 1.25rem', marginBottom: '0.5rem' }}>
              {['ספר','השבוע','תפוסה','ביטולים','הכנסות חודש','סטטוס',''].map(h => (
                <span key={h} style={{ fontSize: '0.6rem', color: TD, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            {[...leaderboard.map(r => r.barber), ...barbers.filter(b => !b.is_active)].map((b, idx) => {
              const weekCnt   = weekAppts.filter(a => a.barber_id === b.id && a.status !== 'cancelled').length;
              const monthRevB = totalRev(monthAppts.filter(a => a.barber_id === b.id));
              const bMonthAppts = monthAppts.filter(a => a.barber_id === b.id);
              const bCancelled  = bMonthAppts.filter(a => a.status === 'cancelled').length;
              const bCancelRate = bMonthAppts.length > 0 ? Math.round((bCancelled / bMonthAppts.length) * 100) : 0;
              const bUtilWeek   = Math.round((weekCnt / (TIME_SLOTS.length * 7)) * 100);
              const rank = idx < leaderboard.length ? (['🥇', '🥈', '🥉'][idx] ?? `#${idx + 1}`) : null;
              const upcoming  = appointments
                .filter(a => a.barber_id === b.id && a.date >= today && ['approved','in_progress'].includes(a.status))
                .sort((a, c) => a.date.localeCompare(c.date) || a.time.localeCompare(c.time));
              const isExpanded = expandedBarber === b.id;

              return (
                <div key={b.id} style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, marginBottom: '0.625rem', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedBarber(isExpanded ? null : b.id)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 80px 80px', gap: '0.5rem', padding: '1rem 1.25rem', cursor: 'pointer', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {rank && <span style={{ fontSize: '0.9rem' }}>{rank}</span>}
                      <div>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: T }}>{b.name}</p>
                        {b.specialty && <p style={{ fontSize: '0.7rem', color: TD }}>{b.specialty}</p>}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.9rem', color: TM, fontWeight: 500 }}>{weekCnt}</span>
                    <span style={{ fontSize: '0.9rem', color: bUtilWeek >= 60 ? '#22c55e' : TM, fontWeight: 500 }}>{bUtilWeek}%</span>
                    <span style={{ fontSize: '0.9rem', color: bCancelRate > 15 ? '#ef4444' : TM, fontWeight: 500 }}>{bCancelRate}%</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: G, fontWeight: 600 }}>₪{monthRevB}</span>
                    <span style={{ padding: '0.18rem 0.5rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: b.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)', color: b.is_active ? '#22c55e' : '#6b7280', border: `1px solid ${b.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'}`, textAlign: 'center' }}>
                      {b.is_active ? 'פעיל' : 'לא פעיל'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={e => { e.stopPropagation(); toggleBarber(b.id, !b.is_active); }}
                        disabled={togglingBarber === b.id}
                        style={{ padding: '0.28rem 0.55rem', background: B3, border: `1px solid ${BDR}`, borderRadius: 6, color: TM, fontSize: '0.65rem', cursor: 'pointer' }}>
                        {togglingBarber === b.id ? '...' : b.is_active ? 'השבת' : 'הפעל'}
                      </button>
                      <span style={{ color: TD, fontSize: '0.7rem' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${BDR}`, background: B1, padding: '1rem 1.25rem' }}>
                      <p style={{ fontSize: '0.65rem', color: G, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>תורים קרובים</p>
                      {upcoming.length === 0 ? (
                        <p style={{ color: TD, fontSize: '0.82rem' }}>אין תורים קרובים</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {upcoming.slice(0, 5).map(a => (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.875rem', background: B2, borderRadius: R, border: `1px solid ${BDR}`, alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: T, fontWeight: 500 }}>{a.is_premium && '⭐ '}{a.name}</span>
                              <span style={{ fontSize: '0.78rem', color: TM }}>{svcName(a.service)}</span>
                              <span style={{ fontSize: '0.78rem', color: G }}>{fmtDate(a.date)} {a.time}</span>
                            </div>
                          ))}
                          {upcoming.length > 5 && (
                            <p style={{ color: TD, fontSize: '0.72rem', textAlign: 'center' }}>ועוד {upcoming.length - 5} תורים...</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ APPOINTMENTS TAB ═════════════════════════════════ */}
        {tab === 'appointments' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.25rem' }}>ניהול</p>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>כל התורים</h1>
              </div>
              <button onClick={exportCSV}
                style={{ padding: '0.5rem 1.25rem', background: GG, border: `1px solid ${BDRG}`, borderRadius: R, color: GL, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                ⬇ ייצוא CSV
              </button>
            </div>

            {/* Filters */}
            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}
                style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.45rem 0.75rem', color: T, fontSize: '0.78rem', cursor: 'pointer', direction: 'rtl' }}>
                <option value="all">כל הספרים</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.45rem 0.75rem', color: T, fontSize: '0.78rem', cursor: 'pointer', direction: 'rtl' }}>
                <option value="all">כל הסטטוסים</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.45rem 0.75rem', color: T, fontSize: '0.78rem' }} />
              <span style={{ color: TD, fontSize: '0.8rem' }}>—</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.45rem 0.75rem', color: T, fontSize: '0.78rem' }} />
              {(filterBarber !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
                <button onClick={() => { setFilterBarber('all'); setFilterStatus('all'); setFilterDateFrom(''); setFilterDateTo(''); }}
                  style={{ padding: '0.45rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: R, color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>
                  נקה
                </button>
              )}
              <span style={{ fontSize: '0.72rem', color: TD, marginRight: 'auto' }}>{filteredSorted.length} תורים</span>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ width: 28, height: 28, border: `2px solid ${G}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'mgr-spin 0.8s linear infinite' }} />
              </div>
            ) : filteredSorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: TD }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: TM, marginBottom: '0.4rem' }}>אין תורים</p>
                <p style={{ fontSize: '0.85rem' }}>לא נמצאו תורים לפי הסינון הנוכחי</p>
              </div>
            ) : (
              <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1.2fr 1fr 80px 1fr 60px', gap: '0.5rem', padding: '0.625rem 1rem', borderBottom: `1px solid ${BDR}`, background: B1 }}>
                  {[
                    { label: 'לקוח', col: null },
                    { label: 'שעה',  col: null },
                    { label: 'שירות', col: 'service' as const },
                    { label: 'ספר',   col: 'barber' as const },
                    { label: 'הכנסה', col: 'revenue' as const },
                    { label: 'תאריך', col: 'date' as const },
                    { label: 'סטטוס', col: null },
                  ].map(h => (
                    <button key={h.label} onClick={() => h.col && toggleSort(h.col)}
                      style={{ textAlign: 'right', background: 'none', border: 'none', cursor: h.col ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.6rem', color: TD, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h.label}</span>
                      {h.col && <span style={{ fontSize: '0.55rem', color: sortBy === h.col ? G : TD }}>{sortBy === h.col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>}
                    </button>
                  ))}
                </div>

                {filteredSorted.map((a, idx) => {
                  const cfg     = S_CFG[a.status as keyof typeof S_CFG];
                  const bName   = a.barbers?.name ?? barbers.find(b => b.id === a.barber_id)?.name ?? '—';
                  const isCancellable = !['cancelled','completed'].includes(a.status);
                  return (
                    <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1.2fr 1fr 80px 1fr 60px', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: idx < filteredSorted.length - 1 ? `1px solid rgba(178,102,255,0.06)` : 'none', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: T }}>{a.is_premium && '⭐ '}{a.name}</p>
                        <a href={`tel:${a.phone}`} style={{ fontSize: '0.7rem', color: TD, textDecoration: 'none' }}>{a.phone}</a>
                      </div>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: G, fontWeight: 600 }}>{a.time}</span>
                      <span style={{ fontSize: '0.82rem', color: TM }}>{a.is_premium && '⭐ '}{svcName(a.service)}</span>
                      <span style={{ fontSize: '0.82rem', color: TM }}>{bName}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: G, fontWeight: 600 }}>₪{apptPrice(a)}</span>
                      <span style={{ fontSize: '0.78rem', color: TM }}>{fmtDate(a.date)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {cfg && (
                          <span style={{ padding: '0.12rem 0.45rem', borderRadius: 999, fontSize: '0.58rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}`, whiteSpace: 'nowrap' }}>
                            {cfg.label}
                          </span>
                        )}
                        {isCancellable && (
                          <>
                            <button onClick={() => cancelAppointment(a.id)}
                              style={{ padding: '0.2rem 0.4rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 5, color: '#ef4444', fontSize: '0.6rem', cursor: 'pointer' }}>
                              ✕
                            </button>
                            <a href={cancelWaLink(a)} target="_blank" rel="noopener noreferrer"
                              style={{ padding: '0.2rem 0.4rem', background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.30)', borderRadius: 5, color: '#25D366', fontSize: '0.6rem', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex' }}
                              title="שלח הודעת ביטול בוואטסאפ">
                              💬
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ BLOCKED SLOTS TAB ════════════════════════════════ */}
        {tab === 'blocked' && (
          <div>
            <div style={{ marginBottom: '1.75rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.25rem' }}>ניהול</p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>חסימות שעות</h1>
            </div>

            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', color: G, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>חסימה חדשה</p>
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.875rem' }}>
                <select value={newBlockBarber} onChange={e => setNewBlockBarber(e.target.value)}
                  style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.75rem', color: T, fontSize: '0.8rem', cursor: 'pointer', direction: 'rtl' }}>
                  <option value="all">כל המספרה</option>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={() => setNewBlockMode('day')}
                    style={{ padding: '0.5rem 0.875rem', borderRadius: R, border: `1px solid ${newBlockMode === 'day' ? BDRG : BDR}`, background: newBlockMode === 'day' ? GG : B3, color: newBlockMode === 'day' ? GL : TM, fontSize: '0.78rem', fontWeight: newBlockMode === 'day' ? 600 : 400, cursor: 'pointer' }}>
                    יום שלם
                  </button>
                  <button onClick={() => setNewBlockMode('time')}
                    style={{ padding: '0.5rem 0.875rem', borderRadius: R, border: `1px solid ${newBlockMode === 'time' ? BDRG : BDR}`, background: newBlockMode === 'time' ? GG : B3, color: newBlockMode === 'time' ? GL : TM, fontSize: '0.78rem', fontWeight: newBlockMode === 'time' ? 600 : 400, cursor: 'pointer' }}>
                    שעה מסוימת
                  </button>
                </div>

                <input type="date" value={newBlockDate} onChange={e => setNewBlockDate(e.target.value)}
                  style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.75rem', color: T, fontSize: '0.8rem' }} />

                {newBlockMode === 'time' && (
                  <select value={newBlockTime} onChange={e => setNewBlockTime(e.target.value)}
                    style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.75rem', color: T, fontSize: '0.8rem', cursor: 'pointer', direction: 'rtl' }}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}

                <input type="text" placeholder="סיבה (אופציונלי)" value={newBlockReason} onChange={e => setNewBlockReason(e.target.value)}
                  style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.75rem', color: T, fontSize: '0.8rem', direction: 'rtl', minWidth: 140 }} />

                <button onClick={addBlock} disabled={addingBlock || !newBlockDate}
                  style={{ padding: '0.5rem 1.25rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontSize: '0.8rem', fontWeight: 700, cursor: addingBlock || !newBlockDate ? 'default' : 'pointer', opacity: addingBlock || !newBlockDate ? 0.6 : 1 }}>
                  {addingBlock ? 'חוסם...' : '🔒 חסום'}
                </button>
              </div>
              {addBlockError && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.875rem' }}>{addBlockError}</p>
              )}
            </div>

            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: RL, padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>חסימה עם ביטול תורים</p>
                <p style={{ fontSize: '0.8rem', color: TM }}>חוסם יום שלם ומבטל אוטומטית את כל התורים הקיימים בו, עם קישורי וואטסאפ מוכנים לכל לקוח</p>
              </div>
              <button onClick={openDayBlockModal}
                style={{ padding: '0.6rem 1.25rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: R, color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                ⚠️ חסום יום שלם
              </button>
            </div>

            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', color: G, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>חסימות השבוע הנוכחי</p>
              {thisWeekBlocked.length === 0 ? (
                <p style={{ color: TD, fontSize: '0.875rem' }}>אין חסימות השבוע</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {thisWeekBlocked.sort((a, b) => a.blocked_date.localeCompare(b.blocked_date) || a.blocked_time.localeCompare(b.blocked_time)).map(bl => {
                    const bName = bl.barber_id === null ? 'כל המספרה' : ((bl.barbers as { name: string } | null)?.name ?? barbers.find(b => b.id === bl.barber_id)?.name ?? 'לא ידוע');
                    return (
                      <div key={bl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', background: B1, borderRadius: R, border: `1px solid ${BDR}` }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', color: G, fontWeight: 600 }}>{normTime(bl.blocked_time)}</span>
                          <span style={{ fontSize: '0.82rem', color: TM }}>{fmtDate(bl.blocked_date)}</span>
                          <span style={{ fontSize: '0.8rem', color: T, fontWeight: 500 }}>✂️ {bName}</span>
                          {bl.reason && <span style={{ fontSize: '0.75rem', color: TD }}>· {bl.reason}</span>}
                        </div>
                        <button onClick={() => unblockSlot(bl.id)}
                          style={{ padding: '0.3rem 0.75rem', background: B3, border: `1px solid ${BDR}`, borderRadius: 7, color: TM, fontSize: '0.72rem', cursor: 'pointer' }}>
                          בטל חסימה
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', color: G, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>כל החסימות ({blockedSlots.length})</p>
              {blockedSlots.length === 0 ? (
                <p style={{ color: TD, fontSize: '0.875rem' }}>אין חסימות</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 400, overflowY: 'auto' }}>
                  {blockedSlots.sort((a, b) => a.blocked_date.localeCompare(b.blocked_date) || a.blocked_time.localeCompare(b.blocked_time)).map(bl => {
                    const bName = bl.barber_id === null ? 'כל המספרה' : ((bl.barbers as { name: string } | null)?.name ?? barbers.find(b => b.id === bl.barber_id)?.name ?? 'לא ידוע');
                    return (
                      <div key={bl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.875rem', background: B1, borderRadius: R, border: `1px solid ${BDR}` }}>
                        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: G, fontWeight: 600 }}>{normTime(bl.blocked_time)}</span>
                          <span style={{ fontSize: '0.78rem', color: TM }}>{bl.blocked_date}</span>
                          <span style={{ fontSize: '0.78rem', color: T }}>✂️ {bName}</span>
                          {bl.reason && <span style={{ fontSize: '0.72rem', color: TD }}>· {bl.reason}</span>}
                        </div>
                        <button onClick={() => unblockSlot(bl.id)}
                          style={{ padding: '0.25rem 0.6rem', background: B3, border: `1px solid ${BDR}`, borderRadius: 6, color: TM, fontSize: '0.68rem', cursor: 'pointer', flexShrink: 0 }}>
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Day Block + Cancel Modal ─────────────────────────────── */}
      {dayBlockModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget && !dbSubmitting) setDayBlockModalOpen(false); }}>
          <div style={{ background: B1, border: '1px solid rgba(239,68,68,0.35)', borderRadius: RL, padding: '2rem', width: '100%', maxWidth: 460, direction: 'rtl', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>

            {dbStep === 'pick' && (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#ef4444', marginBottom: '1.5rem' }}>⚠️ חסימת יום שלם</p>

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>ספר</label>
                <select value={dbBarberId} onChange={e => setDbBarberId(e.target.value)}
                  style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box', direction: 'rtl' }}>
                  <option value="all">כל המספרה</option>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>תאריך</label>
                <input type="date" min={getToday()} value={dbDate} onChange={e => setDbDate(e.target.value)}
                  style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }} />

                {dbError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>
                    {dbError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={checkDayBlockImpact}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: R, color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                    בדוק תורים והמשך
                  </button>
                  <button onClick={() => setDayBlockModalOpen(false)}
                    style={{ padding: '0.75rem 1.25rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, color: TM, fontSize: '0.875rem', cursor: 'pointer' }}>
                    ביטול
                  </button>
                </div>
              </>
            )}

            {dbStep === 'warn' && (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: dbAffected.length > 0 ? '#ef4444' : T, marginBottom: '0.75rem' }}>
                  {dbAffected.length > 0
                    ? `⚠️ ביום ${fmtDate(dbDate)} יש ${dbAffected.length} תורים`
                    : `אין תורים פעילים ביום ${fmtDate(dbDate)}`}
                </p>

                {dbAffected.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.82rem', color: TM, marginBottom: '0.875rem' }}>
                      חסימת היום תבטל אוטומטית את כל התורים הבאים — לחסום בכל זאת?
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 220, overflowY: 'auto', marginBottom: '1.25rem' }}>
                      {dbAffected.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0.75rem', background: B2, borderRadius: R, border: `1px solid ${BDR}`, fontSize: '0.8rem' }}>
                          <span style={{ color: G, fontWeight: 600, flexShrink: 0 }}>{a.time}</span>
                          <span style={{ color: T, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.is_premium && '⭐ '}{a.name}</span>
                          <span style={{ color: TD, flexShrink: 0 }}>{svcName(a.service)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {dbError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>
                    {dbError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={confirmDayBlock} disabled={dbSubmitting}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: R, color: '#ef4444', fontWeight: 700, fontSize: '0.875rem', cursor: dbSubmitting ? 'default' : 'pointer', opacity: dbSubmitting ? 0.6 : 1 }}>
                    {dbSubmitting ? 'חוסם...' : dbAffected.length > 0 ? 'כן, חסום ובטל הכל' : 'חסום את היום'}
                  </button>
                  <button onClick={() => setDbStep('pick')} disabled={dbSubmitting}
                    style={{ padding: '0.75rem 1.25rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, color: TM, fontSize: '0.875rem', cursor: 'pointer' }}>
                    חזור
                  </button>
                </div>
              </>
            )}

            {dbStep === 'result' && (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#22c55e', marginBottom: '1rem' }}>היום נחסם ✅</p>

                {dbAffected.length > 0 ? (
                  <>
                    <p style={{ fontSize: '0.82rem', color: TM, marginBottom: '1rem' }}>
                      בוטלו {dbAffected.length} תורים. שלח לכל לקוח הודעת ביטול בוואטסאפ:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 320, overflowY: 'auto', marginBottom: '1.5rem' }}>
                      {dbAffected.map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.625rem', padding: '0.625rem 0.875rem', background: B2, borderRadius: R, border: `1px solid ${BDR}` }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.is_premium && '⭐ '}{a.name}</p>
                            <p style={{ fontSize: '0.72rem', color: TD }}>{a.time} · {svcName(a.service)}</p>
                          </div>
                          <a href={cancelWaLink(a)} target="_blank" rel="noopener noreferrer"
                            style={{ flexShrink: 0, padding: '0.4rem 0.75rem', background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.30)', borderRadius: 7, color: '#25D366', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                            💬 שלח ביטול
                          </a>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: TM, marginBottom: '1.5rem' }}>לא היו תורים פעילים ביום זה.</p>
                )}

                <button onClick={() => setDayBlockModalOpen(false)}
                  style={{ width: '100%', padding: '0.75rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                  סגור
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Recurring Appointment Modal ──────────────────────────── */}
      {recurringModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setRecurringModalOpen(false); }}>
          <div style={{ background: B1, border: `1px solid ${BDRG}`, borderRadius: RL, padding: '2rem', width: '100%', maxWidth: 420, direction: 'rtl', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            {rcResult ? (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: G, marginBottom: '1.25rem' }}>נקבעו {rcResult.booked} תורים ✅</p>
                {rcResult.skipped.length > 0 && (
                  <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: R, padding: '1rem', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: TD, fontWeight: 700, marginBottom: '0.625rem' }}>דילגנו על {rcResult.skipped.length} תאריכים:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 180, overflowY: 'auto' }}>
                      {rcResult.skipped.map(s => (
                        <div key={s.date} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: TM }}>
                          <span>{fmtDate(s.date)}</span>
                          <span>{RECURRING_SKIP_LABELS[s.reason] ?? s.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setRecurringModalOpen(false)}
                  style={{ width: '100%', padding: '0.75rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                  סגור
                </button>
              </>
            ) : (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: T, marginBottom: '1.5rem' }}>צור תור קבוע ⭐</p>

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>ספר</label>
                <select value={rcBarberId} onChange={e => setRcBarberId(e.target.value)}
                  style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box', direction: 'rtl' }}>
                  {barbers.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>שירות</label>
                <select value={rcService} onChange={e => setRcService(e.target.value)}
                  style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box', direction: 'rtl' }}>
                  {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>שם הלקוח</label>
                <input value={rcName} onChange={e => setRcName(e.target.value)} placeholder="ישראל ישראלי"
                  style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box', direction: 'rtl' }} />

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>טלפון הלקוח</label>
                <input value={rcPhone} onChange={e => setRcPhone(e.target.value)} placeholder="050-0000000" dir="ltr"
                  style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box', direction: 'ltr', fontFamily: 'monospace' }} />

                <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>תאריך התחלה</label>
                    <input type="date" min={getToday()} value={rcStartDate}
                      onChange={e => {
                        const v = e.target.value;
                        setRcStartDate(v);
                        const maxEnd = maxRecurringEnd(v);
                        if (rcEndDate && rcEndDate > maxEnd) setRcEndDate(maxEnd);
                      }}
                      style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>שעה</label>
                    <select value={rcTime} onChange={e => setRcTime(e.target.value)}
                      style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }}>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>תדירות</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button type="button" onClick={() => setRcFrequency('weekly')}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: R, border: `1px solid ${rcFrequency === 'weekly' ? BDRG : BDR}`, background: rcFrequency === 'weekly' ? GG : B3, color: rcFrequency === 'weekly' ? GL : TM, fontSize: '0.8rem', fontWeight: rcFrequency === 'weekly' ? 600 : 400, cursor: 'pointer' }}>
                    כל שבוע
                  </button>
                  <button type="button" onClick={() => setRcFrequency('biweekly')}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: R, border: `1px solid ${rcFrequency === 'biweekly' ? BDRG : BDR}`, background: rcFrequency === 'biweekly' ? GG : B3, color: rcFrequency === 'biweekly' ? GL : TM, fontSize: '0.8rem', fontWeight: rcFrequency === 'biweekly' ? 600 : 400, cursor: 'pointer' }}>
                    כל שבועיים
                  </button>
                  <button type="button" onClick={() => setRcFrequency('monthly')}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: R, border: `1px solid ${rcFrequency === 'monthly' ? BDRG : BDR}`, background: rcFrequency === 'monthly' ? GG : B3, color: rcFrequency === 'monthly' ? GL : TM, fontSize: '0.8rem', fontWeight: rcFrequency === 'monthly' ? 600 : 400, cursor: 'pointer' }}>
                    כל חודש
                  </button>
                </div>

                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>עד תאריך</label>
                <input type="date" min={rcStartDate || getToday()} max={rcStartDate ? maxRecurringEnd(rcStartDate) : undefined} value={rcEndDate}
                  onChange={e => setRcEndDate(e.target.value)}
                  style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '0.25rem', boxSizing: 'border-box' }} />
                <p style={{ fontSize: '0.68rem', color: TD, marginBottom: '1rem' }}>עד 3 חודשים קדימה</p>

                {rcError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>
                    {rcError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <button onClick={submitRecurring} disabled={rcSubmitting}
                    style={{ flex: 1, padding: '0.75rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontWeight: 700, fontSize: '0.875rem', cursor: rcSubmitting ? 'default' : 'pointer', opacity: rcSubmitting ? 0.6 : 1 }}>
                    {rcSubmitting ? 'קובע...' : 'צור תור קבוע'}
                  </button>
                  <button onClick={() => setRecurringModalOpen(false)}
                    style={{ padding: '0.75rem 1.25rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, color: TM, fontSize: '0.875rem', cursor: 'pointer' }}>
                    ביטול
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes mgr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
