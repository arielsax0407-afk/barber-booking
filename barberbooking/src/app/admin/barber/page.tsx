'use client';

import { useState, useEffect, useCallback } from 'react';
import { SERVICES } from '@/lib/services';
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

// ── Premium styling — gold, distinct from the regular purple theme ──
const PG    = '#D4AF37';
const PG_BG = 'rgba(212,175,55,0.14)';
const PG_BDR= 'rgba(212,175,55,0.35)';

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

const APPT_COLORS: Record<string, { bg: string; bdr: string; txt: string }> = {
  pending:     { bg: 'rgba(245,158,11,0.12)',  bdr: 'rgba(245,158,11,0.35)',  txt: '#f59e0b' },
  approved:    { bg: 'rgba(34,197,94,0.10)',   bdr: 'rgba(34,197,94,0.35)',   txt: '#22c55e' },
  in_progress: { bg: 'rgba(59,130,246,0.12)',  bdr: 'rgba(59,130,246,0.35)',  txt: '#3b82f6' },
  completed:   { bg: 'rgba(16,185,129,0.08)',  bdr: 'rgba(16,185,129,0.28)',  txt: '#10b981' },
  cancelled:   { bg: 'rgba(107,114,128,0.06)', bdr: 'rgba(107,114,128,0.22)', txt: '#6b7280' },
};

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
  '18:00','18:30',
];

const DAY_NAMES = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const DAY_FULL  = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const MONTHS    = ['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ'];
const MONTHS_FULL = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DAY_OF_WEEK = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const BLOCK_REASONS = ['הפסקה','יום חופש','פגישה','אחר'];

