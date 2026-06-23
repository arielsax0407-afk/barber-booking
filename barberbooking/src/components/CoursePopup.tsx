'use client';

import { useState, useEffect } from 'react';
import { waLink } from '@/lib/waLink';

const SEEN_KEY = 'alpha_course_popup_seen';
const SHAY_PHONE = '972535907078';
const WA_MESSAGE = 'היי שי! ראיתי את הקורס ALPHA Barber באתר ואשמח לקבל פרטים 🙏';

export default function CoursePopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try { alreadySeen = localStorage.getItem(SEEN_KEY) === '1'; } catch {}
    if (alreadySeen) return;

    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ALPHA Barber — קורס ספרות מקצועי"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(8,4,14,0.78)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          background: 'linear-gradient(165deg, var(--g1), var(--g0))',
          border: '1px solid rgba(178,102,255,0.30)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem 1.75rem 2rem',
          textAlign: 'center',
          direction: 'rtl',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 70px rgba(178,102,255,0.16)',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="סגור"
          style={{
            position: 'absolute',
            top: 14,
            insetInlineEnd: 14,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--line)',
            color: 'var(--cream-dim)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold-light)', fontWeight: 700, marginBottom: '0.5rem' }}>
          קורס ספרות מקצועי
        </p>
        <h2 className="display" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.1rem)', color: 'var(--cream)', marginBottom: '1rem' }}>
          <span className="bph-gold-text" style={{ fontStyle: 'italic' }}>ALPHA</span> Barber
        </h2>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--cream-dim)', marginBottom: '1.75rem' }}>
          רוצה ללמוד את המקצוע מהיסוד? הצטרף לקורס ALPHA Barber והפוך לספר מקצועי.
        </p>

        <a
          href={waLink(SHAY_PHONE, WA_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="bph-btn"
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          לפרטים בוואטסאפ 💬
        </a>

        <button
          onClick={dismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--cream-faint)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          אולי מאוחר יותר
        </button>
      </div>
    </div>
  );
}
