'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Appointment } from '@/lib/supabase';
import { SERVICES, TIME_SLOTS } from '@/lib/services';
import { DEFAULT_WA_TEMPLATES, WA_TEMPLATE_KEYS, WA_TEMPLATE_LABELS, WA_PLACEHOLDER_HELP, WaTemplateKey } from '@/lib/waTemplates';

// ── Admin palette — theme-aware via CSS variables ─────────────
// Defaults (dark) live in :root; [data-admin-theme="light"] overrides
// them in globals.css, toggled by the theme switch below.

const G   = 'var(--adm-g)';
const GL  = 'var(--adm-gl)';
const GD  = 'var(--adm-gd)';
const GG  = 'var(--adm-gg)';
const B0  = 'var(--adm-b0)';
const B1  = 'var(--adm-b1)';
const B2  = 'var(--adm-b2)';
const B3  = 'var(--adm-b3)';
const B4  = 'var(--adm-b4)';
const T   = 'var(--adm-t)';
const TM  = 'var(--adm-tm)';
const TD  = 'var(--adm-td)';
const BDR = 'var(--adm-bdr)';
const BDRG= 'var(--adm-bdrg)';
const R   = 12;
const RL  = 18;

// ── Constants ────────────────────────────────────────────────

const PRICE_MAP: Record<string, number> = {
  haircut: 60, beard: 40, 'haircut-beard': 90, kids: 40, fade: 70,
};

const S_CFG = {
  pending:     { label: 'ממתין',   color: '#f59e0b', bg: 'rgba(245,158,11,0.14)',   bdr: 'rgba(245,158,11,0.30)'  },
  approved:    { label: 'מאושר',   color: '#22c55e', bg: 'rgba(34,197,94,0.14)',    bdr: 'rgba(34,197,94,0.30)'   },
  rejected:    { label: 'נדחה',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    bdr: 'rgba(239,68,68,0.25)'   },
  in_progress: { label: 'בטיפול', color: '#3b82f6', bg: 'rgba(59,130,246,0.14)',  bdr: 'rgba(59,130,246,0.28)'  },
  completed:   { label: 'הושלם',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  bdr: 'rgba(16,185,129,0.25)'  },
  cancelled:   { label: 'בוטל',   color: '#6b7280', bg: 'rgba(107,114,128,0.10)', bdr: 'rgba(107,114,128,0.22)' },
} as const;

const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DAY_FULL  = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

type DayHours = { open: boolean; from: string; to: string };
const DEFAULT_HOURS: Record<number, DayHours> = {
  0: { open: true,  from: '09:00', to: '19:00' },
  1: { open: true,  from: '09:00', to: '19:00' },
  2: { open: true,  from: '09:00', to: '19:00' },
  3: { open: true,  from: '09:00', to: '19:00' },
  4: { open: true,  from: '09:00', to: '19:00' },
  5: { open: true,  from: '09:00', to: '14:00' },
  6: { open: false, from: '09:00', to: '14:00' },
};

// ── Helpers ───────────────────────────────────────────────────

function svcName(id: string) { return SERVICES.find(s => s.id === id)?.name ?? id; }

function fmtDate(d: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  const months = ['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
}

function getToday() { return new Date().toISOString().split('T')[0]; }

function getWeekDays(ref: string): string[] {
  const d = new Date(ref);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(sun);
    dt.setDate(sun.getDate() + i);
    return dt.toISOString().split('T')[0];
  });
}

function fillTemplate(template: string, a: Appointment): string {
  return template
    .replace(/\{\{name\}\}/g, a.name)
    .replace(/\{\{service\}\}/g, svcName(a.service))
    .replace(/\{\{date\}\}/g, fmtDate(a.date))
    .replace(/\{\{time\}\}/g, a.time)
    .replace(/\{\{price\}\}/g, String(PRICE_MAP[a.service] ?? 0));
}

function waLink(a: Appointment, template: string) {
  const msg = fillTemplate(template, a);
  const phone = a.phone.replace(/\D/g, '');
  const intl = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

function playChime(sharedCtx?: AudioContext | null) {
  try {
    const ctx = sharedCtx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    const ring = () => {
      [[880, 0], [1108, 0.18], [880, 0.36], [880, 0.9], [1108, 1.08], [1320, 1.26]].forEach(([freq, t]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.35);
      });
    };
    if (ctx.state === 'suspended') ctx.resume().then(ring).catch(() => {});
    else ring();
  } catch {}
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  } catch {}
}

// Keeps the shared AudioContext from being auto-suspended by the browser
// when idle, so the chime can still fire later without a fresh tap.
function startAudioKeepAlive(ctx: AudioContext) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 20;
    gain.gain.value = 0.00001;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
  } catch {}
}

