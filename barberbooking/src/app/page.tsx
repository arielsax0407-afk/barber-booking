'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Static data ───────────────────────────────────────────

const SERVICES_PREVIEW = [
  { name: 'תספורת', price: '60₪', duration: '30 דק׳' },
  { name: 'עיצוב זקן', price: '40₪', duration: '20 דק׳' },
  { name: 'תספורת + זקן', price: '90₪', duration: '50 דק׳' },
  { name: 'פייד', price: '70₪', duration: '40 דק׳' },
];

const STEPS = [
  { num: '01', emoji: '✂️', title: 'בחר שירות', desc: 'בחר את השירות המתאים לך — תספורת, עיצוב זקן, פייד ועוד' },
  { num: '02', emoji: '📅', title: 'קבע תאריך ושעה', desc: 'ראה בזמן אמת אילו שעות פנויות ובחר את הזמן הנוח לך' },
  { num: '03', emoji: '👑', title: 'הגע ותהנה', desc: 'קבל אישור ב-WhatsApp, הגע בדיוק לשעה ותצא עם מראה שישנה לך את היום' },
];

const GALLERY = [
  { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=480&h=480&fit=crop&q=80', label: 'תספורת קלאסית' },
  { url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=480&h=480&fit=crop&q=80', label: 'עיצוב זקן' },
  { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=480&h=480&fit=crop&q=80', label: 'פייד מקצועי' },
  { url: 'https://images.unsplash.com/photo-1593702288056-7cc32b615b0e?w=480&h=480&fit=crop&q=80', label: 'חיתוך מדויק' },
  { url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=480&h=480&fit=crop&q=80', label: 'סטייל מודרני' },
  { url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=480&h=480&fit=crop&q=80', label: 'אווירת המקום' },
];

const TESTIMONIALS = [
  { name: 'דוד כהן', service: 'תספורת + עיצוב זקן', text: 'הכי טוב שהיה לי. הספר ידע בדיוק מה אני רוצה רק ממבט אחד. אני מגיע כל שבוע ולא מוכן לשנות.', stars: 5, initial: 'ד', color: '#0D9488' },
  { name: 'יוסי לוי', service: 'פייד', text: 'כבר שנה שאני מגיע פעמיים בחודש. הצוות מקצועי, נעים ותמיד בדיוק לשעה. תספורת מושלמת כל פעם.', stars: 5, initial: 'י', color: '#D4900A' },
  { name: 'אמיר חדד', service: 'עיצוב זקן', text: 'עיצוב הזקן שינה לי את המראה לגמרי. אנשים שואלים מה עשיתי, תמיד עונה: ברבר בודפשט. ממליץ בחום!', stars: 5, initial: 'א', color: '#0F766E' },
  { name: 'רון ביטון', service: 'תספורת ילדים', text: 'הבן שלי פחד מספרים, כאן הוא מתרגש לבוא. הצוות יודע לעבוד עם ילדים בצורה מדהימה. תודה רבה!', stars: 5, initial: 'ר', color: '#D97706' },
  { name: 'עמית שלום', service: 'תספורת', text: 'קביעת תור אונליין זה שינוי משחק. 2 דקות ויש לי תור. תמיד יוצא מרוצה ומרגיש כמו מלך. 10/10.', stars: 5, initial: 'ע', color: '#0D9488' },
];

// ── Page ──────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="page-bg">

      {/* ── WhatsApp float ───────────────────────────────── */}
      <a
        href="https://wa.me/972500000000"
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
      <section
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 40% 10%, rgba(212,144,10,0.11) 0%, transparent 55%),
            radial-gradient(ellipse 55% 40% at 72% 58%, rgba(15,118,110,0.07) 0%, transparent 50%),
            linear-gradient(150deg, #0D1B2A 0%, #0F2338 60%, #0A1523 100%)
          `,
        }}
      >
        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,144,10,0.14), transparent 70%)', top: '12%', right: '8%', animation: 'drift1 22s ease-in-out infinite', filter: 'blur(55px)' }} />
          <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,118,110,0.12), transparent 70%)', bottom: '28%', left: '5%', animation: 'drift2 17s ease-in-out infinite', filter: 'blur(45px)' }} />
          <div style={{ position: 'absolute', width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,144,10,0.09), transparent 70%)', top: '48%', right: '28%', animation: 'drift1 28s ease-in-out infinite reverse', filter: 'blur(38px)' }} />
        </div>

        {/* Decorative lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: '100%', background: 'linear-gradient(180deg, transparent, rgba(212,144,10,0.09) 30%, rgba(212,144,10,0.09) 70%, transparent)' }} />
          <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,144,10,0.07), transparent)' }} />
          <div style={{ position: 'absolute', bottom: '20%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,144,10,0.07), transparent)' }} />
          <div style={{ position: 'absolute', top: 32, right: 32, width: 60, height: 60, borderTop: '1px solid rgba(212,144,10,0.28)', borderRight: 'none', borderBottom: 'none', borderLeft: '1px solid rgba(212,144,10,0.28)' }} />
          <div style={{ position: 'absolute', bottom: 32, left: 32, width: 60, height: 60, borderBottom: '1px solid rgba(212,144,10,0.28)', borderLeft: 'none', borderTop: 'none', borderRight: '1px solid rgba(212,144,10,0.28)' }} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4 animate-fade-in max-w-6xl mx-auto w-full">
          <ScissorIcon />
          <span className="serif" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'rgba(250,248,244,0.52)', textTransform: 'uppercase' }}>
            תל אביב · א׳–ו׳
          </span>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="animate-fade-up flex items-center gap-3 mb-8">
            <div style={{ width: 40, height: 1, background: 'var(--amber)', opacity: 0.65 }} />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 600 }}>מספרה יוקרתית בתל אביב</span>
            <div style={{ width: 40, height: 1, background: 'var(--amber)', opacity: 0.65 }} />
          </div>

          <h1 className="display display-xl animate-fade-up delay-100" style={{ maxWidth: 700 }}>
            <span className="gold-gradient">ברבר</span>
            <br />
            <span style={{ color: '#FAF8F4', fontStyle: 'italic', fontWeight: 300 }}>בודפשט</span>
          </h1>

          <p className="animate-fade-up delay-200" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'rgba(250,248,244,0.62)', marginTop: '1.5rem', maxWidth: 400, lineHeight: 1.7, fontWeight: 300 }}>
            האמנות של להיראות מושלם.<br />חווית טיפוח שתזכרו.
          </p>

          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center gap-4 mt-12">
            <Link href="/book" className="btn-primary" style={{ fontSize: '0.8125rem', padding: '1rem 3rem' }}>
              קבע תור עכשיו
            </Link>
          </div>

          <div className="animate-fade-up delay-400 flex items-center gap-8 mt-16">
            {[['500+', 'לקוחות מרוצים'], ['4.9★', 'דירוג גוגל'], ['8+', 'שנות ניסיון']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="serif gold-gradient" style={{ fontSize: '1.75rem', fontWeight: 500, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,248,244,0.38)', marginTop: '0.375rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-fade-up delay-500 flex justify-center pb-10">
          <div className="animate-float" style={{ color: 'rgba(250,248,244,0.38)', fontSize: '0.75rem', letterSpacing: '0.15em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(180deg, transparent, rgba(212,144,10,0.50))' }} />
            <span style={{ textTransform: 'uppercase' }}>גלול</span>
          </div>
        </div>
      </section>

      {/* ── Social proof ticker ───────────────────────────── */}
      <div style={{ background: 'var(--surface-dark)', padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {[
          { icon: '🔥', text: 'מעל 47 תורים החודש' },
          { icon: '⭐', text: 'דירוג 4.9 בגוגל' },
          { icon: '✂️', text: 'א׳–ו׳ · 9:00–19:00' },
          { icon: '💬', text: 'אישור WhatsApp מיידי' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(250,248,244,0.60)', fontSize: '0.78rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* ── Services ─────────────────────────────────────── */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '1rem', fontWeight: 600 }}>השירותים שלנו</p>
          <h2 className="display display-lg" style={{ color: 'var(--text)' }}>
            <span style={{ fontStyle: 'italic', fontWeight: 400 }}>האמנות</span>{' '}שלנו
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {SERVICES_PREVIEW.map((s, i) => (
            <div
              key={s.name}
              className={`glass-card p-6 animate-fade-up delay-${(i + 1) * 100}`}
              style={{ animationFillMode: 'both', background: '#fff' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.12em', opacity: 0.75, paddingTop: 4 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1 }}>
                  <div className="divider" style={{ margin: '0 0 0.875rem 0' }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <p style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text)' }}>{s.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{s.duration}</p>
                    </div>
                    <span className="serif" style={{ color: 'var(--amber)', fontSize: '1.25rem', fontWeight: 600 }}>{s.price}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/book" className="btn-outline">לכל השירותים</Link>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section style={{ background: 'var(--bg-2)', padding: '5rem 1.5rem', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 600, marginBottom: '0.75rem' }}>פשוט ומהיר</p>
            <h2 className="display display-lg" style={{ color: 'var(--text)' }}>
              איך זה <span style={{ fontStyle: 'italic' }}>עובד?</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {STEPS.map((step) => (
              <div key={step.num} style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: '2rem 1.75rem', boxShadow: 'var(--shadow-card)', border: '1px solid var(--glass-border)', position: 'relative', textAlign: 'right', overflow: 'hidden' }}>
                {/* big number bg */}
                <div style={{ position: 'absolute', top: -8, left: 12, fontSize: '5.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'rgba(212,144,10,0.08)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{step.num}</div>
                <div style={{ fontSize: '2.25rem', marginBottom: '0.875rem' }}>{step.emoji}</div>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/book" className="btn-primary">קבע תור עכשיו</Link>
          </div>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 600, marginBottom: '0.75rem' }}>הגלריה שלנו</p>
            <h2 className="display display-lg" style={{ color: 'var(--text)' }}>
              <span style={{ fontStyle: 'italic' }}>העבודות</span> שלנו
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {GALLERY.map((img, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                onMouseEnter={e => { const im = e.currentTarget.querySelector('img') as HTMLImageElement; if (im) im.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { const im = e.currentTarget.querySelector('img') as HTMLImageElement; if (im) im.style.transform = 'scale(1)'; }}
              >
                <img
                  src={img.url}
                  alt={img.label}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.45s ease', display: 'block' }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 0.75rem 0.75rem', background: 'linear-gradient(transparent, rgba(13,27,41,0.72))', color: 'rgba(250,248,244,0.90)', fontSize: '0.75rem', textAlign: 'center', letterSpacing: '0.08em', fontWeight: 500 }}>
                  {img.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/book" className="btn-outline">קבע תור עכשיו</Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── Why us ───────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }} className="px-6 py-24">
        <div className="max-w-4xl mx-auto grid gap-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { icon: '✦', title: 'מקצועיות', body: 'כל ספר עבר הכשרה מקצועית ומביא איתו שנים של ניסיון' },
            { icon: '◈', title: 'אווירה', body: 'מרחב מוקפד ואינטימי שיגרום לכם להרגיש מלכים' },
            { icon: '◆', title: 'דיוק', body: 'תספורת מושלמת, כל פעם. ללא פשרות, ללא חצי עבודות' },
          ].map((item) => (
            <div key={item.title} className="text-center">
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--amber)' }}>{item.icon}</div>
              <h3 className="serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: 600 }}>{item.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="px-6 py-32 text-center" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)' }}>
        <div className="max-w-xl mx-auto">
          <p className="serif" style={{ fontSize: '0.8rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--amber)', fontWeight: 500 }}>מוכן?</p>
          <h2 className="display display-lg mb-8" style={{ color: 'var(--text)' }}>
            קבע את התור{' '}<span style={{ fontStyle: 'italic', fontWeight: 300 }}>שלך</span>
          </h2>
          <Link href="/book" className="btn-primary animate-pulse-gold" style={{ fontSize: '0.875rem', padding: '1.125rem 3.5rem' }}>
            קביעת תור
          </Link>
          <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            ללא כרטיס אשראי · אישור ב-WhatsApp תוך שעה
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer style={{ background: 'var(--surface-dark)', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p className="serif gold-gradient" style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>ברבר בודפשט</p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(250,248,244,0.38)', letterSpacing: '0.1em' }}>תל אביב · א׳–ו׳ 9:00–19:00</p>
      </footer>

      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          25%  { transform: translate(18px, -22px); }
          50%  { transform: translate(-12px, 14px); }
          75%  { transform: translate(8px, 20px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          30%  { transform: translate(-18px, 14px); }
          60%  { transform: translate(14px, -18px); }
          80%  { transform: translate(-8px, -6px); }
        }
        @keyframes pulse-wa {
          0%, 100% { box-shadow: 0 4px 20px rgba(37,211,102,0.42); }
          50%  { box-shadow: 0 4px 32px rgba(37,211,102,0.68), 0 0 0 10px rgba(37,211,102,0.08); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Testimonials carousel ─────────────────────────────────

function TestimonialsSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 4800);
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 600, marginBottom: '0.75rem' }}>
          לקוחות מדברים
        </p>
        <h2 className="display display-lg" style={{ color: 'var(--text)', marginBottom: '3rem' }}>
          מה <span style={{ fontStyle: 'italic' }}>אומרים</span> עלינו
        </h2>

        <div key={active} style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 4px 40px rgba(28,25,23,0.07)',
          border: '1px solid var(--glass-border)',
          position: 'relative',
          animation: 'slide-in 0.35s ease both',
          minHeight: 200,
        }}>
          {/* Quote mark */}
          <div style={{ position: 'absolute', top: 16, right: 22, fontSize: '4.5rem', fontFamily: 'Georgia, serif', color: 'rgba(212,144,10,0.13)', lineHeight: 1, userSelect: 'none' }}>"</div>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: '1.25rem' }}>
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill={s <= t.stars ? '#F5BC2F' : '#E8DDD0'}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            ))}
          </div>

          <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: 'var(--text)', fontStyle: 'italic', marginBottom: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 400 }}>
            "{t.text}"
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: `linear-gradient(135deg, ${t.color}22, ${t.color}44)`,
              border: `2px solid ${t.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontWeight: 700, color: t.color,
              fontFamily: 'var(--font-display)',
            }}>{t.initial}</div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{t.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t.service}</p>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: '1.5rem' }}>
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: i === active ? 28 : 8, height: 8, borderRadius: 4,
                background: i === active ? 'var(--amber)' : 'rgba(28,25,23,0.14)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.32s ease', padding: 0,
              }}
            />
          ))}
        </div>

        {/* Nav arrows */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: '1rem' }}>
          {['›', '‹'].map((arrow, ai) => (
            <button
              key={ai}
              onClick={() => setActive(a => ai === 0 ? (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length : (a + 1) % TESTIMONIALS.length)}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#fff', border: '1.5px solid rgba(28,25,23,0.10)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text)', boxShadow: 'var(--shadow-card)',
                fontSize: '1.1rem', fontWeight: 600,
                transition: 'var(--transition)',
              }}
            >{arrow}</button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Icons ─────────────────────────────────────────────────

function ScissorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  );
}
