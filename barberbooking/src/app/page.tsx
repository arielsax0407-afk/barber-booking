'use client';

import { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lens } from '@/components/ui/lens';
import { TIME_SLOTS } from '@/lib/services';

// ── Static data ───────────────────────────────────────────

const SERVICES_PREVIEW = [
  { name: 'תספורת גברים ונוער', price: '50₪', duration: '30 דק׳' },
  { name: 'תספורת + זקן', price: '55₪', duration: '50 דק׳' },
  { name: 'סידור זקן', price: '30₪', duration: '20 דק׳' },
  { name: 'תספורת + שעווה (אף ואוזניים)', price: '60₪', duration: '40 דק׳' },
  { name: 'תספורת + חפיפה + זקן', price: '60₪', duration: '60 דק׳' },
  { name: 'החלקה אורגנית', price: '700₪', duration: '120 דק׳' },
];

const STATS = [
  { target: 500, decimals: 0, suffix: '+', label: 'לקוחות מרוצים' },
  { target: 4.9, decimals: 1, suffix: '★', label: 'דירוג גוגל' },
  { target: 8, decimals: 0, suffix: '+', label: 'שנות ניסיון' },
];

// Opening hours: Sunday(0)–Friday(5) 8:00–18:00, closed Saturday(6) — Asia/Jerusalem time
const OPEN_HOUR = 8;
const CLOSE_HOUR = 18;
const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getJerusalemParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdayMap[map.weekday] ?? date.getDay(),
    hour: parseInt(map.hour, 10) % 24,
    minute: parseInt(map.minute, 10),
  };
}