function exportCSV(appts: Appointment[]) {
  const h = ['שם','טלפון','שירות','תאריך','שעה','סטטוס','מחיר'];
  const rows = appts.map(a => [
    a.name, a.phone, svcName(a.service), a.date, a.time,
    S_CFG[a.status as keyof typeof S_CFG]?.label ?? a.status,
    `₪${PRICE_MAP[a.service] ?? 0}`,
  ]);
  const csv = [h, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const el = Object.assign(document.createElement('a'), { href: url, download: `תורים_${getToday()}.csv` });
  document.body.appendChild(el); el.click();
  document.body.removeChild(el); URL.revokeObjectURL(url);
}

// ── Types ─────────────────────────────────────────────────────

type Tab = 'dashboard' | 'appointments' | 'calendar' | 'settings';
type Filter = 'all' | 'approved' | 'completed' | 'rejected' | 'cancelled';

interface TabProps {
  appointments: Appointment[];
  blockedSlots: { date: string; time: string }[];
  updateStatus: (id: string, s: 'approved' | 'rejected' | 'completed' | 'cancelled') => void;
  blockSlot: (date: string, time: string) => void;
  unblockSlot: (date: string, time: string) => void;
  hours: Record<number, DayHours>;
  setHours: (h: Record<number, DayHours>) => void;
  returningPhones: Set<string>;
  today: string;
  loading: boolean;
  templates: Record<WaTemplateKey, string>;
  updateTemplates: (t: Record<WaTemplateKey, string>) => Promise<void>;
}

// ── Main ──────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<{ date: string; time: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState<Tab>('dashboard');
  const [hours, setHoursState] = useState<Record<number, DayHours>>(DEFAULT_HOURS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [templates, setTemplates] = useState<Record<WaTemplateKey, string>>(DEFAULT_WA_TEMPLATES);
  const [newSinceLogin, setNewSinceLogin] = useState<Appointment[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Mobile browsers block audio until a real user gesture happens —
  // unlock (create + resume) the shared AudioContext on first tap so
  // the new-booking chime can actually play later from the poll.
  useEffect(() => {
    let keptAlive = false;
    function unlock() {
      if (!audioCtxRef.current) {
        try {
          const AC = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AC();
        } catch { return; }
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      if (!keptAlive) {
        keptAlive = true;
        startAudioKeepAlive(ctx);
      }
    }
    function onVisible() {
      if (document.visibilityState === 'visible' && audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem('barber_hours');
      if (s) setHoursState(JSON.parse(s));
      const t = localStorage.getItem('barber_admin_theme');
      if (t === 'light' || t === 'dark') setTheme(t);
    } catch {}
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('barber_admin_theme', next);
  }

  function setHours(h: Record<number, DayHours>) {
    setHoursState(h);
    localStorage.setItem('barber_hours', JSON.stringify(h));
  }

  async function login() {
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setAuthed(true); loadAll(); }
    else setAuthError('סיסמה שגויה');
  }

  async function loadAll() {
    setLoading(true);
    const res = await fetch('/api/admin/data');
    if (res.ok) {
      const json = await res.json();
      const appts = (json.appointments as Appointment[]) ?? [];
      setAppointments(appts);
      setBlockedSlots(json.blockedSlots ?? []);
      setTemplates({ ...DEFAULT_WA_TEMPLATES, ...(json.templates ?? {}) });

      let lastSeen = Date.now();
      try {
        const stored = localStorage.getItem('barber_last_seen_ts');
        if (stored !== null) lastSeen = Number(stored);
      } catch {}
      const fresh = appts
        .filter(a => new Date(a.created_at).getTime() > lastSeen)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (fresh.length > 0) {
        setNewSinceLogin(fresh);
        playChime(audioCtxRef.current);
      }
      try { localStorage.setItem('barber_last_seen_ts', String(Date.now())); } catch {}
    }
    setLoading(false);
  }

  async function updateTemplates(next: Record<WaTemplateKey, string>) {
    const res = await fetch('/api/admin/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: next }),
    });
    if (res.ok) setTemplates(next);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected' | 'completed' | 'cancelled') {
    await fetch('/api/admin/update-status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function blockSlot(date: string, time: string) {
    await fetch('/api/admin/blocked-slots', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: [{ date, time }] }),
    });
    setBlockedSlots(prev => [...prev, { date, time }]);
  }

  async function unblockSlot(date: string, time: string) {
    await fetch('/api/admin/blocked-slots', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: [{ date, time }] }),
    });
    setBlockedSlots(prev => prev.filter(s => !(s.date === date && s.time === time)));
  }

  useEffect(() => {
    if (!authed) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const interval = setInterval(async () => {
      const res = await fetch('/api/admin/data');
      if (!res.ok) return;
      const json = await res.json();
      const fresh = (json.appointments as Appointment[]) ?? [];
      setAppointments(prev => {
        const prevIds = new Set(prev.map(a => a.id));
        const newOnes = fresh.filter(a => !prevIds.has(a.id));
        if (newOnes.length > 0) {
          playChime(audioCtxRef.current);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const nw = newOnes[0];
            new Notification('תור חדש! 💈', { body: `${nw.name} · ${fmtDate(nw.date)} ${nw.time}` });
          }
        }
        return fresh;
      });
      setBlockedSlots(json.blockedSlots ?? []);
    }, 10000);
    return () => clearInterval(interval);
  }, [authed]);

  /* ── Login screen ─────────────────────────────────────── */
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${GG} 0%, transparent 70%), ${B0}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BDR}`, borderRadius: RL, padding: '2.5rem', backdropFilter: 'blur(20px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 54, height: 54, margin: '0 auto 0.875rem', borderRadius: '50%', background: `linear-gradient(135deg,${GD},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${GG}` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: T }}>ברבר פרמיום</p>
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: G, marginTop: '0.25rem' }}>פאנל ניהול</p>
        </div>
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${BDR},transparent)`, marginBottom: '1.5rem' }} />
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>סיסמת ספר</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} autoFocus
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: R, padding: '0.875rem 1rem', color: T, fontSize: '1rem', outline: 'none', direction: 'rtl' }} />
        </div>
        {authError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.625rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>{authError}</div>}
        <button onClick={login} style={{ width: '100%', padding: '0.875rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: `0 4px 16px ${GG}` }}>
          כניסה
        </button>
      </div>
    </div>
  );

  const today = getToday();
  const returningPhones = (() => {
    const c: Record<string, number> = {};
    appointments.forEach(a => { c[a.phone] = (c[a.phone] ?? 0) + 1; });
    return new Set(Object.keys(c).filter(p => c[p] > 1));
  })();

  const props: TabProps = { appointments, blockedSlots, updateStatus, blockSlot, unblockSlot, hours, setHours, returningPhones, today, loading, templates, updateTemplates };

  return (
    <div data-admin-theme={theme} style={{ display: 'flex', minHeight: '100vh', background: B0, color: T, direction: 'rtl', fontFamily: 'var(--font-body)', transition: 'background 0.25s ease, color 0.25s ease' }}>
      {newSinceLogin.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ width: '100%', maxWidth: 380, background: B1, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.75rem', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 54, height: 54, margin: '0 auto 0.75rem', borderRadius: '50%', background: `linear-gradient(135deg,${GD},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${GG}`, fontSize: '1.5rem' }}>
                🔔
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600, color: T }}>
                {newSinceLogin.length} תור{newSinceLogin.length > 1 ? 'ים' : ''} חדש{newSinceLogin.length > 1 ? 'ים' : ''}!
              </p>
              <p style={{ fontSize: '0.75rem', color: TM, marginTop: '0.25rem' }}>מאז הביקור האחרון שלך</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {newSinceLogin.map(a => (
                <div key={a.id} style={{ background: B0, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.75rem 0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: T, fontSize: '0.9rem' }}>{a.name}</span>
                    <span style={{ color: G, fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDate(a.date)} · {a.time}</span>
                  </div>
                  <div style={{ color: TM, fontSize: '0.8rem' }}>{svcName(a.service)} · {a.phone}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setNewSinceLogin([])} style={{ width: '100%', padding: '0.875rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', boxShadow: `0 4px 16px ${GG}` }}>
              הבנתי
            </button>
          </div>
        </div>
      )}
      <Sidebar tab={tab} setTab={setTab} onLogout={() => setAuthed(false)} onExport={() => exportCSV(appointments)} theme={theme} onToggleTheme={toggleTheme} />
      <main style={{ flex: 1, overflow: 'auto', paddingBottom: '4.5rem' }}>
        {tab === 'dashboard'    && <DashboardTab    {...props} />}
        {tab === 'appointments' && <AppointmentsTab {...props} />}
        {tab === 'calendar'     && <CalendarTab     {...props} />}
        {tab === 'settings'     && <SettingsTab     {...props} />}
      </main>
      <MobileNav tab={tab} setTab={setTab} theme={theme} onToggleTheme={toggleTheme} />
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────

function Sidebar({ tab, setTab, onLogout, onExport, theme, onToggleTheme }: {
  tab: Tab; setTab: (t: Tab) => void;
  onLogout: () => void; onExport: () => void;
  theme: 'dark' | 'light'; onToggleTheme: () => void;
}) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: 'dashboard',    icon: '▦', label: 'לוח בקרה' },
    { id: 'appointments', icon: '≡', label: 'תורים' },
    { id: 'calendar',     icon: '◫', label: 'לוח שנה' },
    { id: 'settings',     icon: '⚙', label: 'הגדרות' },
  ];
  return (
    <aside style={{ width: 200, background: B1, borderLeft: `1px solid ${BDR}`, display: 'flex', flexDirection: 'column', padding: '1.5rem 0', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}
      className="admin-sidebar">
      {/* Brand */}
      <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: `1px solid ${BDR}` }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: T }}>ברבר</p>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginTop: '0.1rem' }}>Management</p>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {items.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', borderRadius: R, border: 'none', cursor: 'pointer',
            background: tab === item.id ? `rgba(178,102,255,0.12)` : 'transparent',
            color: tab === item.id ? GL : TM,
            fontSize: '0.875rem', fontWeight: tab === item.id ? 600 : 400,
            transition: 'all 0.2s', textAlign: 'right', position: 'relative',
          }}>
            <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
            {tab === item.id && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: G, borderRadius: 2 }} />}
          </button>
        ))}
      </nav>
      {/* Footer actions */}
      <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: `1px solid ${BDR}`, paddingTop: '1rem' }}>
        <button onClick={onToggleTheme} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: R, border: 'none', cursor: 'pointer', background: 'transparent', color: TM, fontSize: '0.8rem', textAlign: 'right' }}>
          <span>{theme === 'dark' ? '☀' : '☾'}</span><span>{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</span>
        </button>
        <button onClick={onExport} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: R, border: 'none', cursor: 'pointer', background: 'transparent', color: TM, fontSize: '0.8rem', textAlign: 'right' }}>
          <span>↓</span><span>ייצוא CSV</span>
        </button>
        <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', borderRadius: R, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(239,68,68,0.6)', fontSize: '0.8rem', textAlign: 'right' }}>
          <span>⏻</span><span>יציאה</span>
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ tab, setTab, theme, onToggleTheme }: { tab: Tab; setTab: (t: Tab) => void; theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'admin-responsive';
    if (!document.getElementById('admin-responsive')) {
      style.textContent = `
        @media (max-width: 640px) {
          .admin-sidebar { display: none !important; }
          .admin-mobile-nav { display: block !important; }
        }
      `;
      document.head.appendChild(style);
    }
    return () => { document.getElementById('admin-responsive')?.remove(); };
  }, []);
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '▦', label: 'ראשי' },
    { id: 'appointments', icon: '≡', label: 'תורים' },
    { id: 'calendar', icon: '◫', label: 'לוח שנה' },
    { id: 'settings', icon: '⚙', label: 'הגדרות' },
  ];
  return (
    <nav style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: B1, borderTop: `1px solid ${BDR}`, zIndex: 50 }} className="admin-mobile-nav">
      <div style={{ display: 'flex' }}>
        {items.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            flex: 1, padding: '0.75rem 0.25rem', border: 'none', cursor: 'pointer',
            background: 'transparent', color: tab === item.id ? G : TD,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', position: 'relative',
          }}>
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span style={{ fontSize: '0.55rem', letterSpacing: '0.05em' }}>{item.label}</span>
          </button>
        ))}
        <button onClick={onToggleTheme} style={{
          flex: 1, padding: '0.75rem 0.25rem', border: 'none', cursor: 'pointer',
          background: 'transparent', color: TD,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
        }}>
          <span style={{ fontSize: '1.1rem' }}>{theme === 'dark' ? '☀' : '☾'}</span>
          <span style={{ fontSize: '0.55rem', letterSpacing: '0.05em' }}>{theme === 'dark' ? 'בהיר' : 'כהה'}</span>
        </button>
      </div>
    </nav>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────

