'use client';

import Link from 'next/link';

const SERVICES_PREVIEW = [
  { name: 'תספורת', price: '60₪', duration: '30 דק׳' },
  { name: 'עיצוב זקן', price: '40₪', duration: '20 דק׳' },
  { name: 'תספורת + זקן', price: '90₪', duration: '50 דק׳' },
  { name: 'פייד', price: '70₪', duration: '40 דק׳' },
];

export default function HomePage() {
  return (
    <div className="page-bg">
      {/* ── Hero ─────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 50%, rgba(201,168,76,0.04) 0%, transparent 60%),
            #080808
          `,
        }}
      >
        {/* Decorative lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 1, height: '100%',
            background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.08) 30%, rgba(201,168,76,0.08) 70%, transparent)',
          }} />
          <div style={{
            position: 'absolute', top: '20%', left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.06), transparent)',
          }} />
          <div style={{
            position: 'absolute', bottom: '20%', left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.06), transparent)',
          }} />
          {/* Corner accents */}
          <div style={{ position: 'absolute', top: 32, right: 32, width: 60, height: 60, borderTop: '1px solid rgba(201,168,76,0.2)', borderRight: 'none', borderBottom: 'none', borderLeft: '1px solid rgba(201,168,76,0.2)' }} />
          <div style={{ position: 'absolute', bottom: 32, left: 32, width: 60, height: 60, borderBottom: '1px solid rgba(201,168,76,0.2)', borderLeft: 'none', borderTop: 'none', borderRight: '1px solid rgba(201,168,76,0.2)' }} />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4 animate-fade-in max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <ScissorIcon />
          </div>
          <span className="serif" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            תל אביב · א׳–ו׳
          </span>
        </nav>

        {/* Main hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">

          {/* Eyebrow */}
          <div className="animate-fade-up flex items-center gap-3 mb-8">
            <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
            <span style={{
              fontSize: '0.7rem', letterSpacing: '0.25em',
              textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 500,
            }}>
              מספרה יוקרתית בתל אביב
            </span>
            <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.5 }} />
          </div>

          {/* Main title */}
          <h1 className="display display-xl animate-fade-up delay-100" style={{ maxWidth: 700 }}>
            <span className="gold-gradient">ברבר</span>
            <br />
            <span style={{ color: 'var(--text)', fontStyle: 'italic', fontWeight: 300 }}>בודפשט</span>
          </h1>

          {/* Tagline */}
          <p className="animate-fade-up delay-200" style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: 'var(--text-muted)',
            marginTop: '1.5rem',
            maxWidth: 400,
            lineHeight: 1.7,
            fontWeight: 300,
          }}>
            האמנות של להיראות מושלם.<br />חווית טיפוח שתזכרו.
          </p>

          {/* CTA */}
          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center gap-4 mt-12">
            <Link href="/book" className="btn-primary" style={{ fontSize: '0.8125rem', padding: '1rem 3rem' }}>
              קבע תור עכשיו
            </Link>
          </div>

          {/* Stats */}
          <div className="animate-fade-up delay-400 flex items-center gap-8 mt-16">
            {[['500+', 'לקוחות מרוצים'], ['5★', 'דירוג ממוצע'], ['8+', 'שנות ניסיון']].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="serif gold-gradient" style={{ fontSize: '1.75rem', fontWeight: 500, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: '0.375rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom scroll cue */}
        <div className="animate-fade-up delay-500 flex justify-center pb-10">
          <div className="animate-float" style={{ color: 'var(--text-dim)', fontSize: '0.75rem', letterSpacing: '0.15em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.4))' }} />
            <span style={{ textTransform: 'uppercase' }}>גלול</span>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────── */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>השירותים שלנו</p>
          <h2 className="display display-lg">
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>האמנות</span>
            {' '}שלנו
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {SERVICES_PREVIEW.map((s, i) => (
            <div
              key={s.name}
              className={`glass-card p-6 animate-fade-up delay-${(i + 1) * 100}`}
              style={{ animationFillMode: 'both' }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <div className="divider" style={{ margin: '0 0 1rem 0' }} />
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <p style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.25rem' }}>{s.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{s.duration}</p>
                </div>
                <span className="gold serif" style={{ fontSize: '1.25rem', fontWeight: 500 }}>{s.price}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/book" className="btn-outline">
            לכל השירותים
          </Link>
        </div>
      </section>

      {/* ── Why us ───────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}
        className="px-6 py-24">
        <div className="max-w-4xl mx-auto grid gap-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { icon: '✦', title: 'מקצועיות', body: 'כל ספר עבר הכשרה מקצועית ומביא איתו שנים של ניסיון' },
            { icon: '◈', title: 'אווירה', body: 'מרחב מוקפד ואינטימי שיגרום לכם להרגיש מלכים' },
            { icon: '◆', title: 'דיוק', body: 'תספורת מושלמת, כל פעם. ללא פשרות, ללא חצי עבודות' },
          ].map((item) => (
            <div key={item.title} className="text-center">
              <div className="gold serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{item.icon}</div>
              <h3 className="serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="px-6 py-32 text-center">
        <div className="max-w-xl mx-auto">
          <p className="gold serif" style={{ fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            מוכן?
          </p>
          <h2 className="display display-lg mb-8">
            קבע את התור{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>שלך</span>
          </h2>
          <Link href="/book" className="btn-primary animate-pulse-gold" style={{ fontSize: '0.875rem', padding: '1.125rem 3.5rem' }}>
            קביעת תור
          </Link>
          <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            ללא כרטיס אשראי · אישור תוך שעה
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p className="serif gold-gradient" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>ברבר בודפשט</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>תל אביב · א׳–ו׳ 9:00–19:00</p>
      </footer>
    </div>
  );
}

function ScissorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  );
}