function getJerusalemDateStr(date: Date, offsetDays = 0) {
  const shifted = new Date(date.getTime() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(shifted);
}

function computeOpenStatus(now: Date) {
  const { weekday, hour, minute } = getJerusalemParts(now);
  const minutesNow = hour * 60 + minute;
  const openMin = OPEN_HOUR * 60;
  const closeMin = CLOSE_HOUR * 60;
  const isClosedDay = weekday === 6;

  if (!isClosedDay && minutesNow >= openMin && minutesNow < closeMin) {
    const left = closeMin - minutesNow;
    const h = Math.floor(left / 60);
    const m = left % 60;
    const sub = h > 0 ? `סוגר בעוד ${h} ש׳${m ? ` ${m} ד׳` : ''}` : `סוגר בעוד ${m} דק׳`;
    return { open: true, text: 'פתוח עכשיו', sub };
  }

  if (!isClosedDay && minutesNow < openMin) {
    return { open: false, text: 'סגור כרגע', sub: 'נפתח היום ב-08:00' };
  }

  let daysAhead = 0;
  let d = weekday;
  do {
    daysAhead++;
    d = (weekday + daysAhead) % 7;
  } while (d === 6);
  const label = daysAhead === 1 ? 'מחר' : `ביום ${HEBREW_WEEKDAYS[d]}`;
  return { open: false, text: 'סגור כרגע', sub: `נפתח ${label} ב-08:00` };
}

const STEPS = [
  { num: '01', emoji: '✂️', title: 'בחר שירות', desc: 'בחר את השירות המתאים לך — תספורת, עיצוב זקן, פייד ועוד' },
  { num: '02', emoji: '📅', title: 'קבע תאריך ושעה', desc: 'ראה בזמן אמת אילו שעות פנויות ובחר את הזמן הנוח לך' },
  { num: '03', emoji: '👑', title: 'הגע ותהנה', desc: 'קבל אישור ב-WhatsApp, הגע בדיוק לשעה ותצא עם מראה שישנה לך את היום' },
];

const GALLERY = [
  { url: '/images/work/work-08.png', label: 'מוהוק וזקן מעוצב' },
  { url: '/images/work/work-09.png', label: 'אפרו פייד נקי' },
  { url: '/images/work/work-10.png', label: 'עיצוב שיער אומנותי' },
  { url: '/images/work/work-11.png', label: 'מוהוק ספייקים' },
  { url: '/images/work/work-12.png', label: 'פייד קרלי מלוחים' },
  { url: '/images/work/work-13.png', label: 'מוהוק בצבע ירוק' },
  { url: '/images/work/work-14.png', label: 'תספורת מעוצבת' },
];

const TESTIMONIALS = [
  { name: 'דוד כהן', service: 'תספורת + עיצוב זקן', text: 'הכי טוב שהיה לי. הספר ידע בדיוק מה אני רוצה רק ממבט אחד. אני מגיע כל שבוע ולא מוכן לשנות.', stars: 5, initial: 'ד', color: '#1A50A8' },
  { name: 'יוסי לוי', service: 'פייד', text: 'כבר שנה שאני מגיע פעמיים בחודש. הצוות מקצועי, נעים ותמיד בדיוק לשעה. תספורת מושלמת כל פעם.', stars: 5, initial: 'י', color: '#CC1A1A' },
  { name: 'אמיר חדד', service: 'עיצוב זקן', text: 'עיצוב הזקן שינה לי את המראה לגמרי. אנשים שואלים מה עשיתי, תמיד עונה: YAIR ZIV. ממליץ בחום!', stars: 5, initial: 'א', color: '#1A50A8' },
  { name: 'רון ביטון', service: 'תספורת ילדים', text: 'הבן שלי פחד מספרים, כאן הוא מתרגש לבוא. הצוות יודע לעבוד עם ילדים בצורה מדהימה. תודה רבה!', stars: 5, initial: 'ר', color: '#CC1A1A' },
  { name: 'עמית שלום', service: 'תספורת', text: 'קביעת תור אונליין זה שינוי משחק. 2 דקות ויש לי תור. תמיד יוצא מרוצה ומרגיש כמו מלך. 10/10.', stars: 5, initial: 'ע', color: '#1A50A8' },
];

const WHY_US = [
  { icon: '✦', title: 'מקצועיות', body: 'כל ספר עבר הכשרה מקצועית ומביא איתו שנים של ניסיון' },
  { icon: '◈', title: 'אווירה', body: 'מרחב מוקפד ואינטימי שיגרום לכם להרגיש מלכים' },
  { icon: '◆', title: 'דיוק', body: 'תספורת מושלמת, כל פעם. ללא פשרות, ללא חצי עבודות' },
];

const PROOF = [
  { icon: '🔥', text: 'מעל 47 תורים החודש' },
  { icon: '⭐', text: 'דירוג 4.9 בגוגל' },
  { icon: '✂️', text: 'א׳–ו׳ · 08:00–18:00' },
  { icon: '💬', text: 'אישור WhatsApp מיידי' },
];

// ── Scroll-reveal wrapper (visual only) ─────────────────────

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`bph-reveal${visible ? ' bph-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Live open/closed badge (real-time calculation) ──────────

function OpenStatusBadge() {
  const [status, setStatus] = useState<{ open: boolean; text: string; sub: string } | null>(null);

  useEffect(() => {
    const tick = () => setStatus(computeOpenStatus(new Date()));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  return (
    <div className={`bph-open-badge ${status.open ? 'is-open' : 'is-closed'}`}>
      <span className="bph-open-dot" />
      <span>{status.text}</span>
      <span className="bph-open-sub">· {status.sub}</span>
    </div>
  );
}

// ── Next available slot (live calculation against real bookings) ──

function NextSlotWidget() {
  const [state, setState] = useState<{ label: string; sub: string } | 'loading' | 'hidden'>('loading');

  useEffect(() => {
    let cancelled = false;
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    async function run() {
      try {
        const now = new Date();
        const { hour, minute } = getJerusalemParts(now);
        const nowMinutes = hour * 60 + minute;
        const todayStr = getJerusalemDateStr(now, 0);

        const res = await fetch(`/api/availability?date=${todayStr}`);
        const { takenSlots }: { takenSlots: string[] } = await res.json();
        const taken = new Set(takenSlots ?? []);
        const todayFree = TIME_SLOTS.find((t) => toMin(t) > nowMinutes + 10 && !taken.has(t));

        if (todayFree) {
          if (!cancelled) setState({ label: `היום בשעה ${todayFree}`, sub: 'התור הפנוי הקרוב ביותר' });
          return;
        }

        const tomorrowParts = getJerusalemParts(new Date(now.getTime() + 86400000));
        const offsetDays = tomorrowParts.weekday === 6 ? 2 : 1; // skip Saturday (closed)
        const dateStr = getJerusalemDateStr(now, offsetDays);

        const res2 = await fetch(`/api/availability?date=${dateStr}`);
        const { takenSlots: taken2 }: { takenSlots: string[] } = await res2.json();
        const takenSet2 = new Set(taken2 ?? []);
        const nextFree = TIME_SLOTS.find((t) => !takenSet2.has(t));

        if (nextFree && !cancelled) {
          const label = offsetDays === 1 ? 'מחר' : 'ביום ראשון';
          setState({ label: `${label} בשעה ${nextFree}`, sub: 'התור הפנוי הקרוב ביותר' });
        } else if (!cancelled) {
          setState('hidden');
        }
      } catch {
        if (!cancelled) setState('hidden');
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading' || state === 'hidden') return null;

  return (
    <Link href="/book" className="bph-next-slot">
      <span className="bph-next-slot-dot" />
      <span className="bph-next-slot-text">
        <strong>{state.label}</strong>
        <small>{state.sub}</small>
      </span>
      <span className="bph-next-slot-arrow">←</span>
    </Link>
  );
}

// ── Count-up number (triggered once `start` flips true) ─────

function CountUp({ target, decimals = 0, suffix = '', duration = 1400, start }: { target: number; decimals?: number; suffix?: string; duration?: number; start: boolean }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);

  return <>{val.toFixed(decimals)}{suffix}</>;
}

// ── Page ──────────────────────────────────────────────────

export default function HomePage() {
  const [introPlaying, setIntroPlaying] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [floatVisible, setFloatVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [spotlightHint, setSpotlightHint] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useEffect(() => {
    const onScroll = () => setFloatVisible(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? i : (i + 1) % GALLERY.length));
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? i : (i - 1 + GALLERY.length) % GALLERY.length));
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex]);

  function handleHeroMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
    if (spotlightHint) setSpotlightHint(false);
  }

  useIsoLayoutEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('bph_intro_seen') === '1'; } catch {}
    if (seen) {
      setIntroPlaying(false);
      setHeroReady(true);
      return;
    }
    try { sessionStorage.setItem('bph_intro_seen', '1'); } catch {}
    const t = setTimeout(() => {
      setIntroPlaying(false);
      setHeroReady(true);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  const heroAnim = (n: number, extra = '') => `bph-hero-anim ${heroReady ? `bph-go-${n}` : ''}${extra ? ' ' + extra : ''}`.trim();

  return (
    <div className="bph">

      {/* ── Intro screen ─────────────────────────────────── */}
      {introPlaying && (
        <div className="bph-intro2" aria-hidden="true" dir="rtl">
          <div className="bph-intro2-grain" />
          <div className="bph-intro2-content">
            <h1 className="bph-intro2-title serif" dir="ltr">
              {Array.from('YAIR ZIV').map((ch, i) => (
                <span key={i} className="bph-intro2-letter" style={{ animationDelay: `${0.5 + i * 0.045}s` }}>
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </h1>
            <div className="bph-intro2-line" />
            <p className="bph-intro2-tagline">האמנות של להיראות מושלם</p>
          </div>
        </div>
      )}

      {/* ── WhatsApp float ───────────────────────────────── */}
      <a
        href="https://wa.me/972527070788"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="צור קשר בוואטסאפ"
        style={{
          position: 'fixed', bottom: 24, left: 24, zIndex: 100,
          width: 56, height: 56, borderRadius: '50%',
          background: '#25D366',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,211,102,0.42)',
          textDecoration: 'none',
          animation: 'pulse-wa 3s ease-in-out infinite',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bph-hero" ref={heroRef} onMouseMove={handleHeroMouseMove}>

        {/* Cursor-reactive gold glow (desktop only) */}
        <div className="bph-cursor-glow" aria-hidden="true" />

        {/* Cinematic background photo + dark overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&h=1280&fit=crop&q=80"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.35) brightness(0.55) contrast(1.1)', animation: 'bph-hero-zoom 12s ease-out forwards', willChange: 'transform' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,9,8,0.30) 0%, rgba(10,9,8,0.62) 50%, rgba(10,9,8,0.97) 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 28%, rgba(10,9,8,0) 0%, rgba(10,9,8,0.65) 78%)' }} />

          {/* "Million-dollar" feature — cursor spotlight reveals the true, full-colour photo beneath the moody grade */}
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&h=1280&fit=crop&q=80"
            alt=""
            aria-hidden="true"
            className="bph-spotlight-img"
          />
        </div>

        <div className="bph-spotlight-ring" aria-hidden="true" />
        <div className={`bph-spotlight-hint ${spotlightHint ? '' : 'is-hidden'}`} aria-hidden="true">
          <span>✦</span> זוז עם העכבר לחשיפת המראה האמיתי
        </div>

        {/* Subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          backgroundImage: 'url(/images/texture.png)',
          backgroundSize: '320px 320px',
          backgroundRepeat: 'repeat',
          opacity: 0.05,
          mixBlendMode: 'overlay',
        }} />

        {/* Gold glow accents */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,164,73,0.14), transparent 70%)', top: '4%', right: '8%', filter: 'blur(70px)', animation: 'drift1 22s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,164,73,0.08), transparent 70%)', bottom: '18%', left: '28%', filter: 'blur(60px)', animation: 'drift2 18s ease-in-out infinite' }} />
        </div>

        {/* Faint decorative clipper accent */}
        <div className="bph-clipper" aria-hidden="true">
          <img src="/images/clipper1.png" alt="" />
        </div>

        {/* Nav */}
        <nav className="bph-nav animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <img
              src="/images/logo.png"
              alt="לוגו YAIR ZIV"
              style={{ height: 42, filter: 'drop-shadow(0 2px 10px rgba(201,164,73,0.45))' }}
            />
            <span className="serif" style={{ color: 'var(--cream)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.04em' }}>
              YAIR ZIV
            </span>
          </div>
          <OpenStatusBadge />
        </nav>

        {/* Hero content */}
        <div className="bph-hero-content">
          <div className={heroAnim(0, 'flex items-center gap-3 mb-8')}>
            <div className="bph-eyebrow-line" />
            <span className="bph-eyebrow-text">מספרה יוקרתית ברחובות</span>
            <div className="bph-eyebrow-line" />
          </div>

          <h1 className={`display display-xl ${heroAnim(1)}`} style={{ maxWidth: 760 }}>
            <span className="bph-gold-text">YAIR</span>
            <br />
            <span style={{ color: 'var(--cream)', fontStyle: 'italic', fontWeight: 300 }}>ZIV</span>
          </h1>

          <p className={heroAnim(2)} style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'var(--cream-dim)', marginTop: '1.5rem', maxWidth: 420, lineHeight: 1.8, fontWeight: 300 }}>
            מספרת פרמיום ברחובות — תספורות, זקן וטיפוח גברי
          </p>

          <div className={heroAnim(3)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginTop: '3rem' }}>
            <Link href="/book" className="bph-btn">
              קבע תור עכשיו
            </Link>
            <Link href="/my-appointments" className="bph-link">
              התורים שלי
            </Link>
          </div>

          <div className={heroAnim(4)} style={{ marginTop: '1.75rem' }}>
            <NextSlotWidget />
          </div>

          {/* Floating glass stats strip */}
          <div className={`bph-stats ${heroAnim(4)}`}>
            {STATS.map((s) => (
              <div key={s.label} className="bph-stat">
                {/* dir=ltr prevents Unicode bidi from reversing "500+" to "+500" */}
                <div className="serif bph-gold-text" dir="ltr">
                  <CountUp target={s.target} decimals={s.decimals} suffix={s.suffix} start={heroReady} />
                </div>
                <div className="bph-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className={heroAnim(5)} style={{ display: 'flex', justifyContent: 'center', paddingBottom: '2.5rem', position: 'relative', zIndex: 5 }}>
          <div className="animate-float" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--cream-faint)' }}>גלול</span>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(180deg, var(--gold), transparent)' }} />
          </div>
        </div>
      </section>

      {/* ── Social proof ticker ───────────────────────────── */}
      <div className="bph-ticker">
        {PROOF.map(({ icon, text }) => (
          <div key={text} className="bph-ticker-item">
            <span className="bph-ticker-icon">{icon}</span><span>{text}</span>
          </div>
        ))}
      </div>

      {/* ── Services ─────────────────────────────────────── */}
      <section style={{ background: 'var(--g1)' }}>
        <div className="bph-section">
          <Reveal>
            <div className="bph-header">
              <p className="bph-eyebrow">השירותים שלנו</p>
              <h2 className="display display-lg" style={{ color: 'var(--cream)' }}>
                <span className="bph-gold-text" style={{ fontStyle: 'italic' }}>האמנות</span>{' '}שלנו
              </h2>
            </div>
          </Reveal>

          <div className="bph-services">
            {SERVICES_PREVIEW.map((s, i) => (
              <Reveal key={s.name} delay={i * 70}>
                <div className="bph-service">
                  <span className="bph-service-num">{String(i + 1).padStart(2, '0')}</span>
                  <div className="bph-service-info">
                    <h3>{s.name}</h3>
                    <p>{s.duration}</p>
                  </div>
                  <div className="bph-service-price serif">{s.price}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="text-center mt-12">
              <Link href="/book" className="bph-link">לכל השירותים</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section style={{ background: 'var(--g0)', position: 'relative', overflow: 'hidden' }}>
        {/* faint rotating clipper icon */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(160px, 30%, 280px)',
          opacity: 0.04,
          pointerEvents: 'none',
          animation: 'slow-rotate 24s linear infinite',
          zIndex: 0,
          filter: 'grayscale(1) brightness(2)',
        }}>
          <img src="/images/clipper2.png" alt="" style={{ width: '100%' }} />
        </div>

        <div className="bph-section" style={{ position: 'relative', zIndex: 1 }}>
          <Reveal>
            <div className="bph-header">
              <p className="bph-eyebrow">פשוט ומהיר</p>
              <h2 className="display display-lg" style={{ color: 'var(--cream)' }}>
                איך זה <span className="bph-gold-text" style={{ fontStyle: 'italic' }}>עובד?</span>
              </h2>
            </div>
          </Reveal>

          <div className="bph-steps">
            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <div className="bph-step">
                  <div className="bph-step-num">{step.num}</div>
                  <div className="bph-step-icon">{step.emoji}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="text-center" style={{ marginTop: 'clamp(2.5rem, 6vw, 4rem)' }}>
              <Link href="/book" className="bph-btn">קבע תור עכשיו</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Gallery — real client work ───────────────────── */}
      <section style={{ background: '#0a0a0a' }}>
        <div className="bph-section">
          <Reveal>
            <div className="bph-header">
              <p className="bph-eyebrow">הגלריה שלנו</p>
              <h2 className="display display-lg" style={{ color: 'var(--cream)' }}>
                <span className="bph-gold-text" style={{ fontStyle: 'italic' }}>העבודות</span> שלנו
              </h2>
              <p style={{ color: 'var(--cream-dim)', fontSize: '0.9rem', marginTop: '0.75rem', fontWeight: 300 }}>
                תספורות אמיתיות, ישר מהכיסא
              </p>
            </div>
          </Reveal>

          <div className="bph-masonry">
            {GALLERY.map((img, i) => (
              <motion.div
                key={img.url}
                className="bph-masonry-item"
                onClick={() => setLightboxIndex(i)}
                role="button"
                tabIndex={0}
                aria-label={`הצג ${img.label} בתצוגה מלאה`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxIndex(i); }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <Lens>
                  <img src={img.url} alt={img.label} loading="lazy" />
                </Lens>
              </motion.div>
            ))}
          </div>

          <Reveal>
            <div className="text-center mt-12">
              <Link href="/book" className="bph-link">קבע תור עכשיו</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── Why us ───────────────────────────────────────── */}
      <section style={{ background: 'var(--g1)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="bph-section">
          <div className="bph-whyus">
            {WHY_US.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="bph-why-item">
                  <div className="bph-why-icon">{item.icon}</div>
                  <h3 className="serif">{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="bph-final">
        <div className="bph-final-glow" aria-hidden="true" />
        <Reveal className="bph-final-inner">
          <p className="bph-eyebrow">מוכן?</p>
          <h2 className="display display-lg" style={{ color: 'var(--cream)', marginBottom: '2.5rem' }}>
            קבע את התור{' '}<span className="bph-gold-text" style={{ fontStyle: 'italic', fontWeight: 300 }}>שלך</span>
          </h2>
          <Link href="/book" className="bph-btn bph-btn-pulse">
            קביעת תור
          </Link>
          <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--cream-faint)', letterSpacing: '0.05em' }}>
            ללא כרטיס אשראי · אישור ב-WhatsApp תוך שעה
          </p>
        </Reveal>
      </section>

      {/* ── Floating CTA ─────────────────────────────────── */}
      <Link
        href="/book"
        aria-label="קבע תור עכשיו"
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: `translateX(-50%) translateY(${floatVisible ? '0' : '120%'})`,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.625rem',
          width: 'calc(100% - 48px)',
          maxWidth: '400px',
          height: '56px',
          background: 'linear-gradient(135deg, #7A5F23, #E0C275)',
          color: '#0a0908',
          fontFamily: 'var(--font-body)',
          fontWeight: 800,
          fontSize: '0.9375rem',
          letterSpacing: '0.07em',
          textDecoration: 'none',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(156,122,46,0.50), 0 2px 8px rgba(0,0,0,0.25)',
          opacity: floatVisible ? 1 : 0,
          pointerEvents: floatVisible ? 'auto' : 'none',
          transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" stroke="none" opacity="0.15"/>
          <path d="M8 12h8M12 8l4 4-4 4"/>
        </svg>
        קבע תור עכשיו
      </Link>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bph-footer">
        <img
          src="/images/barber-pole.png"
          alt=""
          className="bph-footer-pole"
        />
        <p className="serif bph-gold-text" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>YAIR ZIV</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--cream-faint)', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>רחובות · א׳–ו׳ 08:00–18:00</p>
        <a
          href="https://wa.me/972527070788"
          target="_blank"
          rel="noopener noreferrer"
          className="bph-footer-wa"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          וואטסאפ
        </a>
      </footer>

      {/* ── Gallery lightbox ─────────────────────────────── */}
      {lightboxIndex !== null && (
        <div className="bph-lightbox" role="dialog" aria-modal="true" onClick={() => setLightboxIndex(null)}>
          <button className="bph-lightbox-close" onClick={() => setLightboxIndex(null)} aria-label="סגור">✕</button>
          <button
            className="bph-lightbox-nav bph-lightbox-prev"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! - 1 + GALLERY.length) % GALLERY.length); }}
            aria-label="התמונה הקודמת"
          >›</button>
          <figure className="bph-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img
              key={lightboxIndex}
              src={GALLERY[lightboxIndex].url}
              alt={GALLERY[lightboxIndex].label}
              className="bph-lightbox-img"
            />
            <figcaption className="bph-lightbox-caption">{GALLERY[lightboxIndex].label}</figcaption>
          </figure>
          <button
            className="bph-lightbox-nav bph-lightbox-next"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! + 1) % GALLERY.length); }}
            aria-label="התמונה הבאה"
          >‹</button>
        </div>
      )}

      {/* ── Styles ───────────────────────────────────────── */}
      <style>{`
        .bph {
          --g0: #0a0908;
          --g1: #141210;
          --g2: #1c1916;
          --cream: #f3ecdd;
          --cream-dim: rgba(243,236,221,0.62);
          --cream-faint: rgba(243,236,221,0.30);
          --line: rgba(243,236,221,0.10);
          --gold: #c9a449;
          --gold-light: #e8d5a3;
          --gold-dark: #9c7a2e;
          color: var(--cream);
          background: var(--g0);
        }

        @media (prefers-reduced-motion: reduce) {
          .bph *, .bph *::before, .bph *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        }

        /* Gold gradient text */
        .bph-gold-text {
          background: linear-gradient(135deg, var(--gold-dark) 0%, var(--gold-light) 55%, var(--gold) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        /* Eyebrow label */
        .bph-eyebrow {
          font-size: 0.7rem;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }
        .bph-eyebrow::before, .bph-eyebrow::after {
          content: '';
          width: 28px;
          height: 1px;
          background: var(--gold);
          opacity: 0.5;
        }
        .bph-eyebrow-line { width: 40px; height: 1px; background: var(--gold); opacity: 0.6; }
        .bph-eyebrow-text { font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold-light); font-weight: 600; }

        /* Buttons / links */
        .bph-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1.05rem 3.25rem;
          border: 1.5px solid var(--gold);
          border-radius: 2px;
          color: var(--gold-light);
          background: transparent;
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          text-decoration: none;
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .bph-btn:hover {
          background: var(--gold);
          color: #0a0908;
          letter-spacing: 0.32em;
          box-shadow: 0 0 44px rgba(201,164,73,0.35);
        }
        .bph-link {
          color: var(--cream-dim);
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          padding-bottom: 4px;
          transition: all 0.3s ease;
        }
        .bph-link:hover { color: var(--gold-light); border-color: var(--gold); }

        /* Hero */
        .bph-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .bph-nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 72rem;
          margin: 0 auto;
          width: 100%;
          padding: 2rem 1.5rem 1rem;
        }
        .bph-hero-content {
          position: relative;
          z-index: 5;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
        }
        .bph-clipper {
          position: absolute;
          left: clamp(-50px, -3vw, -10px);
          bottom: 0;
          width: clamp(140px, 22vw, 320px);
          opacity: 0.14;
          z-index: 2;
          pointer-events: none;
          filter: grayscale(1) brightness(1.9) drop-shadow(0 0 50px rgba(201,164,73,0.25));
          animation: clipper-float 6.5s ease-in-out infinite;
          transform-origin: center bottom;
        }
        .bph-clipper img { width: 100%; display: block; }

        /* Cursor-reactive gold glow (desktop only) */
        .bph-cursor-glow {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background: radial-gradient(circle 320px at var(--mx, 50%) var(--my, 50%), rgba(201,164,73,0.12), transparent 70%);
        }
        @media (hover: none), (pointer: coarse) { .bph-cursor-glow { display: none; } }

        /* "Million-dollar" feature — cursor spotlight reveal */
        .bph-spotlight-img {
          position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
          filter: brightness(0.95) contrast(1.12) saturate(1.35);
          clip-path: circle(0px at var(--mx, 50%) var(--my, 50%));
          transition: clip-path 0.15s ease-out;
          will-change: clip-path;
        }
        .bph-hero:hover .bph-spotlight-img { clip-path: circle(150px at var(--mx, 50%) var(--my, 50%)); }
        .bph-spotlight-ring {
          position: absolute; z-index: 2; pointer-events: none;
          width: 300px; height: 300px; border-radius: 50%;
          left: var(--mx, 50%); top: var(--my, 50%);
          transform: translate(-50%, -50%);
          border: 1px solid rgba(201,164,73,0.55);
          box-shadow: 0 0 0 1px rgba(243,236,221,0.08) inset, 0 0 40px rgba(201,164,73,0.25);
          opacity: 0;
          transition: opacity 0.25s ease, left 0.15s ease-out, top 0.15s ease-out;
        }
        .bph-hero:hover .bph-spotlight-ring { opacity: 1; }
        @media (hover: none), (pointer: coarse) {
          .bph-spotlight-img, .bph-spotlight-ring { display: none; }
        }
        .bph-spotlight-hint {
          position: absolute; z-index: 4; bottom: clamp(1.25rem, 4vw, 2rem); left: 50%;
          transform: translateX(-50%);
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.7rem; letter-spacing: 0.1em; color: var(--cream-faint);
          background: rgba(10,9,8,0.45);
          border: 1px solid var(--line);
          padding: 0.5rem 1rem;
          border-radius: 999px;
          backdrop-filter: blur(8px);
          opacity: 1;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        .bph-spotlight-hint span { color: var(--gold-light); }
        .bph-spotlight-hint.is-hidden { opacity: 0; }
        @media (hover: none), (pointer: coarse) { .bph-spotlight-hint { display: none; } }

        /* Live open/closed badge */
        .bph-open-badge {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.7rem; letter-spacing: 0.08em; color: var(--cream-dim);
          white-space: nowrap;
        }
        .bph-open-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          background: #5fd17a; box-shadow: 0 0 8px rgba(95,209,122,0.7);
          animation: pulse-wa 2.4s ease-in-out infinite;
        }
        .bph-open-badge.is-closed .bph-open-dot { background: #d15f5f; box-shadow: 0 0 8px rgba(209,95,95,0.6); animation: none; }
        .bph-open-sub { color: var(--cream-faint); }

        /* Next available slot — live booking widget */
        .bph-next-slot {
          display: inline-flex; align-items: center; gap: 0.875rem;
          padding: 0.75rem 1.25rem;
          background: rgba(243,236,221,0.05);
          border: 1px solid rgba(201,164,73,0.30);
          border-radius: 999px;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        .bph-next-slot:hover { background: rgba(201,164,73,0.10); border-color: var(--gold); transform: translateY(-1px); }
        .bph-next-slot-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
          background: var(--gold); box-shadow: 0 0 10px rgba(201,164,73,0.7);
          animation: pulse-wa 2.4s ease-in-out infinite;
        }
        .bph-next-slot-text { display: flex; flex-direction: column; align-items: flex-start; text-align: right; line-height: 1.35; }
        .bph-next-slot-text strong { font-size: 0.85rem; color: var(--cream); font-weight: 600; }
        .bph-next-slot-text small { font-size: 0.65rem; color: var(--cream-faint); letter-spacing: 0.04em; }
        .bph-next-slot-arrow { color: var(--gold-light); font-size: 1rem; }

        /* Floating glass stats strip */
        .bph-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(1.5rem, 6vw, 3.5rem);
          margin-top: clamp(3rem, 7vw, 4.5rem);
          padding: 1.5rem clamp(1.75rem, 5vw, 3.5rem);
          background: rgba(243,236,221,0.04);
          border: 1px solid var(--line);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border-radius: 3px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.5);
        }
        .bph-stat { text-align: center; position: relative; padding: 0 clamp(0.5rem, 2vw, 1.25rem); }
        .bph-stat:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 50%;
          inset-inline-end: calc(-1 * clamp(0.75rem, 3vw, 1.75rem));
          transform: translateY(-50%);
          width: 1px;
          height: 26px;
          background: var(--line);
        }
        .bph-stat > div:first-child { font-size: clamp(1.4rem, 4vw, 1.9rem); font-weight: 600; line-height: 1; }
        .bph-stat-label { font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cream-faint); margin-top: 0.4rem; }

        /* Social proof ticker */
        .bph-ticker {
          background: var(--g1);
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2.5rem;
          flex-wrap: wrap;
        }
        .bph-ticker-item { display: flex; align-items: center; gap: 0.5rem; color: var(--cream-dim); font-size: 0.78rem; letter-spacing: 0.04em; white-space: nowrap; }
        .bph-ticker-icon { font-size: 0.85rem; }

        /* Generic section layout */
        .bph-section { max-width: 64rem; margin: 0 auto; width: 100%; padding: clamp(4.5rem, 10vw, 7rem) 1.5rem; }
        .bph-header { text-align: center; margin-bottom: clamp(3rem, 7vw, 5rem); }

        /* Services — large editorial rows */
        .bph-services { display: flex; flex-direction: column; }
        .bph-service {
          position: relative;
          display: flex;
          align-items: center;
          gap: clamp(1.25rem, 4vw, 3rem);
          padding: clamp(1.75rem, 4vw, 2.75rem) clamp(1.25rem, 3vw, 1.75rem);
          border-bottom: 1px solid var(--line);
          transition: background 0.4s ease;
        }
        .bph-service:first-child { border-top: 1px solid var(--line); }
        .bph-service::before {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          width: 3px;
          height: 0%;
          background: var(--gold);
          transform: translateY(-50%);
          transition: height 0.4s ease;
        }
        .bph-service:hover { background: rgba(243,236,221,0.025); }
        .bph-service:hover::before { height: 64%; }
        .bph-service-num {
          font-family: var(--font-display);
          font-size: clamp(2.25rem, 6vw, 4rem);
          font-weight: 700;
          color: transparent;
          -webkit-text-stroke: 1px rgba(201,164,73,0.35);
          flex-shrink: 0;
          line-height: 1;
          transition: -webkit-text-stroke 0.4s ease;
        }
        .bph-service:hover .bph-service-num { -webkit-text-stroke: 1px rgba(201,164,73,0.75); }
        .bph-service-info { flex: 1; min-width: 0; }
        .bph-service-info h3 { font-family: var(--font-display); font-size: clamp(1.2rem, 3vw, 1.875rem); color: var(--cream); font-weight: 500; margin-bottom: 0.35rem; }
        .bph-service-info p { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--cream-faint); }
        .bph-service-price {
          font-size: clamp(1.1rem, 2.5vw, 1.625rem);
          font-weight: 600;
          color: rgba(243,236,221,0.32);
          flex-shrink: 0;
          transition: all 0.45s cubic-bezier(0.4,0,0.2,1);
        }
        .bph-service:hover .bph-service-price { color: var(--gold-light); transform: scale(1.1); text-shadow: 0 0 26px rgba(201,164,73,0.4); }

        /* How it works — editorial numerals */
        .bph-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: clamp(2.5rem, 6vw, 4.5rem); }
        .bph-step { text-align: center; }
        .bph-step-num {
          font-family: var(--font-display);
          font-size: clamp(3.25rem, 8vw, 5.5rem);
          font-weight: 700;
          color: transparent;
          -webkit-text-stroke: 1px rgba(201,164,73,0.30);
          line-height: 1;
          margin-bottom: 1.25rem;
        }
        .bph-step-icon { font-size: 1.4rem; opacity: 0.65; filter: grayscale(0.5); margin-bottom: 1rem; }
        .bph-step h3 { font-family: var(--font-display); font-size: 1.3rem; color: var(--cream); margin-bottom: 0.6rem; font-weight: 500; }
        .bph-step p { font-size: 0.875rem; line-height: 1.85; color: var(--cream-dim); }

        /* Work gallery — premium masonry, real client photos */
        .bph-masonry {
          column-count: 1;
          column-gap: 12px;
        }
        @media (min-width: 641px) {
          .bph-masonry { column-count: 2; }
        }
        @media (min-width: 1024px) {
          .bph-masonry { column-count: 3; }
        }
        .bph-masonry-item {
          position: relative;
          overflow: hidden;
          break-inside: avoid;
          margin-bottom: 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: border-color 0.35s ease;
        }
        .bph-masonry-item:hover { border-color: #C9A84C; }
        .bph-masonry-item img {
          width: 100%; height: auto; display: block;
          transition: transform 0.5s ease;
        }
        .bph-masonry-item:hover img { transform: scale(1.05); }
        .bph-masonry-item::after {
          content: '';
          position: absolute; inset: 0;
          z-index: 25;
          background: rgba(0,0,0,0.45);
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        .bph-masonry-item:hover::after { opacity: 1; }

        /* Why us */
        .bph-whyus { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: clamp(2.5rem, 6vw, 4rem); }
        .bph-why-item { text-align: center; }
        .bph-why-icon {
          width: 52px; height: 52px; margin: 0 auto 1.25rem;
          border: 1.5px solid rgba(201,164,73,0.35); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.25rem; color: var(--gold-light);
        }
        .bph-why-item h3 { font-size: 1.2rem; color: var(--cream); margin-bottom: 0.6rem; font-weight: 600; }
        .bph-why-item p { font-size: 0.875rem; line-height: 1.8; color: var(--cream-dim); }

        /* Final CTA */
        .bph-final {
          position: relative;
          padding: clamp(6rem, 14vw, 10rem) 1.5rem;
          background: var(--g0);
          overflow: hidden;
          text-align: center;
        }
        .bph-final-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 640px; height: 640px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,164,73,0.10), transparent 70%);
          filter: blur(50px);
          pointer-events: none;
        }
        .bph-final-inner { position: relative; z-index: 1; max-width: 36rem; margin: 0 auto; }
        .bph-btn-pulse { animation: bph-pulse-gold 3s ease-in-out infinite; }

        /* Footer */
        .bph-footer { background: var(--g0); border-top: 1px solid var(--line); padding: 3rem 1.5rem; text-align: center; }
        .bph-footer-pole {
          height: 64px; margin: 0 auto 1rem; display: block;
          animation: barber-pole-spin 10s linear infinite;
          filter: drop-shadow(0 4px 20px rgba(201,164,73,0.35));
        }
        .bph-footer-wa {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 1.5rem;
          border: 1px solid rgba(37,211,102,0.4);
          border-radius: 999px;
          background: rgba(37,211,102,0.08);
          color: #3ddc73;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        .bph-footer-wa:hover { background: #25D366; color: #0a0908; border-color: #25D366; }

        /* Gallery lightbox */
        .bph-lightbox {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(8,7,6,0.94);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: clamp(1.5rem, 6vw, 3rem);
          animation: fadeIn 0.25s ease both;
        }
        .bph-lightbox-figure { max-width: min(90vw, 880px); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .bph-lightbox-img { max-width: 100%; max-height: 78vh; object-fit: contain; border-radius: 4px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); animation: fadeIn 0.3s ease both; }
        .bph-lightbox-caption { font-size: 0.85rem; letter-spacing: 0.06em; color: var(--cream-dim); }
        .bph-lightbox-close {
          position: absolute; top: clamp(1rem, 4vw, 2rem); inset-inline-end: clamp(1rem, 4vw, 2rem);
          width: 42px; height: 42px; border-radius: 50%;
          background: rgba(243,236,221,0.06); border: 1px solid var(--line);
          color: var(--cream-dim); font-size: 1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s ease;
        }
        .bph-lightbox-close:hover { color: var(--gold-light); border-color: var(--gold); background: rgba(201,164,73,0.1); }
        .bph-lightbox-nav {
          width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
          background: rgba(243,236,221,0.05); border: 1.5px solid rgba(243,236,221,0.16);
          color: var(--cream-dim); font-size: 1.3rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          margin: 0 clamp(0.5rem, 2vw, 1.5rem);
          transition: all 0.25s ease;
        }
        .bph-lightbox-nav:hover { border-color: var(--gold); color: var(--gold-light); background: rgba(201,164,73,0.1); }

        /* Scroll reveal */
        .bph-reveal {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1);
        }
        .bph-reveal.bph-in { opacity: 1; transform: translateY(0); }

        /* ── Keyframes ──────────────────────────────────── */
        @keyframes barber-pole-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes clipper-float {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50%       { transform: translateY(-18px) rotate(-4deg); }
        }
        @keyframes slow-rotate {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes drift1 {
          0%,100% { transform: translate(0,0); }
          25%  { transform: translate(18px,-22px); }
          50%  { transform: translate(-12px,14px); }
          75%  { transform: translate(8px,20px); }
        }
        @keyframes drift2 {
          0%,100% { transform: translate(0,0); }
          30%  { transform: translate(-18px,14px); }
          60%  { transform: translate(14px,-18px); }
          80%  { transform: translate(-8px,-6px); }
        }
        @keyframes pulse-wa {
          0%,100% { box-shadow: 0 4px 20px rgba(37,211,102,0.42); }
          50%  { box-shadow: 0 4px 32px rgba(37,211,102,0.68), 0 0 0 10px rgba(37,211,102,0.08); }
        }
        @keyframes bph-pulse-gold {
          0%,100% { box-shadow: 0 0 0 0 rgba(201,164,73,0.28); }
          50%       { box-shadow: 0 0 0 14px rgba(201,164,73,0); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes stripes-pulse {
          0%,100% { opacity: 0.05; transform: translateY(-50%) scale(1); }
          50%      { opacity: 0.08; transform: translateY(-50%) scale(1.04); }
        }
        @keyframes bph-hero-zoom {
          from { transform: scale(1.12); }
          to   { transform: scale(1); }
        }
        @keyframes bph-intro2-line-in {
          to { width: min(280px, 60vw); }
        }
        @keyframes bph-intro2-letter-in {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bph-intro2-spacing {
          to { letter-spacing: 0.14em; }
        }
        @keyframes bph-intro2-tagline-in {
          to { opacity: 1; }
        }
        @keyframes bph-intro2-out {
          to { opacity: 0; visibility: hidden; }
        }

        /* ── Hero entrance (gated until intro fades out) ──── */
        .bph-hero-anim { opacity: 0; }
        .bph-hero-anim.bph-go-0 { animation: fadeUp 0.55s cubic-bezier(0.4,0,0.2,1) 0s   both; }
        .bph-hero-anim.bph-go-1 { animation: fadeUp 0.55s cubic-bezier(0.4,0,0.2,1) 0.1s both; }
        .bph-hero-anim.bph-go-2 { animation: fadeUp 0.55s cubic-bezier(0.4,0,0.2,1) 0.2s both; }
        .bph-hero-anim.bph-go-3 { animation: fadeUp 0.55s cubic-bezier(0.4,0,0.2,1) 0.3s both; }
        .bph-hero-anim.bph-go-4 { animation: fadeUp 0.55s cubic-bezier(0.4,0,0.2,1) 0.4s both; }
        .bph-hero-anim.bph-go-5 { animation: fadeUp 0.55s cubic-bezier(0.4,0,0.2,1) 0.5s both; }

        /* ── Intro screen ───────────────────────────────── */
        .bph-intro2 {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          overflow: hidden;
          pointer-events: none;
          animation: bph-intro2-out 0.4s ease 2.1s forwards;
        }
        .bph-intro2-grain {
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          opacity: 0.05;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 160px 160px;
        }
        .bph-intro2-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 1.5rem;
        }
        .bph-intro2-title {
          font-size: clamp(1.6rem, 6vw, 2.75rem);
          font-weight: 600;
          color: #FAF8F4;
          letter-spacing: 0.5em;
          margin: 0;
          white-space: nowrap;
          animation: bph-intro2-spacing 0.9s cubic-bezier(0.16,1,0.3,1) 0.5s forwards;
        }
        .bph-intro2-letter {
          display: inline-block;
          opacity: 0;
          transform: translateY(12px);
          animation: bph-intro2-letter-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .bph-intro2-line {
          width: 0;
          height: 1px;
          margin: 1.5rem 0;
          background: #C9A84C;
          box-shadow: 0 0 10px rgba(201,168,76,0.55);
          animation: bph-intro2-line-in 0.6s cubic-bezier(0.45,0,0.2,1) forwards;
        }
        .bph-intro2-tagline {
          margin: 0;
          font-size: clamp(0.65rem, 2vw, 0.8rem);
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(250,248,244,0.5);
          opacity: 0;
          animation: bph-intro2-tagline-in 0.4s ease 1.3s forwards;
        }

        /* ── Responsive ───────────────────────────────────── */
        @media (max-width: 640px) {
          .bph-clipper { display: none; }
          .bph-stats { flex-wrap: wrap; gap: 1.5rem 1rem; }
          .bph-service { padding-left: 0.5rem; padding-right: 0.5rem; gap: 1rem; }
          .bph-ticker { gap: 1rem; }
          .bph-open-badge { font-size: 0.62rem; }
          .bph-open-sub { display: none; }
          .bph-next-slot { padding: 0.6rem 1rem; }
          .bph-lightbox-nav { width: 38px; height: 38px; font-size: 1.1rem; margin: 0 0.4rem; }
        }
      `}</style>
    </div>
  );
}

// ── Testimonials — single rotating quote on dark glass ───────

function TestimonialsSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 4800);
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section style={{ background: 'var(--g0)', position: 'relative', overflow: 'hidden' }}>
      {/* decorative stripes, flanking */}
      <div style={{ position: 'absolute', right: -50, top: '50%', transform: 'translateY(-50%)', width: 170, opacity: 0.05, pointerEvents: 'none', zIndex: 0, animation: 'stripes-pulse 8s ease-in-out infinite', filter: 'grayscale(1) brightness(3)' }}>
        <img src="/images/stripes.png" alt="" style={{ width: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: -50, top: '50%', transform: 'translateY(-50%) scaleX(-1)', width: 170, opacity: 0.05, pointerEvents: 'none', zIndex: 0, animation: 'stripes-pulse 8s ease-in-out 4s infinite', filter: 'grayscale(1) brightness(3)' }}>
        <img src="/images/stripes.png" alt="" style={{ width: '100%' }} />
      </div>

      <div className="bph-section" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Reveal>
          <p className="bph-eyebrow">לקוחות מדברים</p>
          <h2 className="display display-lg" style={{ color: 'var(--cream)', marginBottom: '3rem' }}>
            מה <span className="bph-gold-text" style={{ fontStyle: 'italic' }}>אומרים</span> עלינו
          </h2>
        </Reveal>

        <div key={active} style={{
          maxWidth: 640,
          margin: '0 auto',
          background: 'var(--g1)',
          border: '1px solid var(--line)',
          borderRadius: 4,
          padding: 'clamp(2.5rem, 6vw, 4rem) clamp(1.75rem, 5vw, 3rem)',
          position: 'relative',
          animation: 'slide-in 0.35s ease both',
          minHeight: 220,
        }}>
          <div style={{ position: 'absolute', top: 12, insetInlineEnd: 24, fontSize: '4.5rem', fontFamily: 'Georgia, serif', color: 'rgba(201,164,73,0.18)', lineHeight: 1, userSelect: 'none' }}>"</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: '1.5rem' }}>
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill={s <= t.stars ? '#c9a449' : 'rgba(243,236,221,0.15)'}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            ))}
          </div>

          <p className="display" style={{ fontSize: '1.15rem', lineHeight: 1.85, color: 'var(--cream)', fontStyle: 'italic', fontWeight: 400, marginBottom: '2rem' }}>
            "{t.text}"
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem' }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(201,164,73,0.14), rgba(201,164,73,0.30))',
              border: '1.5px solid rgba(201,164,73,0.40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.05rem', fontWeight: 700, color: 'var(--gold-light)', fontFamily: 'var(--font-display)',
            }}>{t.initial}</div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cream)' }}>{t.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--cream-faint)' }}>{t.service}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: '1.75rem' }}>
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`עבור לחוות דעת ${i + 1}`}
              style={{ width: i === active ? 28 : 8, height: 8, borderRadius: 4, background: i === active ? 'var(--gold)' : 'rgba(243,236,221,0.18)', border: 'none', cursor: 'pointer', transition: 'all 0.32s ease', padding: 0 }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: '1rem' }}>
          {['›', '‹'].map((arrow, ai) => (
            <button
              key={ai}
              onClick={() => setActive(a => ai === 0 ? (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length : (a + 1) % TESTIMONIALS.length)}
              aria-label={ai === 0 ? 'הקודם' : 'הבא'}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: '1.5px solid rgba(243,236,221,0.16)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cream-dim)', fontSize: '1.1rem', fontWeight: 600, transition: 'all 0.28s ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold-light)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(243,236,221,0.16)'; e.currentTarget.style.color = 'var(--cream-dim)'; }}
            >{arrow}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