type Appointment = {
  id: string; name: string; phone: string; service: string;
  date: string; time: string; status: string; created_at: string;
  is_premium?: boolean; premium_price?: number | null;
};
type BlockedSlot = {
  id: string; blocked_date: string; blocked_time: string; reason: string | null; barber_id?: string | null;
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

function normTime(t: string): string { return t ? t.slice(0, 5) : t; }

function cancelWaLink(a: { name: string; phone: string; service: string; date: string; time: string; is_premium?: boolean; premium_price?: number | null }): string {
  const msg = fillTemplate(DEFAULT_WA_TEMPLATES.cancel, {
    name: a.name, service: svcName(a.service), date: fmtDate(a.date), time: a.time, price: apptPrice(a),
  });
  return waLink(a.phone, msg);
}

// ── Main ──────────────────────────────────────────────────────
export default function BarberAdminPage() {
  const [authed, setAuthed]         = useState(false);
  const [barberId, setBarberId]     = useState('');
  const [barberName, setBarberName] = useState('');
  const [password, setPassword]     = useState('');
  const [authError, setAuthError]   = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocked, setBlocked]       = useState<BlockedSlot[]>([]);
  const [loading, setLoading]       = useState(false);
  const [tab, setTab]               = useState<'calendar' | 'stats' | 'appointments'>('calendar');
  const [calView, setCalView]       = useState<'week' | 'day'>('week');
  const [weekRef, setWeekRef]       = useState(() => getToday());
  const [selectedDay, setSelectedDay] = useState(() => getToday());
  const [listFilter, setListFilter] = useState<'today' | 'week' | 'upcoming' | 'past'>('today');
  const [blockModal, setBlockModal] = useState<{ date: string; time: string } | null>(null);
  const [blockReason, setBlockReason] = useState(BLOCK_REASONS[0]);
  const [blockCustom, setBlockCustom] = useState('');
  const [blocking, setBlocking]     = useState(false);
  const [unblockId, setUnblockId]   = useState<string | null>(null);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [premiumDate, setPremiumDate]       = useState('');
  const [premiumTime, setPremiumTime]       = useState(TIME_SLOTS[0]);
  const [premiumService, setPremiumService] = useState(SERVICES[0].id);
  const [premiumPriceInput, setPremiumPriceInput] = useState('');
  const [premiumError, setPremiumError]     = useState('');
  const [premiumSubmitting, setPremiumSubmitting] = useState(false);
  const [cancelPremiumId, setCancelPremiumId] = useState<string | null>(null);
  const [shopAvgMonthRevenuePerBarber, setShopAvgMonthRevenuePerBarber] = useState(0);
  const [shopAvgRevenuePerAppt, setShopAvgRevenuePerAppt] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [goalInput, setGoalInput]     = useState('');
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/barber/data');
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.appointments ?? []);
        setBlocked(json.blocked_slots ?? []);
        setShopAvgMonthRevenuePerBarber(json.shopAvgMonthRevenuePerBarber ?? 0);
        setShopAvgRevenuePerAppt(json.shopAvgRevenuePerAppt ?? 0);
      }
    } catch {
      // Network blip — keep showing the last known data instead of clearing it.
    } finally {
      setLoading(false);
    }
  }, []);

  function loadGoal(id: string) {
    try {
      const raw = localStorage.getItem(`bph_barber_goal_${id}`);
      const val = raw ? parseInt(raw, 10) : 0;
      setMonthlyGoal(Number.isFinite(val) ? val : 0);
      setGoalInput(val ? String(val) : '');
    } catch { setMonthlyGoal(0); }
  }

  function saveGoal() {
    const val = parseInt(goalInput, 10) || 0;
    setMonthlyGoal(val);
    try { localStorage.setItem(`bph_barber_goal_${barberId}`, String(val)); } catch {}
  }

  async function login() {
    setAuthError('');
    const res = await fetch('/api/admin/barber-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (res.ok) {
      setBarberId(json.barber?.id ?? '');
      setBarberName(json.barber?.name ?? 'ספר');
      setAuthed(true);
      loadGoal(json.barber?.id ?? '');
      loadData();
    } else {
      setAuthError(json.error || 'סיסמה שגויה');
    }
  }

  async function updateStatus(id: string, status: string) {
    // Only apply the optimistic UI update once the server confirms it saved —
    // otherwise a failed request (expired session, DB error, etc.) leaves the
    // barber believing an appointment was updated when it actually wasn't,
    // and that mismatch could persist until the next 30s auto-refresh.
    try {
      const res = await fetch('/api/admin/barber/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {
      alert('עדכון הסטטוס נכשל — נסה שוב 😕');
    }
  }

  async function blockSlot() {
    if (!blockModal) return;
    setBlocking(true);
    const reason = blockReason === 'אחר' ? (blockCustom || 'אחר') : blockReason;
    try {
      const res = await fetch('/api/admin/barber/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: blockModal.date, time: blockModal.time, reason }),
      });
      if (!res.ok) throw new Error();
      setBlockModal(null);
      setBlockReason(BLOCK_REASONS[0]);
      setBlockCustom('');
      await loadData();
    } catch {
      alert('חסימת השעה נכשלה — נסה שוב 😕');
    } finally {
      setBlocking(false);
    }
  }

  async function unblockSlot(id: string) {
    setUnblockId(id);
    try {
      const res = await fetch('/api/admin/barber/blocked-slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert('ביטול החסימה נכשל — נסה שוב 😕');
    } finally {
      setUnblockId(null);
      await loadData();
    }
  }

  function openPremiumModal() {
    setPremiumDate(calView === 'day' ? selectedDay : getToday());
    setPremiumTime(TIME_SLOTS[0]);
    setPremiumService(SERVICES[0].id);
    setPremiumPriceInput('');
    setPremiumError('');
    setPremiumModalOpen(true);
  }

  async function submitPremiumSlot() {
    const price = parseInt(premiumPriceInput, 10);
    if (!Number.isInteger(price) || price <= 0) {
      setPremiumError('הזן מחיר פרמיום תקין');
      return;
    }
    setPremiumSubmitting(true);
    setPremiumError('');
    try {
      const res = await fetch('/api/admin/barber/premium-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: premiumDate, time: premiumTime, service: premiumService, premium_price: price }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPremiumError(json.error || 'פתיחת תור הפרמיום נכשלה');
        return;
      }
      setPremiumModalOpen(false);
      await loadData();
    } catch {
      setPremiumError('פתיחת תור הפרמיום נכשלה — נסה שוב');
    } finally {
      setPremiumSubmitting(false);
    }
  }

  async function cancelPremiumSlot(id: string) {
    setCancelPremiumId(id);
    try {
      const res = await fetch('/api/admin/barber/premium-slots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert('ביטול תור הפרמיום נכשל — נסה שוב 😕');
    } finally {
      setCancelPremiumId(null);
      await loadData();
    }
  }

  async function logout() {
    await fetch('/api/admin/barber-login', { method: 'DELETE' });
    setAuthed(false);
    setPassword('');
    setAppointments([]);
    setBlocked([]);
    setBarberName('');
    setBarberId('');
  }

  useEffect(() => {
    if (!authed) return;
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [authed, loadData]);

  /* ── Login ─────────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${GG} 0%, transparent 70%), ${B0}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BDR}`, borderRadius: RL, padding: '2.5rem', backdropFilter: 'blur(20px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/images/logo.png" alt="" style={{ width: 64, height: 64, margin: '0 auto 0.875rem', borderRadius: '50%', display: 'block', boxShadow: `0 0 24px ${GG}` }} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: T }}>פאנל ספר</p>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: G, marginTop: '0.25rem' }}>הזן את הסיסמה האישית שלך</p>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${BDR},transparent)`, marginBottom: '1.5rem' }} />
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>סיסמת ספר</label>
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
            <a href="/admin/manager" style={{ color: G, textDecoration: 'none' }}>פאנל מנהל</a>
          </p>
        </div>
      </div>
    );
  }

  /* ── Authenticated state ──────────────────────────────────── */
  const today    = getToday();
  const weekDays = getWeekDays(weekRef);

  // Stats computations
  const monthPrefix = today.slice(0, 7);
  const todayAppts  = appointments.filter(a => a.date === today);
  const weekAppts   = appointments.filter(a => weekDays.includes(a.date));
  const monthAppts  = appointments.filter(a => a.date.startsWith(monthPrefix));

  const activeStatuses = ['approved', 'in_progress', 'completed'];
  const todayRev  = todayAppts.filter(a => activeStatuses.includes(a.status)).reduce((s, a) => s + apptPrice(a), 0);
  const weekRev   = weekAppts.filter(a => activeStatuses.includes(a.status)).reduce((s, a) => s + apptPrice(a), 0);
  const monthRev  = monthAppts.filter(a => activeStatuses.includes(a.status)).reduce((s, a) => s + apptPrice(a), 0);

  const svcCount: Record<string, number> = {};
  appointments.forEach(a => { if (activeStatuses.includes(a.status)) svcCount[a.service] = (svcCount[a.service] ?? 0) + 1; });
  const topService = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0];

  const dayCount: Record<number, number> = {};
  appointments.forEach(a => {
    if (activeStatuses.includes(a.status)) {
      const dow = new Date(a.date + 'T12:00:00').getDay();
      dayCount[dow] = (dayCount[dow] ?? 0) + 1;
    }
  });
  const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

  const allActive = appointments.filter(a => activeStatuses.includes(a.status));
  const avgRevenue = allActive.length ? Math.round(allActive.reduce((s, a) => s + apptPrice(a), 0) / allActive.length) : 0;

  // Utilization, cancellation rate, goal progress, shop comparison
  const currentWeekDays  = getWeekDays(today);
  const currentWeekAppts = appointments.filter(a => currentWeekDays.includes(a.date));
  const utilToday = Math.round((todayAppts.filter(a => a.status !== 'cancelled').length / TIME_SLOTS.length) * 100);
  const utilWeek  = Math.round((currentWeekAppts.filter(a => a.status !== 'cancelled').length / (TIME_SLOTS.length * 7)) * 100);
  const monthCancelled = monthAppts.filter(a => a.status === 'cancelled').length;
  const cancelRateMonth = monthAppts.length > 0 ? Math.round((monthCancelled / monthAppts.length) * 100) : 0;
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((monthRev / monthlyGoal) * 100)) : 0;
  const vsShopMonth   = shopAvgMonthRevenuePerBarber > 0 ? Math.round(((monthRev - shopAvgMonthRevenuePerBarber) / shopAvgMonthRevenuePerBarber) * 100) : 0;
  const vsShopAvgAppt = shopAvgRevenuePerAppt > 0 ? Math.round(((avgRevenue - shopAvgRevenuePerAppt) / shopAvgRevenuePerAppt) * 100) : 0;

  // Appointments list filter
  const thisWeekDays = getWeekDays(today);
  const filteredList = appointments.filter(a => {
    if (listFilter === 'today')    return a.date === today;
    if (listFilter === 'week')     return thisWeekDays.includes(a.date);
    if (listFilter === 'upcoming') return a.date >= today && !['cancelled', 'rejected'].includes(a.status);
    if (listFilter === 'past')     return a.date < today || a.status === 'completed';
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const navItems = [
    { id: 'calendar' as const,      icon: '📅', label: 'לוח' },
    { id: 'stats' as const,         icon: '📊', label: 'נתונים' },
    { id: 'appointments' as const,  icon: '≡',  label: 'תורים' },
  ];

  return (
    <div data-admin-theme={theme} style={{ minHeight: '100vh', background: B0, color: T, direction: 'rtl', fontFamily: 'var(--font-body)', transition: 'background 0.25s ease, color 0.25s ease' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ background: B1, borderBottom: `1px solid ${BDR}`, padding: '0.5rem 1rem', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
          <img src="/images/logo.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%', marginInlineEnd: '0.25rem', flexShrink: 0 }} />
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.65rem', borderRadius: R, border: 'none', cursor: 'pointer', background: tab === item.id ? GG : 'transparent', color: tab === item.id ? GL : TM, fontSize: '0.82rem', fontWeight: tab === item.id ? 600 : 400, whiteSpace: 'nowrap' }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.82rem', color: GL, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '30vw' }}>✂️ {barberName}</span>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
            style={{ padding: '0.3rem 0.6rem', background: B3, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button onClick={logout} style={{ padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>יציאה</button>
        </div>
      </header>

      <main style={{ padding: '1.5rem 1rem', maxWidth: 920, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* ══ CALENDAR TAB ════════════════════════════════════ */}
        {tab === 'calendar' && (
          <div>
            {/* Calendar controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setCalView('week')}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: R, border: `1px solid ${calView === 'week' ? BDRG : BDR}`, background: calView === 'week' ? GG : B2, color: calView === 'week' ? GL : TM, fontSize: '0.78rem', fontWeight: calView === 'week' ? 600 : 400, cursor: 'pointer' }}>
                  שבוע
                </button>
                <button onClick={() => setCalView('day')}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: R, border: `1px solid ${calView === 'day' ? BDRG : BDR}`, background: calView === 'day' ? GG : B2, color: calView === 'day' ? GL : TM, fontSize: '0.78rem', fontWeight: calView === 'day' ? 600 : 400, cursor: 'pointer' }}>
                  יום
                </button>
                <button onClick={openPremiumModal}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: R, border: `1px solid ${PG_BDR}`, background: PG_BG, color: PG, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                  ⭐ פתח תור פרמיום
                </button>
              </div>

              {calView === 'week' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => { const d = new Date(weekRef + 'T12:00:00'); d.setDate(d.getDate() - 7); setWeekRef(d.toISOString().split('T')[0]); }}
                    style={{ padding: '0.35rem 0.625rem', background: B2, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, cursor: 'pointer', fontSize: '0.9rem' }}>
                    ›
                  </button>
                  <span style={{ fontSize: '0.82rem', color: TM, minWidth: 140, textAlign: 'center' }}>
                    {fmtDate(weekDays[0])} — {fmtDate(weekDays[6])}
                  </span>
                  <button onClick={() => { const d = new Date(weekRef + 'T12:00:00'); d.setDate(d.getDate() + 7); setWeekRef(d.toISOString().split('T')[0]); }}
                    style={{ padding: '0.35rem 0.625rem', background: B2, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, cursor: 'pointer', fontSize: '0.9rem' }}>
                    ‹
                  </button>
                  <button onClick={() => setWeekRef(today)}
                    style={{ padding: '0.35rem 0.75rem', background: GG, border: `1px solid ${BDRG}`, borderRadius: 8, color: GL, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>
                    היום
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => { const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDay(d.toISOString().split('T')[0]); }}
                    style={{ padding: '0.35rem 0.625rem', background: B2, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, cursor: 'pointer', fontSize: '0.9rem' }}>
                    ›
                  </button>
                  <span style={{ fontSize: '0.82rem', color: T, fontWeight: 600 }}>
                    {DAY_FULL[new Date(selectedDay + 'T12:00:00').getDay()]} · {fmtDate(selectedDay)}
                    {selectedDay === today && <span style={{ color: G, marginRight: '0.4rem' }}>· היום</span>}
                  </span>
                  <button onClick={() => { const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDay(d.toISOString().split('T')[0]); }}
                    style={{ padding: '0.35rem 0.625rem', background: B2, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, cursor: 'pointer', fontSize: '0.9rem' }}>
                    ‹
                  </button>
                  <button onClick={() => setSelectedDay(today)}
                    style={{ padding: '0.35rem 0.75rem', background: GG, border: `1px solid ${BDRG}`, borderRadius: 8, color: GL, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>
                    היום
                  </button>
                </div>
              )}
            </div>

            <p style={{ fontSize: '0.65rem', color: TD, marginBottom: '0.75rem' }}>
              לחץ על שעה פנויה לחסימה · לחץ על חסימה לביטול
            </p>

            {/* ── Week View ─────────────────────────────────────── */}
            {calView === 'week' && (
              <div style={{ overflowX: 'auto', background: B2, border: `1px solid ${BDR}`, borderRadius: RL }}>
                <div style={{ minWidth: 560 }}>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: `1px solid ${BDR}` }}>
                    <div style={{ padding: '0.5rem 0.25rem', borderLeft: `1px solid ${BDR}` }} />
                    {weekDays.map((day, i) => {
                      const isToday = day === today;
                      const dayNum  = parseInt(day.split('-')[2]);
                      const mon     = parseInt(day.split('-')[1]) - 1;
                      return (
                        <div key={day}
                          onClick={() => { setSelectedDay(day); setCalView('day'); }}
                          style={{ padding: '0.5rem 0.25rem', textAlign: 'center', cursor: 'pointer', borderLeft: `1px solid ${BDR}`, background: isToday ? 'rgba(178,102,255,0.06)' : 'transparent', borderBottom: isToday ? `2px solid ${G}` : 'none' }}>
                          <p style={{ fontSize: '0.62rem', color: isToday ? G : TD, fontWeight: isToday ? 700 : 400, marginBottom: '0.1rem' }}>{DAY_NAMES[i]}</p>
                          <p style={{ fontSize: '0.82rem', color: isToday ? GL : T, fontWeight: isToday ? 700 : 500 }}>{dayNum}</p>
                          <p style={{ fontSize: '0.55rem', color: TD }}>{MONTHS[mon]}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time slot rows */}
                  {TIME_SLOTS.map((slot, si) => (
                    <div key={slot} style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: si < TIME_SLOTS.length - 1 ? `1px solid rgba(178,102,255,0.06)` : 'none', minHeight: 44 }}>
                      <div style={{ padding: '0.3rem 0.25rem 0', borderLeft: `1px solid ${BDR}`, textAlign: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.6rem', color: TD }}>{slot}</span>
                      </div>
                      {weekDays.map(day => {
                        // Use filter (not find) — the booking API has no DB-level uniqueness
                        // constraint on (date, time, barber), so two appointments can in rare
                        // cases collide on the same slot. Showing only the first one would
                        // silently hide the second customer from the barber entirely.
                        const apptsHere = appointments.filter(a => a.date === day && a.time === slot && !['cancelled','rejected'].includes(a.status) && !(a.is_premium && a.status === 'premium_open'));
                        const appt = apptsHere[0];
                        const premiumOpen = appointments.find(a => a.date === day && a.time === slot && a.is_premium && a.status === 'premium_open');
                        const blk  = blocked.find(b => b.blocked_date === day && normTime(b.blocked_time) === slot);

                        if (premiumOpen) {
                          return (
                            <div key={day} style={{ borderLeft: `1px solid ${BDR}`, padding: '0.2rem 0.25rem' }}>
                              <div
                                onClick={() => cancelPremiumSlot(premiumOpen.id)}
                                title="תור פרמיום פנוי — לחץ לביטול"
                                style={{ background: PG_BG, border: `1px solid ${PG_BDR}`, borderRadius: 5, padding: '0.2rem 0.3rem', height: '100%', cursor: cancelPremiumId === premiumOpen.id ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.65rem' }}>⭐</span>
                                <span style={{ fontSize: '0.55rem', color: PG, fontWeight: 700 }}>₪{premiumOpen.premium_price}</span>
                              </div>
                            </div>
                          );
                        }

                        if (appt) {
                          const ac = APPT_COLORS[appt.status] ?? APPT_COLORS.approved;
                          return (
                            <div key={day} style={{ borderLeft: `1px solid ${BDR}`, padding: '0.2rem 0.25rem' }}>
                              <div style={{ background: ac.bg, border: `1px solid ${ac.bdr}`, borderRadius: 5, padding: '0.2rem 0.3rem', height: '100%', position: 'relative' }}>
                                {apptsHere.length > 1 && (
                                  <span title={`${apptsHere.length} תורים חופפים בשעה זו`} style={{ position: 'absolute', top: 2, left: 2, background: '#ef4444', color: '#fff', fontSize: '0.5rem', fontWeight: 700, borderRadius: 999, padding: '0 0.3rem', lineHeight: '1.3' }}>
                                    +{apptsHere.length - 1}
                                  </span>
                                )}
                                <p style={{ fontSize: '0.6rem', color: ac.txt, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.is_premium && '⭐ '}{appt.name}</p>
                                <p style={{ fontSize: '0.55rem', color: TM, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svcName(appt.service)}</p>
                              </div>
                            </div>
                          );
                        }

                        if (blk) {
                          const isGlobal = blk.barber_id === null || blk.barber_id === undefined;
                          return (
                            <div key={day} style={{ borderLeft: `1px solid ${BDR}`, padding: '0.2rem 0.25rem' }}>
                              <div
                                onClick={() => { if (!isGlobal) unblockSlot(blk.id); }}
                                title={isGlobal ? 'נחסם ע״י המנהל לכל המספרה' : 'לחץ לביטול חסימה'}
                                style={{ background: isGlobal ? 'rgba(239,68,68,0.08)' : 'rgba(107,114,128,0.12)', border: `1px solid ${isGlobal ? 'rgba(239,68,68,0.20)' : 'rgba(107,114,128,0.25)'}`, borderRadius: 5, padding: '0.2rem 0.3rem', cursor: isGlobal ? 'not-allowed' : unblockId === blk.id ? 'wait' : 'pointer', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: isGlobal ? '#ef4444' : '#6b7280' }}>{isGlobal ? '🚫' : '🔒'}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={day} style={{ borderLeft: `1px solid ${BDR}` }}>
                            <div
                              onClick={() => { setBlockModal({ date: day, time: slot }); setBlockReason(BLOCK_REASONS[0]); setBlockCustom(''); }}
                              style={{ height: '100%', minHeight: 40, cursor: 'pointer' }}
                              className="cal-empty-cell"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Day View ──────────────────────────────────────── */}
            {calView === 'day' && (
              <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, overflow: 'hidden' }}>
                {TIME_SLOTS.map((slot, si) => {
                  // See the week-view comment above — filter, not find, so a rare
                  // double-booked slot is never silently hidden from the barber.
                  const apptsHere = appointments.filter(a => a.date === selectedDay && a.time === slot && !['cancelled','rejected'].includes(a.status) && !(a.is_premium && a.status === 'premium_open'));
                  const appt = apptsHere[0];
                  const premiumOpen = appointments.find(a => a.date === selectedDay && a.time === slot && a.is_premium && a.status === 'premium_open');
                  const blk  = blocked.find(b => b.blocked_date === selectedDay && normTime(b.blocked_time) === slot);

                  return (
                    <div key={slot} style={{ display: 'flex', alignItems: 'stretch', borderBottom: si < TIME_SLOTS.length - 1 ? `1px solid rgba(178,102,255,0.06)` : 'none', minHeight: 60 }}>
                      <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: `1px solid ${BDR}` }}>
                        <span style={{ fontSize: '0.7rem', color: TD }}>{slot}</span>
                      </div>

                      {premiumOpen ? (
                        <div style={{ flex: 1, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: PG_BG }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem' }}>⭐</span>
                            <p style={{ fontSize: '0.85rem', color: PG, fontWeight: 700 }}>תור פרמיום פנוי — ₪{premiumOpen.premium_price}</p>
                          </div>
                          <button
                            onClick={() => cancelPremiumSlot(premiumOpen.id)}
                            disabled={cancelPremiumId === premiumOpen.id}
                            style={{ padding: '0.3rem 0.75rem', background: B3, border: `1px solid ${PG_BDR}`, borderRadius: 7, color: PG, fontSize: '0.72rem', cursor: 'pointer' }}>
                            {cancelPremiumId === premiumOpen.id ? '...' : 'בטל תור פרמיום'}
                          </button>
                        </div>
                      ) : appt ? (
                        <div style={{ flex: 1, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div>
                              {apptsHere.length > 1 && (
                                <p style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.2rem' }}>
                                  ⚠️ {apptsHere.length} תורים חופפים בשעה זו — {apptsHere.slice(1).map(x => x.name).join(', ')}
                                </p>
                              )}
                              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: T }}>{appt.is_premium && '⭐ '}{appt.name}</p>
                              <p style={{ fontSize: '0.75rem', color: TM }}>{svcName(appt.service)} · ₪{apptPrice(appt)}</p>
                              <a href={`tel:${appt.phone}`} style={{ fontSize: '0.72rem', color: TD, textDecoration: 'none' }}>📞 {appt.phone}</a>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            {(() => {
                              const cfg = S_CFG[appt.status as keyof typeof S_CFG];
                              return cfg ? (
                                <span style={{ padding: '0.15rem 0.55rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}` }}>
                                  {cfg.label}
                                </span>
                              ) : null;
                            })()}
                            {appt.status === 'approved' && (
                              <>
                                <button onClick={() => updateStatus(appt.id, 'in_progress')}
                                  style={{ padding: '0.3rem 0.6rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 7, color: '#3b82f6', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                                  ▶ התחל
                                </button>
                                <button onClick={() => updateStatus(appt.id, 'cancelled')}
                                  style={{ padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 7, color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer' }}>
                                  ✕
                                </button>
                                <a href={cancelWaLink(appt)} target="_blank" rel="noopener noreferrer"
                                  style={{ padding: '0.3rem 0.6rem', background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.30)', borderRadius: 7, color: '#25D366', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex' }}
                                  title="שלח הודעת ביטול בוואטסאפ">
                                  💬
                                </a>
                              </>
                            )}
                            {appt.status === 'in_progress' && (
                              <button onClick={() => updateStatus(appt.id, 'completed')}
                                style={{ padding: '0.3rem 0.6rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.28)', borderRadius: 7, color: '#10b981', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                                ✓ סיים
                              </button>
                            )}
                          </div>
                        </div>
                      ) : blk ? (
                        <div style={{ flex: 1, padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: blk.barber_id == null ? 'rgba(239,68,68,0.05)' : 'rgba(107,114,128,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem' }}>{blk.barber_id == null ? '🚫' : '🔒'}</span>
                            <div>
                              <p style={{ fontSize: '0.82rem', color: blk.barber_id == null ? '#ef4444' : '#6b7280', fontWeight: 600 }}>{blk.barber_id == null ? 'סגור — כל המספרה (ע״י המנהל)' : 'חסום'}</p>
                              {blk.reason && <p style={{ fontSize: '0.72rem', color: TD }}>{blk.reason}</p>}
                            </div>
                          </div>
                          {blk.barber_id != null && (
                          <button
                            onClick={() => unblockSlot(blk.id)}
                            disabled={unblockId === blk.id}
                            style={{ padding: '0.3rem 0.75rem', background: B3, border: `1px solid ${BDR}`, borderRadius: 7, color: TM, fontSize: '0.72rem', cursor: 'pointer' }}>
                            {unblockId === blk.id ? '...' : 'בטל חסימה'}
                          </button>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => { setBlockModal({ date: selectedDay, time: slot }); setBlockReason(BLOCK_REASONS[0]); setBlockCustom(''); }}
                          style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 1rem' }}
                          className="cal-empty-cell">
                          <span style={{ fontSize: '0.72rem', color: 'transparent' }}>+ חסום שעה</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ STATS TAB ════════════════════════════════════════ */}
        {tab === 'stats' && (
          <div>
            <div style={{ marginBottom: '1.75rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.25rem' }}>סטטיסטיקות</p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>הנתונים שלי</h1>
            </div>

            {/* 6-stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>
              {[
                { label: 'תורים היום',   value: todayAppts.filter(a => a.status !== 'cancelled').length,  sub: `₪${todayRev} הכנסות`, color: G  },
                { label: 'הכנסות היום',  value: `₪${todayRev}`,  sub: `${todayAppts.filter(a => a.status === 'completed').length} הושלמו`, color: GL },
                { label: 'תורים השבוע',  value: weekAppts.filter(a => a.status !== 'cancelled').length,   sub: `₪${weekRev} הכנסות`,  color: G  },
                { label: 'הכנסות השבוע', value: `₪${weekRev}`,  sub: `${weekAppts.length} תורים`,        color: GL },
                { label: 'תורים בחודש',  value: monthAppts.filter(a => a.status !== 'cancelled').length,  sub: `₪${monthRev} הכנסות`, color: G  },
                { label: 'הכנסות חודש',  value: `₪${monthRev}`, sub: `${monthAppts.length} תורים`,       color: GL },
              ].map(k => (
                <div key={k.label} style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.1rem 1.25rem' }}>
                  <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.4rem' }}>{k.label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 600, color: k.color, lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: '0.7rem', color: TD, marginTop: '0.3rem' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Insights row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>שירות פופולרי</p>
                {topService ? (
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: GL, fontWeight: 600 }}>{svcName(topService[0])}</p>
                    <p style={{ fontSize: '0.8rem', color: TM, marginTop: '0.25rem' }}>{topService[1]} תורים</p>
                    <p style={{ fontSize: '0.72rem', color: TD, marginTop: '0.125rem' }}>₪{PRICE_MAP[topService[0]] ?? 0} לתספורת</p>
                  </div>
                ) : <p style={{ color: TD, fontSize: '0.85rem' }}>אין נתונים</p>}
              </div>

              <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>יום עמוס</p>
                {topDay ? (
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: GL, fontWeight: 600 }}>{DAY_OF_WEEK[parseInt(topDay[0])]}</p>
                    <p style={{ fontSize: '0.8rem', color: TM, marginTop: '0.25rem' }}>{topDay[1]} תורים בממוצע</p>
                  </div>
                ) : <p style={{ color: TD, fontSize: '0.85rem' }}>אין נתונים</p>}
              </div>

              <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>ממוצע הכנסה לתור</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: GL, fontWeight: 600 }}>₪{avgRevenue}</p>
                <p style={{ fontSize: '0.8rem', color: TM, marginTop: '0.25rem' }}>{allActive.length} תורים פעילים</p>
              </div>
            </div>

            {/* Service breakdown */}
            {Object.keys(svcCount).length > 0 && (
              <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>פילוח שירותים</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {Object.entries(svcCount).sort((a, b) => b[1] - a[1]).map(([svc, cnt]) => {
                    const total = Object.values(svcCount).reduce((s, v) => s + v, 0);
                    const pct   = Math.round((cnt / total) * 100);
                    return (
                      <div key={svc}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: TM }}>{svcName(svc)}</span>
                          <span style={{ fontSize: '0.8rem', color: G, fontWeight: 600 }}>{cnt} ({pct}%)</span>
                        </div>
                        <div style={{ height: 5, background: B3, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${GD},${GL})`, borderRadius: 99, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Utilization + cancellation rate */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.875rem', marginTop: '1rem' }}>
              {[
                { label: 'תפוסה היום',       value: `${utilToday}%`,      sub: `${todayAppts.filter(a => a.status !== 'cancelled').length}/${TIME_SLOTS.length} שעות`, color: utilToday >= 60 ? '#22c55e' : G },
                { label: 'תפוסה השבוע',      value: `${utilWeek}%`,       sub: 'מהשעות הזמינות',                                          color: utilWeek >= 60 ? '#22c55e' : G },
                { label: 'שיעור ביטולים',     value: `${cancelRateMonth}%`, sub: `${monthCancelled} מתוך ${monthAppts.length} החודש`,        color: cancelRateMonth > 15 ? '#ef4444' : GL },
              ].map(k => (
                <div key={k.label} style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.1rem 1.25rem' }}>
                  <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.4rem' }}>{k.label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, color: k.color, lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: '0.7rem', color: TD, marginTop: '0.3rem' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Shop comparison */}
            {shopAvgMonthRevenuePerBarber > 0 && (
              <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>השוואה לממוצע המספרה</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: TM, marginBottom: '0.25rem' }}>הכנסה חודשית שלך מול ממוצע ספר</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: vsShopMonth >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {vsShopMonth >= 0 ? '+' : ''}{vsShopMonth}% <span style={{ fontSize: '0.7rem', color: TD, fontWeight: 400 }}>(₪{monthRev} מול ₪{shopAvgMonthRevenuePerBarber})</span>
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: TM, marginBottom: '0.25rem' }}>הכנסה ממוצעת לתור שלך מול ממוצע</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: vsShopAvgAppt >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {vsShopAvgAppt >= 0 ? '+' : ''}{vsShopAvgAppt}% <span style={{ fontSize: '0.7rem', color: TD, fontWeight: 400 }}>(₪{avgRevenue} מול ₪{shopAvgRevenuePerAppt})</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly goal */}
            <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1rem' }}>יעד הכנסה חודשי</p>
              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginBottom: monthlyGoal > 0 ? '1rem' : 0, flexWrap: 'wrap' }}>
                <input type="number" placeholder="לדוגמה: 5000" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                  style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.75rem', color: T, fontSize: '0.85rem', width: 140 }} />
                <button onClick={saveGoal}
                  style={{ padding: '0.5rem 1.25rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                  שמור יעד
                </button>
                {monthlyGoal > 0 && <span style={{ fontSize: '0.75rem', color: TD }}>יעד נוכחי: ₪{monthlyGoal}</span>}
              </div>
              {monthlyGoal > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: TM }}>₪{monthRev} מתוך ₪{monthlyGoal}</span>
                    <span style={{ fontSize: '0.8rem', color: G, fontWeight: 600 }}>{goalPct}%</span>
                  </div>
                  <div style={{ height: 8, background: B3, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${goalPct}%`, background: `linear-gradient(90deg,${GD},${GL})`, borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ APPOINTMENTS TAB ═════════════════════════════════ */}
        {tab === 'appointments' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.25rem' }}>ניהול</p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>התורים שלי</h1>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {([
                { id: 'today',    label: 'היום' },
                { id: 'week',     label: 'השבוע' },
                { id: 'upcoming', label: 'כל הממתינים' },
                { id: 'past',     label: 'עבר' },
              ] as const).map(f => (
                <button key={f.id} onClick={() => setListFilter(f.id)}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: 999, border: `1px solid ${listFilter === f.id ? BDRG : BDR}`, background: listFilter === f.id ? GG : B2, color: listFilter === f.id ? GL : TM, fontSize: '0.8rem', fontWeight: listFilter === f.id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {f.label}
                </button>
              ))}
              <span style={{ fontSize: '0.75rem', color: TD, display: 'flex', alignItems: 'center', paddingRight: '0.5rem' }}>{filteredList.length} תורים</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <div style={{ width: 28, height: 28, border: `2px solid ${G}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'barber-spin 0.8s linear infinite' }} />
              </div>
            ) : filteredList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: TD }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: TM, marginBottom: '0.4rem' }}>אין תורים</p>
                <p style={{ fontSize: '0.85rem' }}>לא נמצאו תורים לפי הסינון הנוכחי</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {filteredList.map(a => (
                  <ApptCard key={a.id} appt={a} onUpdate={updateStatus} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Block Modal ─────────────────────────────────────────── */}
      {blockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setBlockModal(null); }}>
          <div style={{ background: B1, border: `1px solid ${BDR}`, borderRadius: RL, padding: '2rem', width: '100%', maxWidth: 360, direction: 'rtl' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: T, marginBottom: '0.25rem' }}>חסימת שעה</p>
            <p style={{ fontSize: '0.8rem', color: TM, marginBottom: '1.5rem' }}>
              {DAY_FULL[new Date(blockModal.date + 'T12:00:00').getDay()]} · {fmtDate(blockModal.date)} · <span style={{ color: G, fontWeight: 600 }}>{blockModal.time}</span>
            </p>

            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>סיבת חסימה</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {BLOCK_REASONS.map(r => (
                <button key={r} onClick={() => setBlockReason(r)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: 999, border: `1px solid ${blockReason === r ? BDRG : BDR}`, background: blockReason === r ? GG : B2, color: blockReason === r ? GL : TM, fontSize: '0.8rem', cursor: 'pointer', fontWeight: blockReason === r ? 600 : 400 }}>
                  {r}
                </button>
              ))}
            </div>

            {blockReason === 'אחר' && (
              <input
                placeholder="תאר את הסיבה..."
                value={blockCustom}
                onChange={e => setBlockCustom(e.target.value)}
                style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box', direction: 'rtl' }}
              />
            )}

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={blockSlot} disabled={blocking}
                style={{ flex: 1, padding: '0.75rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                {blocking ? 'חוסם...' : '🔒 חסום שעה'}
              </button>
              <button onClick={() => setBlockModal(null)}
                style={{ padding: '0.75rem 1.25rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, color: TM, fontSize: '0.875rem', cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Premium Slot Modal ───────────────────────────────────── */}
      {premiumModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setPremiumModalOpen(false); }}>
          <div style={{ background: B1, border: `1px solid ${PG_BDR}`, borderRadius: RL, padding: '2rem', width: '100%', maxWidth: 360, direction: 'rtl' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: PG, marginBottom: '1.5rem' }}>⭐ פתיחת תור פרמיום</p>

            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>תאריך</label>
            <input type="date" value={premiumDate} min={getToday()} onChange={e => setPremiumDate(e.target.value)}
              style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>שעה</label>
            <select value={premiumTime} onChange={e => setPremiumTime(e.target.value)}
              style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }}>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>שירות</label>
            <select value={premiumService} onChange={e => setPremiumService(e.target.value)}
              style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }}>
              {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>מחיר פרמיום (₪)</label>
            <input type="number" placeholder="לדוגמה: 150" value={premiumPriceInput} onChange={e => setPremiumPriceInput(e.target.value)}
              style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.625rem 0.875rem', color: T, fontSize: '0.875rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }} />

            {premiumError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>
                {premiumError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={submitPremiumSlot} disabled={premiumSubmitting}
                style={{ flex: 1, padding: '0.75rem', background: `linear-gradient(135deg,#B8932E,${PG})`, border: 'none', borderRadius: R, color: '#080808', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                {premiumSubmitting ? 'פותח...' : '⭐ פתח תור'}
              </button>
              <button onClick={() => setPremiumModalOpen(false)}
                style={{ padding: '0.75rem 1.25rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, color: TM, fontSize: '0.875rem', cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes barber-spin { to { transform: rotate(360deg); } }
        .cal-empty-cell:hover { background: rgba(178,102,255,0.04) !important; }
        .cal-empty-cell:hover span { color: var(--adm-td) !important; }
      `}</style>
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────
function ApptCard({ appt: a, onUpdate }: { appt: Appointment; onUpdate: (id: string, s: string) => void }) {
  const cfg = S_CFG[a.status as keyof typeof S_CFG] ?? { label: a.status, color: TD, bg: B3, bdr: BDR };
  return (
    <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: T }}>{a.is_premium && '⭐ '}{a.name}</p>
          <a href={`tel:${a.phone}`} style={{ fontSize: '0.75rem', color: TM, textDecoration: 'none' }}>📞 {a.phone}</a>
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: G, lineHeight: 1 }}>{a.time}</p>
          <p style={{ fontSize: '0.6rem', color: TD, marginTop: '0.125rem' }}>{fmtDate(a.date)}</p>
          <span style={{ display: 'inline-block', marginTop: 4, padding: '0.12rem 0.5rem', borderRadius: 999, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}` }}>
            {cfg.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: TM }}>{svcName(a.service)}</span>
        <span style={{ fontSize: '0.7rem', color: TD }}>· ₪{apptPrice(a)}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {a.status === 'approved' && (
          <>
            <button onClick={() => onUpdate(a.id, 'in_progress')}
              style={{ flex: 1, minWidth: 100, padding: '0.5rem', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              ▶ התחל טיפול
            </button>
            <button onClick={() => onUpdate(a.id, 'cancelled')}
              style={{ flex: 1, minWidth: 80, padding: '0.5rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              ✕ בטל תור
            </button>
            <a href={cancelWaLink(a)} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 80, padding: '0.5rem', borderRadius: 8, background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.30)', color: '#25D366', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              💬 הודעת ביטול
            </a>
          </>
        )}
        {a.status === 'in_progress' && (
          <>
            <button onClick={() => onUpdate(a.id, 'completed')}
              style={{ flex: 1, minWidth: 100, padding: '0.5rem', borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.28)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              ✓ סיים טיפול
            </button>
            <button onClick={() => onUpdate(a.id, 'cancelled')}
              style={{ flex: 1, minWidth: 80, padding: '0.5rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              ✕ בטל
            </button>
            <a href={cancelWaLink(a)} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: 80, padding: '0.5rem', borderRadius: 8, background: 'rgba(37,211,102,0.10)', border: '1px solid rgba(37,211,102,0.30)', color: '#25D366', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              💬 הודעת ביטול
            </a>
          </>
        )}
        {(a.status === 'cancelled' || a.status === 'completed') && (
          <button onClick={() => onUpdate(a.id, 'approved')}
            style={{ padding: '0.45rem 1rem', borderRadius: 8, background: B3, border: `1px solid ${BDR}`, color: TM, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            ↺ שחזר לתור פעיל
          </button>
        )}
      </div>
    </div>
  );
}