function DashboardTab({ appointments, today }: TabProps) {
  const weekDays = getWeekDays(today);
  const weekAppts = appointments.filter(a => weekDays.includes(a.date));
  const monthAppts = appointments.filter(a => a.date.startsWith(today.slice(0, 7)));
  const todayAppts = appointments.filter(a => a.date === today);
  const todayCompleted = todayAppts.filter(a => a.status === 'completed').length;
  const weekRevenue = weekAppts.filter(a => a.status === 'approved').reduce((s, a) => s + (PRICE_MAP[a.service] ?? 0), 0);
  const weekApproved = weekAppts.filter(a => a.status === 'approved').length;
  const weekRate = weekAppts.length ? Math.round(weekApproved / weekAppts.length * 100) : 0;

  const svcCount: Record<string, number> = {};
  appointments.forEach(a => { svcCount[a.service] = (svcCount[a.service] ?? 0) + 1; });
  const maxSvc = Math.max(...Object.values(svcCount), 1);

  const hrCount: Record<string, number> = {};
  for (let h = 9; h < 19; h++) hrCount[`${h}:00`] = 0;
  appointments.forEach(a => { const k = a.time.split(':')[0] + ':00'; if (k in hrCount) hrCount[k]++; });
  const maxHr = Math.max(...Object.values(hrCount), 1);

  const kpi = [
    { label: 'תורים היום', value: todayAppts.length, sub: `${todayCompleted} הושלמו`, color: G },
    { label: 'הכנסות השבוע', value: `₪${weekRevenue}`, sub: `${weekAppts.length} תורים`, color: GL },
    { label: 'תורים בחודש', value: monthAppts.length, sub: `${monthAppts.filter(a => a.status === 'approved').length} מאושרים`, color: G },
    { label: 'אחוז אישור', value: `${weekRate}%`, sub: 'השבוע', color: weekRate >= 80 ? '#22c55e' : G },
  ];

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: G, marginBottom: '0.25rem' }}>שלום, ספר ✂️</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>לוח בקרה</h1>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpi.map(k => (
          <div key={k.label} style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: TM, marginBottom: '0.5rem' }}>{k.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: k.color, lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: '0.72rem', color: TD, marginTop: '0.375rem' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Popular services */}
        <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1.25rem' }}>שירותים פופולריים</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {SERVICES.map(s => {
              const cnt = svcCount[s.id] ?? 0;
              const pct = cnt / maxSvc * 100;
              return (
                <div key={s.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.8rem', color: T }}>{s.name}</span>
                    <span style={{ fontSize: '0.75rem', color: G, fontWeight: 600 }}>{cnt}</span>
                  </div>
                  <div style={{ height: 5, background: B4, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${GD},${GL})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Busiest hours */}
        <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1.25rem' }}>שעות עמוסות</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem', height: 80 }}>
            {Object.entries(hrCount).map(([hr, cnt]) => (
              <div key={hr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '100%', background: cnt > 0 ? `rgba(178,102,255,${0.2 + (cnt / maxHr) * 0.75})` : B4, borderRadius: '2px 2px 0 0', height: `${Math.max(4, (cnt / maxHr) * 72)}px`, transition: 'height 0.8s ease' }} />
                <span style={{ fontSize: '0.45rem', color: TD, whiteSpace: 'nowrap' }}>{hr.replace(':00', '')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Appointments Tab ──────────────────────────────────────────

function AppointmentsTab({ appointments, updateStatus, returningPhones, today, templates }: TabProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [svcFilter, setSvcFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  let filtered = appointments;
  if (filter !== 'all') filtered = filtered.filter(a => a.status === filter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(a => a.name.toLowerCase().includes(q) || a.phone.includes(q));
  }
  if (svcFilter !== 'all') filtered = filtered.filter(a => a.service === svcFilter);
  if (fromDate) filtered = filtered.filter(a => a.date >= fromDate);
  if (toDate) filtered = filtered.filter(a => a.date <= toDate);

  const grouped: Record<string, Appointment[]> = filtered.reduce((acc, a) => {
    (acc[a.date] ??= []).push(a); return acc;
  }, {} as Record<string, Appointment[]>);
  const dates = Object.keys(grouped).sort();

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll() { setSelected(new Set(filtered.map(a => a.id))); }
  function clearSelect() { setSelected(new Set()); }

  function bulkApprove() {
    selected.forEach(id => updateStatus(id, 'approved'));
    clearSelect();
  }
  function bulkReject() {
    selected.forEach(id => updateStatus(id, 'rejected'));
    clearSelect();
  }

  const counts = {
    all: appointments.length,
    approved: appointments.filter(a => a.status === 'approved').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    rejected: appointments.filter(a => a.status === 'rejected').length,
  };
  const filterTabs: { id: Filter; label: string; color: string }[] = [
    { id: 'all',       label: `הכל (${counts.all})`,       color: G },
    { id: 'approved',  label: `מאושרים (${counts.approved})`, color: '#22c55e' },
    { id: 'completed', label: `הושלמו (${counts.completed})`, color: '#10b981' },
    { id: 'rejected',  label: `נדחו (${counts.rejected})`,    color: '#ef4444' },
  ];

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>תורים</h1>
      </div>

      {/* Search + filters */}
      <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: TD, fontSize: '0.875rem', pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש לפי שם או טלפון..."
            style={{ width: '100%', background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.75rem 2.5rem 0.75rem 1rem', color: T, fontSize: '0.875rem', outline: 'none', direction: 'rtl' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={svcFilter} onChange={e => setSvcFilter(e.target.value)}
            style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.875rem', color: T, fontSize: '0.8rem', cursor: 'pointer', direction: 'rtl' }}>
            <option value="all">כל השירותים</option>
            {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.875rem', color: T, fontSize: '0.8rem', cursor: 'pointer' }} />
          <span style={{ color: TM, alignSelf: 'center', fontSize: '0.8rem' }}>עד</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.5rem 0.875rem', color: T, fontSize: '0.8rem', cursor: 'pointer' }} />
          {(fromDate || toDate || svcFilter !== 'all' || search) && (
            <button onClick={() => { setSearch(''); setSvcFilter('all'); setFromDate(''); setToDate(''); }}
              style={{ padding: '0.5rem 0.875rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: R, color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>
              נקה
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {filterTabs.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '0.45rem 1rem', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            background: filter === f.id ? `rgba(178,102,255,0.15)` : B3,
            color: filter === f.id ? GL : TM,
            outline: filter === f.id ? `1px solid ${BDRG}` : `1px solid ${BDR}`,
          }}>{f.label}</button>
        ))}
        {selected.size > 0 && (
          <button onClick={selectAll} style={{ padding: '0.45rem 0.875rem', borderRadius: 999, border: `1px solid ${BDR}`, background: 'transparent', color: TM, fontSize: '0.75rem', cursor: 'pointer' }}>
            בחר הכל
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div style={{ background: GG, border: `1px solid ${BDRG}`, borderRadius: RL, padding: '0.875rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ color: GL, fontWeight: 600, fontSize: '0.875rem' }}>{selected.size} נבחרו</span>
          <button onClick={bulkApprove} style={{ padding: '0.45rem 1rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22c55e', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✓ אשר הכל</button>
          <button onClick={bulkReject} style={{ padding: '0.45rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>✗ דחה הכל</button>
          <button onClick={clearSelect} style={{ marginRight: 'auto', padding: '0.45rem 0.875rem', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 8, color: TM, fontSize: '0.75rem', cursor: 'pointer' }}>ביטול</button>
        </div>
      )}

      {/* List view */}
      {dates.length === 0
        ? <div style={{ textAlign: 'center', padding: '4rem 0', color: TD }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: TM, marginBottom: '0.5rem' }}>אין תורים</p>
            <p style={{ fontSize: '0.875rem' }}>לא נמצאו תורים לפי הסינון שנבחר</p>
          </div>
        : dates.map(date => (
            <div key={date} style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: date === today ? G : T }}>
                  {date === today ? '📅 היום' : fmtDate(date)}
                </p>
                <div style={{ flex: 1, height: 1, background: BDR }} />
                <span style={{ fontSize: '0.7rem', color: TD }}>{grouped[date].length} תורים</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {grouped[date].map(a => (
                  <FullAppCard key={a.id} appt={a} selected={selected.has(a.id)} onToggle={() => toggleSelect(a.id)}
                    onUpdate={updateStatus} isReturning={returningPhones.has(a.phone)} templates={templates} />
                ))}
              </div>
            </div>
          ))
      }
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────

function CalendarTab({ appointments, updateStatus, templates }: TabProps) {
  const [weekRef, setWeekRef] = useState(getToday());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const weekDays = getWeekDays(weekRef);
  const today = getToday();

  function prevWeek() {
    const d = new Date(weekRef); d.setDate(d.getDate() - 7);
    setWeekRef(d.toISOString().split('T')[0]);
  }
  function nextWeek() {
    const d = new Date(weekRef); d.setDate(d.getDate() + 7);
    setWeekRef(d.toISOString().split('T')[0]);
  }

  const HOURS = Array.from({ length: 11 }, (_, i) => `${i + 9}:00`);
  const TOTAL_MIN = 10 * 60; // 9:00–19:00

  function apptTop(time: string) {
    const [h, m] = time.split(':').map(Number);
    return ((h - 9) * 60 + m) / TOTAL_MIN * 100;
  }
  function apptHeight(serviceId: string) {
    const dur = SERVICES.find(s => s.id === serviceId)?.duration ?? 30;
    return dur / TOTAL_MIN * 100;
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T }}>לוח שנה</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={prevWeek} style={{ padding: '0.5rem 1rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, color: TM, cursor: 'pointer', fontSize: '0.9rem' }}>‹</button>
          <span style={{ fontSize: '0.85rem', color: T, fontWeight: 500, minWidth: 120, textAlign: 'center' }}>
            {fmtDate(weekDays[0])} – {fmtDate(weekDays[6])}
          </span>
          <button onClick={nextWeek} style={{ padding: '0.5rem 1rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, color: TM, cursor: 'pointer', fontSize: '0.9rem' }}>›</button>
          <button onClick={() => setWeekRef(getToday())} style={{ padding: '0.5rem 0.875rem', background: GG, border: `1px solid ${BDRG}`, borderRadius: R, color: GL, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
            היום
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 620 }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', borderBottom: `1px solid ${BDR}` }}>
              <div />
              {weekDays.map((day, i) => {
                const isToday = day === today;
                const cnt = appointments.filter(a => a.date === day).length;
                return (
                  <div key={day} style={{ padding: '0.875rem 0.25rem', textAlign: 'center', borderRight: i > 0 ? `1px solid ${BDR}` : 'none', background: isToday ? GG : 'transparent' }}>
                    <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: isToday ? G : TD, textTransform: 'uppercase', marginBottom: '0.2rem' }}>{DAY_NAMES[i]}</p>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: isToday ? GL : T }}>{parseInt(day.split('-')[2])}</p>
                    {cnt > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: isToday ? G : GD, margin: '0.2rem auto 0' }} />}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', height: 520, overflowY: 'auto' }}>
              {/* Time axis */}
              <div style={{ position: 'relative' }}>
                {HOURS.map((h, i) => (
                  <div key={h} style={{ position: 'absolute', top: `${i / 10 * 100}%`, right: 0, left: 0, display: 'flex', alignItems: 'flex-start', paddingRight: '0.375rem' }}>
                    <span style={{ fontSize: '0.55rem', color: TD }}>{h}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, di) => {
                const dayAppts = appointments.filter(a => a.date === day);
                const isToday = day === today;
                return (
                  <div key={day} style={{ position: 'relative', borderRight: di > 0 ? `1px solid ${BDR}` : 'none', background: isToday ? 'rgba(178,102,255,0.02)' : 'transparent', minHeight: '100%' }}>
                    {/* Hour lines */}
                    {HOURS.map((_, hi) => (
                      <div key={hi} style={{ position: 'absolute', top: `${hi / 10 * 100}%`, left: 0, right: 0, height: 1, background: BDR }} />
                    ))}
                    {/* Appointments */}
                    {dayAppts.map(a => {
                      const cfg = S_CFG[a.status as keyof typeof S_CFG];
                      return (
                        <div key={a.id} onClick={() => setSelectedAppt(a === selectedAppt ? null : a)}
                          style={{
                            position: 'absolute',
                            top: `${apptTop(a.time)}%`,
                            height: `${apptHeight(a.service)}%`,
                            left: '2px', right: '2px',
                            background: cfg.bg, border: `1px solid ${cfg.bdr}`,
                            borderRadius: 5, padding: '0.2rem 0.35rem',
                            cursor: 'pointer', overflow: 'hidden',
                            transition: 'transform 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scaleX(0.96)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scaleX(1)')}
                        >
                          <p style={{ fontSize: '0.55rem', fontWeight: 700, color: cfg.color, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{a.time}</p>
                          <p style={{ fontSize: '0.55rem', color: T, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{a.name}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment detail panel */}
      {selectedAppt && (
        <div style={{ marginTop: '1rem', background: B2, border: `1px solid ${BDRG}`, borderRadius: RL, padding: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: T, marginBottom: '0.375rem' }}>{selectedAppt.name}</p>
            <p style={{ color: TM, fontSize: '0.85rem' }}>{svcName(selectedAppt.service)} · ₪{PRICE_MAP[selectedAppt.service]} · {fmtDate(selectedAppt.date)} {selectedAppt.time}</p>
            <p style={{ color: TD, fontSize: '0.78rem', marginTop: '0.25rem' }}>{selectedAppt.phone}</p>
            <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.75rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: S_CFG[selectedAppt.status as keyof typeof S_CFG].bg, color: S_CFG[selectedAppt.status as keyof typeof S_CFG].color, border: `1px solid ${S_CFG[selectedAppt.status as keyof typeof S_CFG].bdr}` }}>
              {S_CFG[selectedAppt.status as keyof typeof S_CFG].label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            {selectedAppt.status === 'approved' && (
              <button onClick={() => { updateStatus(selectedAppt.id, 'completed'); setSelectedAppt(null); }}
                style={{ padding: '0.5rem 1.125rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', borderRadius: 8, color: '#10b981', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                ✓ סיים טיפול
              </button>
            )}
            {selectedAppt.status === 'approved' && (
              <a href={waLink(selectedAppt, templates.reschedule)} target="_blank" rel="noopener noreferrer"
                onClick={() => { updateStatus(selectedAppt.id, 'cancelled'); setSelectedAppt(null); }}
                style={{ padding: '0.5rem 0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 8, color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                ✕ בטל + שלח הודעה
              </a>
            )}
            {(selectedAppt.status === 'rejected' || selectedAppt.status === 'cancelled' || selectedAppt.status === 'completed') && (
              <button onClick={() => { updateStatus(selectedAppt.id, 'approved'); setSelectedAppt(null); }}
                style={{ padding: '0.5rem 1.125rem', background: B4, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                ↺ שחזר לתור פעיל
              </button>
            )}
            <a href={waLink(selectedAppt, templates.reschedule)} target="_blank" rel="noopener noreferrer"
              style={{ padding: '0.5rem 1rem', background: B4, border: `1px solid ${BDR}`, borderRadius: 8, color: TM, fontSize: '0.78rem', textDecoration: 'none' }}>
              📅 שנה תור
            </a>
            <button onClick={() => setSelectedAppt(null)} style={{ padding: '0.5rem 0.75rem', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 8, color: TD, fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────

function SettingsTab({ appointments, hours, setHours, blockedSlots, blockSlot, unblockSlot, templates, updateTemplates }: TabProps) {
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('');
  const [blockMode, setBlockMode] = useState<'day' | 'slot'>('day');
  const [editTemplates, setEditTemplates] = useState(templates);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState(false);

  useEffect(() => { setEditTemplates(templates); }, [templates]);

  const templatesChanged = WA_TEMPLATE_KEYS.some(k => editTemplates[k] !== templates[k]);

  async function handleSaveTemplates() {
    setSavingTemplates(true);
    await updateTemplates(editTemplates);
    setSavingTemplates(false);
    setSavedTemplates(true);
    setTimeout(() => setSavedTemplates(false), 1800);
  }

  const previewAppt: Appointment = {
    id: '', name: '[שם לקוח]', phone: '', service: 'haircut',
    date: new Date().toISOString().split('T')[0], time: '10:00', status: 'pending', created_at: '',
  };

  async function handleBlock() {
    if (!blockDate) return;
    if (blockMode === 'day') {
      await Promise.all(TIME_SLOTS.map(t => blockSlot(blockDate, t)));
    } else if (blockTime) {
      blockSlot(blockDate, blockTime);
    }
    setBlockDate('');
    setBlockTime('');
  }

  const blockedDates = [...new Set(blockedSlots.map(s => s.date))].sort();

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 500, color: T, marginBottom: '2rem' }}>הגדרות</h1>

      {/* Working hours */}
      <Section title="שעות עבודה" icon="⏰">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ padding: '0.875rem 1.125rem', background: B3, borderRadius: R, border: `1px solid ${BDR}` }}>
              {/* Row 1: day name + open/closed toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hours[i].open ? '0.625rem' : 0 }}>
                <span style={{ fontSize: '0.85rem', color: T, fontWeight: 600 }}>{DAY_FULL[i]}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.75rem', color: hours[i].open ? GL : TD }}>{hours[i].open ? 'פתוח' : 'סגור'}</span>
                  <input type="checkbox" checked={hours[i].open}
                    onChange={e => setHours({ ...hours, [i]: { ...hours[i], open: e.target.checked } })}
                    style={{ accentColor: G, width: 16, height: 16, cursor: 'pointer' }} />
                </label>
              </div>
              {/* Row 2: time range (only when open) */}
              {hours[i].open && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="time" value={hours[i].from}
                    onChange={e => setHours({ ...hours, [i]: { ...hours[i], from: e.target.value } })}
                    style={{ flex: 1, minWidth: 0, background: B4, border: `1px solid ${BDR}`, borderRadius: 6, padding: '0.35rem 0.5rem', color: T, fontSize: '0.8rem', cursor: 'pointer' }} />
                  <span style={{ color: TD, fontSize: '0.75rem', flexShrink: 0 }}>–</span>
                  <input type="time" value={hours[i].to}
                    onChange={e => setHours({ ...hours, [i]: { ...hours[i], to: e.target.value } })}
                    style={{ flex: 1, minWidth: 0, background: B4, border: `1px solid ${BDR}`, borderRadius: 6, padding: '0.35rem 0.5rem', color: T, fontSize: '0.8rem', cursor: 'pointer' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Block dates / slots */}
      <Section title="חסימת תאריכים / שעות" icon="🚫">
        <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {(['day', 'slot'] as const).map(m => (
            <button key={m} onClick={() => setBlockMode(m)} style={{ padding: '0.45rem 1rem', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: blockMode === m ? GG : B4, color: blockMode === m ? GL : TM, outline: blockMode === m ? `1px solid ${BDRG}` : `1px solid ${BDR}` }}>
              {m === 'day' ? 'חסום יום שלם' : 'חסום שעה ספציפית'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)}
            style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.6rem 0.875rem', color: T, fontSize: '0.875rem', cursor: 'pointer' }} />
          {blockMode === 'slot' && (
            <select value={blockTime} onChange={e => setBlockTime(e.target.value)}
              style={{ background: B3, border: `1px solid ${BDR}`, borderRadius: R, padding: '0.6rem 0.875rem', color: T, fontSize: '0.875rem', cursor: 'pointer', direction: 'rtl' }}>
              <option value="">בחר שעה</option>
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <button onClick={handleBlock} disabled={!blockDate} style={{ padding: '0.6rem 1.25rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: blockDate ? 1 : 0.4 }}>
            חסום
          </button>
        </div>

        {/* Blocked dates list */}
        {blockedDates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 220, overflowY: 'auto' }}>
            {blockedDates.map(date => {
              const slots = blockedSlots.filter(s => s.date === date);
              const isFullDay = slots.length >= TIME_SLOTS.length;
              return (
                <div key={date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.16)', borderRadius: R, gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.875rem', color: T, fontWeight: 500 }}>{fmtDate(date)}</span>
                    <span style={{ fontSize: '0.72rem', color: TD, marginRight: '0.625rem' }}>
                      {isFullDay ? '· יום שלם חסום' : `· ${slots.length} שעות חסומות`}
                    </span>
                  </div>
                  <button onClick={() => slots.forEach(s => unblockSlot(s.date, s.time))}
                    style={{ padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 6, color: '#ef4444', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    שחרר
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* WhatsApp templates */}
      <Section title="תבניות WhatsApp" icon="💬">
        <p style={{ fontSize: '0.78rem', color: TM, marginBottom: '1.25rem', lineHeight: 1.6 }}>
          ניתן לערוך את הודעות הוואטסאפ שנשלחות ללקוחות. השתמש בשדות הבאים — הם יוחלפו אוטומטית: <br />
          <code style={{ color: GL, direction: 'ltr', display: 'inline-block', marginTop: '0.25rem' }}>{WA_PLACEHOLDER_HELP}</code>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {WA_TEMPLATE_KEYS.map(key => (
            <div key={key}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: G, marginBottom: '0.375rem' }}>{WA_TEMPLATE_LABELS[key]}</p>
              <textarea
                value={editTemplates[key]}
                onChange={e => setEditTemplates({ ...editTemplates, [key]: e.target.value })}
                rows={5}
                style={{ width: '100%', padding: '0.75rem 1rem', background: B3, border: `1px solid ${BDR}`, borderRadius: R, fontSize: '0.8rem', color: T, lineHeight: 1.65, direction: 'rtl', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.875rem', background: 'rgba(178,102,255,0.05)', border: `1px solid ${BDR}`, borderRadius: R, fontSize: '0.75rem', color: TD, lineHeight: 1.6, whiteSpace: 'pre-wrap', direction: 'rtl' }}>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: TD, display: 'block', marginBottom: '0.25rem' }}>תצוגה מקדימה</span>
                {fillTemplate(editTemplates[key], previewAppt)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button onClick={handleSaveTemplates} disabled={!templatesChanged || savingTemplates}
            style={{ padding: '0.6rem 1.5rem', background: `linear-gradient(135deg,${GD},${GL})`, border: 'none', borderRadius: R, color: '#080808', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: (!templatesChanged || savingTemplates) ? 0.4 : 1 }}>
            {savingTemplates ? 'שומר…' : savedTemplates ? '✓ נשמר' : 'שמור תבניות'}
          </button>
          <button onClick={() => setEditTemplates(DEFAULT_WA_TEMPLATES)}
            style={{ padding: '0.6rem 1.25rem', background: B4, border: `1px solid ${BDR}`, borderRadius: R, color: TM, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            שחזר לברירת מחדל
          </button>
        </div>
      </Section>

      {/* Export */}
      <Section title="ייצוא נתונים" icon="📤">
        <p style={{ fontSize: '0.85rem', color: TM, marginBottom: '1rem' }}>ייצא את כל התורים לקובץ Excel/CSV</p>
        <button onClick={() => exportCSV(appointments)} style={{ padding: '0.75rem 1.5rem', background: GG, border: `1px solid ${BDRG}`, borderRadius: R, color: GL, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          ↓ ייצוא CSV
        </button>
      </Section>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: B2, border: `1px solid ${BDR}`, borderRadius: RL, padding: '1.5rem', marginBottom: '1.25rem' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  );
}

// ── Full App Card ─────────────────────────────────────────────

function FullAppCard({ appt: a, selected, onToggle, onUpdate, isReturning, templates }: {
  appt: Appointment; selected: boolean; onToggle: () => void;
  onUpdate: (id: string, s: 'approved' | 'rejected' | 'completed' | 'cancelled') => void;
  isReturning: boolean;
  templates: Record<WaTemplateKey, string>;
}) {
  const cfg = S_CFG[a.status as keyof typeof S_CFG];
  return (
    <div style={{ background: selected ? 'rgba(178,102,255,0.06)' : B2, border: `1px solid ${selected ? BDRG : BDR}`, borderRadius: RL, padding: '1.125rem 1.25rem', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Checkbox */}
        <div onClick={onToggle} style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2, cursor: 'pointer',
          background: selected ? G : 'transparent',
          border: `1.5px solid ${selected ? G : BDR}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#080808" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.375rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: T, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</p>
                {isReturning && <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', padding: '0.1rem 0.45rem', background: GG, border: `1px solid ${BDRG}`, borderRadius: 999, color: GL }}>חוזר ✦</span>}
              </div>
              <a href={`tel:${a.phone}`} style={{ fontSize: '0.78rem', color: TM, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                📞 {a.phone}
              </a>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'left' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: G, lineHeight: 1 }}>{a.time}</p>
              <span style={{ display: 'inline-block', marginTop: 4, padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.bdr}` }}>
                {cfg.label}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.875rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
            <span style={{ fontSize: '0.8rem', color: TM }}>{svcName(a.service)}</span>
            <span style={{ fontSize: '0.72rem', color: TD }}>· ₪{PRICE_MAP[a.service] ?? 0}</span>
          </div>

          {/* Actions */}
          {a.status === 'approved' && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => onUpdate(a.id, 'completed')}
                style={{ flex: 1, minWidth: 100, padding: '0.55rem', borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.28)', color: '#10b981', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                ✓ סיים טיפול
              </button>
              <a href={waLink(a, templates.reschedule)} target="_blank" rel="noopener noreferrer"
                onClick={() => onUpdate(a.id, 'cancelled')}
                style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0.55rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                <span>✕</span> בטל + שלח הודעה
              </a>
              <a href={waLink(a, templates.approve)} target="_blank" rel="noopener noreferrer"
                style={{ padding: '0.55rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', color: '#22c55e', fontSize: '0.75rem', textDecoration: 'none' }}>
                💬
              </a>
            </div>
          )}

          {(a.status === 'rejected' || a.status === 'cancelled' || a.status === 'completed') && (
            <button onClick={() => onUpdate(a.id, 'approved')} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: B4, border: `1px solid ${BDR}`, color: TM, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              ↺ שחזר לתור פעיל
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

