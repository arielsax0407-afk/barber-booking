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
  { name: 'דוד כהן', service: 'תספורת + עיצוב זקן', text: 'הכי טוב שהיה לי. הספר ידע בדיוק מה אני רוצה רק ממבט אחד. אני מגיע כל שבוע ולא מוכן לשנות.', stars: 5, initial: 'ד', color: '#1A50A8' },
  { name: 'יוסי לוי', service: 'פייד', text: 'כבר שנה שאני מגיע פעמיים בחודש. הצוות מקצועי, נעים ותמיד בדיוק לשעה. תספורת מושלמת כל פעם.', stars: 5, initial: 'י', color: '#CC1A1A' },
  { name: 'אמיר חדד', service: 'עיצוב זקן', text: 'עיצוב הזקן שינה לי את המראה לגמרי. אנשים שואלים מה עשיתי, תמיד עונה: ברבר בודפשט. ממליץ בחום!', stars: 5, initial: 'א', color: '#1A50A8' },
  { name: 'רון ביטון', service: 'תספורת ילדים', text: 'הבן שלי פחד מספרים, כאן הוא מתרגש לבוא. הצוות יודע לעבוד עם ילדים בצורה מדהימה. תודה רבה!', stars: 5, initial: 'ר', color: '#CC1A1A' },
  { name: 'עמית שלום', service: 'תספורת', text: 'קביעת תור אונליין זה שינוי משחק. 2 דקות ויש לי תור. תמיד יוצא מרוצה ומרגיש כמו מלך. 10/10.', stars: 5, initial: 'ע', color: '#1A50A8' },
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
          background: `linear-gradient(150deg, #0A1628 0%, #0F1E38 55%, #0A1220 100%)`,
        }}
      >
        {/* ① texture.png — barber-stripe pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          backgroundImage: 'url(/images/texture.png)',
          backgroundSize: '320px 320px',
          backgroundRepeat: 'repeat',
          opacity: 0.055,
          mixBlendMode: 'screen',
        }} />

        {/* Radial colour glows */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,26,26,0.12), transparent 70%)', top: '5%', right: '10%', filter: 'blur(60px)', animation: 'drift1 22s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,80,168,0.10), transparent 70%)', bottom: '20%', left: '30%', filter: 'blur(50px)', animation: 'drift2 18s ease-in-out infinite' }} />
        </div>

        {/* ② clipper1.png — floating real trimmer, left side */}
        <div className="hero-clipper-wrap" style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 'clamp(160px, 36vw, 400px)',
          display: 'flex', alignItems: 'center',
          zIndex: 3, pointerEvents: 'none',
          paddingLeft: 'clamp(0px, 1vw, 20px)',
        }}>
          <img
            src="/images/clipper1.png"
            alt=""
            className="hero-clipper-img"
            style={{
              width: '100%',
              height: 'auto',
              filter: 'drop-shadow(0 24px 56px rgba(0,0,0,0.65)) drop-shadow(0 0 30px rgba(204,26,26,0.18))',
            }}
          />
        </div>

        {/* ③ barber-pole.png — spinning in nav */}
        <nav className="relative flex items-center justify-between px-6 pt-8 pb-4 animate-fade-in max-w-6xl mx-auto w-full" style={{ zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <img
              src="/images/barber-pole.png"
              alt="לוגו ברבר בודפשט"
              style={{
                height: 42,
                filter: 'drop-shadow(0 2px 10px rgba(204,26,26,0.50))',
                animation: 'barber-pole-spin 10s linear infinite',
              }}
            />
            <span className="serif" style={{ color: '#FAF8F4', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.04em' }}>
              ברבר בודפשט
            </span>
          </div>
          <span className="serif" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'rgba(250,248,244,0.50)', textTransform: 'uppercase' }}>
            תל אביב · א׳–ו׳
          </span>
        </nav>

        {/* Hero text — centred, above clipper */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 text-center" style={{ zIndex: 5 }}>
          <div className="animate-fade-up flex items-center gap-3 mb-8">
            <div style={{ width: 40, height: 1, background: 'var(--red)', opacity: 0.7 }} />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--red)', fontWeight: 600 }}>מספרה יוקרתית בתל אביב</span>
            <div style={{ width: 40, height: 1, background: 'var(--red)', opacity: 0.7 }} />
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

        <div className="animate-fade-up delay-500 flex justify-center pb-10" style={{ zIndex: 5, position: 'relative' }}>
          <div className="animate-float" style={{ color: 'rgba(250,248,244,0.36)', fontSize: '0.75rem', letterSpacing: '0.15em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(180deg, transparent, rgba(204,26,26,0.55))' }} />
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
            <span>{icon}</span><span>{text}</span>
          </div>
        ))}
      </div>

      {/* ── Services ─────────────────────────────────────── */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '1rem', fontWeight: 600 }}>השירותים שלנו</p>
          <h2 className="display display-lg" style={{ color: 'var(--text)' }}>
            <span style={{ fontStyle: 'italic' }}>האמנות</span>{' '}שלנו
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {SERVICES_PREVIEW.map((s, i) => (
            <div key={s.name} className={`glass-card p-6 animate-fade-up delay-${(i + 1) * 100}`} style={{ animationFillMode: 'both', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red)', letterSpacing: '0.12em', opacity: 0.7, paddingTop: 4 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="divider" style={{ margin: '0 0 0.875rem 0' }} />
                  <div className="flex items-start justify-between" style={{ gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{s.duration}</p>
                    </div>
                    <span className="serif" style={{ color: 'var(--red)', fontSize: '1.25rem', fontWeight: 600, flexShrink: 0 }}>{s.price}</span>
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

      {/* ── How it works — clipper2 in background ────────── */}
      <section style={{ background: 'var(--bg-2)', padding: '5rem 1.5rem', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', position: 'relative', overflow: 'hidden' }}>
        {/* ④ clipper2.png — slowly rotating illustrated trimmer */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(160px, 30%, 280px)',
          opacity: 0.045,
          pointerEvents: 'none',
          animation: 'slow-rotate 24s linear infinite',
          zIndex: 0,
        }}>
          <img src="/images/clipper2.png" alt="" style={{ width: '100%' }} />
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--red)', fontWeight: 600, marginBottom: '0.75rem' }}>פשוט ומהיר</p>
            <h2 className="display display-lg" style={{ color: 'var(--text)' }}>
              איך זה <span style={{ fontStyle: 'italic' }}>עובד?</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {STEPS.map((step) => (
              <div key={step.num} style={{ background: '#fff', borderRadius: 'var(--radius-lg)', padding: '2rem 1.75rem', boxShadow: 'var(--shadow-card)', border: '1px solid var(--glass-border)', position: 'relative', textAlign: 'right', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -8, left: 12, fontSize: '5.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'rgba(204,26,26,0.07)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{step.num}</div>
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
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--red)', fontWeight: 600, marginBottom: '0.75rem' }}>הגלריה שלנו</p>
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
                <img src={img.url} alt={img.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.45s ease', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 0.75rem 0.75rem', background: 'linear-gradient(transparent, rgba(10,22,40,0.75))', color: 'rgba(250,248,244,0.90)', fontSize: '0.75rem', textAlign: 'center', letterSpacing: '0.08em', fontWeight: 500 }}>
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

      {/* ── Testimonials — stripes.png flanking both sides ── */}
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
              <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--red)' }}>{item.icon}</div>
              <h3 className="serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text)', fontWeight: 600 }}>{item.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="px-6 py-32 text-center" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)' }}>
        <div className="max-w-xl mx-auto">
          <p className="serif" style={{ fontSize: '0.8rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--red)', fontWeight: 500 }}>מוכן?</p>
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

      {/* ── Footer — spinning barber pole ────────────────── */}
      <footer style={{ background: 'var(--surface-dark)', padding: '3rem 1.5rem', textAlign: 'center' }}>
        {/* ③ barber-pole.png — spinning brand icon in footer too */}
        <img
          src="/images/barber-pole.png"
          alt=""
          style={{
            height: 72,
            marginBottom: '1rem',
            animation: 'barber-pole-spin 10s linear infinite',
            filter: 'drop-shadow(0 4px 20px rgba(204,26,26,0.45))',
            display: 'block',
            margin: '0 auto 1rem',
          }}
        />
        <p className="serif gold-gradient" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>ברבר בודפשט</p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(250,248,244,0.38)', letterSpacing: '0.1em' }}>תל אביב · א׳–ו׳ 9:00–19:00</p>
      </footer>

      {/* ── Keyframes ────────────────────────────────────── */}
      <style>{`
        /* Barber pole 360 spin */
        @keyframes barber-pole-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Clipper entrance slide-in from left */
        .hero-clipper-wrap {
          animation: clipper-in 1.2s cubic-bezier(0.34,1.2,0.64,1) 0.4s both;
        }
        @keyframes clipper-in {
          from { opacity: 0; transform: translateX(-60px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* Clipper continuous float + slight tilt */
        .hero-clipper-img {
          animation: clipper-float 5.5s ease-in-out 1.8s infinite;
          transform-origin: center bottom;
        }
        @keyframes clipper-float {
          0%,100% { transform: translateY(0) rotate(-6deg); }
          50%      { transform: translateY(-22px) rotate(-4deg); }
        }

        /* clipper2 slow background rotation */
        @keyframes slow-rotate {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }

        /* Orb drift */
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

        /* WhatsApp pulse */
        @keyframes pulse-wa {
          0%,100% { box-shadow: 0 4px 20px rgba(37,211,102,0.42); }
          50%  { box-shadow: 0 4px 32px rgba(37,211,102,0.68), 0 0 0 10px rgba(37,211,102,0.08); }
        }

        /* Testimonial slide-in */
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Testimonials — ⑤ stripes.png on both sides ───────────

function TestimonialsSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 4800);
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section style={{ background: '#fff', padding: '5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* ⑤ stripes.png — decorative barber-stripe icons, flanking */}
      <div style={{ position: 'absolute', right: -50, top: '50%', transform: 'translateY(-50%)', width: 170, opacity: 0.055, pointerEvents: 'none', zIndex: 0, animation: 'stripes-pulse 8s ease-in-out infinite' }}>
        <img src="/images/stripes.png" alt="" style={{ width: '100%' }} />
      </div>
      <div style={{ position: 'absolute', left: -50, top: '50%', transform: 'translateY(-50%) scaleX(-1)', width: 170, opacity: 0.055, pointerEvents: 'none', zIndex: 0, animation: 'stripes-pulse 8s ease-in-out 4s infinite' }}>
        <img src="/images/stripes.png" alt="" style={{ width: '100%' }} />
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--red)', fontWeight: 600, marginBottom: '0.75rem' }}>
          לקוחות מדברים
        </p>
        <h2 className="display display-lg" style={{ color: 'var(--text)', marginBottom: '3rem' }}>
          מה <span style={{ fontStyle: 'italic' }}>אומרים</span> עלינו
        </h2>

        <div key={active} style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 4px 40px rgba(17,17,17,0.07)',
          border: '1px solid var(--glass-border)',
          position: 'relative',
          animation: 'slide-in 0.35s ease both',
          minHeight: 200,
        }}>
          <div style={{ position: 'absolute', top: 16, right: 22, fontSize: '4.5rem', fontFamily: 'Georgia, serif', color: 'rgba(204,26,26,0.12)', lineHeight: 1, userSelect: 'none' }}>"</div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: '1.25rem' }}>
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill={s <= t.stars ? '#CC1A1A' : '#DDE5F0'}>
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
              background: `linear-gradient(135deg, ${t.color}20, ${t.color}44)`,
              border: `2px solid ${t.color}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontWeight: 700, color: t.color, fontFamily: 'var(--font-display)',
            }}>{t.initial}</div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{t.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t.service}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: '1.5rem' }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? 28 : 8, height: 8, borderRadius: 4, background: i === active ? 'var(--red)' : 'rgba(17,17,17,0.14)', border: 'none', cursor: 'pointer', transition: 'all 0.32s ease', padding: 0 }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: '1rem' }}>
          {['›', '‹'].map((arrow, ai) => (
            <button key={ai} onClick={() => setActive(a => ai === 0 ? (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length : (a + 1) % TESTIMONIALS.length)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', border: '1.5px solid rgba(17,17,17,0.10)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', boxShadow: 'var(--shadow-card)', fontSize: '1.1rem', fontWeight: 600, transition: 'var(--transition)' }}
            >{arrow}</button>
          ))}
        </div>

        <style>{`
          @keyframes stripes-pulse {
            0%,100% { opacity: 0.055; transform: translateY(-50%) scale(1); }
            50%      { opacity: 0.085; transform: translateY(-50%) scale(1.04); }
          }
        `}</style>
      </div>
    </section>
  );
}
