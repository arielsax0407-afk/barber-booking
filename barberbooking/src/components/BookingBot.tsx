'use client';

import { useEffect, useRef, useState } from 'react';
import { SERVICES, TIME_SLOTS } from '@/lib/services';
import { matchFaq } from '@/lib/botFaq';
import { parseService, parseBarber, parseDate, parseTime } from '@/lib/botParser';

type Barber = { id: string; name: string; specialty: string | null; image_url: string | null };

type Booking = {
  service: string | null;
  barberId: string | null;
  date: string | null;
  time: string | null;
  name: string | null;
  phone: string | null;
};

type PendingField = 'service' | 'barber' | 'date' | 'time' | 'name' | 'phone' | 'confirm' | null;

type QuickReply = { label: string; value: string };

type ChatMessage = { id: number; from: 'bot' | 'user'; text: string; buttons?: QuickReply[] };

const EMPTY_BOOKING: Booking = { service: null, barberId: null, date: null, time: null, name: null, phone: null };

const PURPLE = '#B266FF';
const PURPLE_DARK = '#7C3AED';
const PURPLE_DEEP = '#3C096C';
const WHATSAPP_FALLBACK = 'https://wa.me/972500000000';

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const SERVICE_LABELS: Record<string, string> = SERVICES.reduce(
  (acc, s) => ({ ...acc, [s.id]: s.name }),
  {} as Record<string, string>
);

const SERVICE_QUICK_REPLIES: QuickReply[] = SERVICES.map((s) => ({ label: s.name, value: s.id }));

const CONFIRM_BUTTONS: QuickReply[] = [
  { label: 'כן, לקבוע ✅', value: 'confirm' },
  { label: 'בטל', value: 'cancel' },
];

const WHATSAPP_BUTTON: QuickReply[] = [{ label: 'שלח הודעה בוואטסאפ 💬', value: WHATSAPP_FALLBACK }];
const RETRY_TIME_BUTTON: QuickReply[] = [{ label: 'נסה שוב 🔄', value: 'retry-time' }];
const RETRY_CONFIRM_BUTTON: QuickReply[] = [{ label: 'נסה שוב 🔄', value: 'retry-confirm' }];

const BOOKING_INTENT = ['לקבוע', 'לקבע', 'תור', 'להזמין', 'הזמנה', 'לתאם', 'תספורת', 'להסתפר', 'רוצה תור', 'אפשר תור'];
function hasBookingIntent(text: string): boolean {
  return BOOKING_INTENT.some((w) => text.includes(w));
}

function formatDateHebrew(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `יום ${HEBREW_WEEKDAYS[weekday]} ${d}.${m}`;
}

// Returns null on a network/server failure — callers must NOT treat that as
// "everything is free", since that risks letting a customer book an already-taken slot.
async function fetchFreeSlots(date: string, barberId: string | null): Promise<string[] | null> {
  try {
    const qs = new URLSearchParams({ date });
    if (barberId) qs.set('barber_id', barberId);
    const res = await fetch(`/api/availability?${qs.toString()}`);
    if (!res.ok) return null;
    const json: { takenSlots?: string[] } = await res.json();
    const taken = new Set(json.takenSlots ?? []);
    return TIME_SLOTS.filter((t) => !taken.has(t));
  } catch {
    return null;
  }
}

export default function BookingBot() {
  const [open, setOpen] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbersLoaded, setBarbersLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [booking, setBooking] = useState<Booking>(EMPTY_BOOKING);
  const [pendingField, setPendingField] = useState<PendingField>(null);
  const [inputValue, setInputValue] = useState('');
  const [busy, setBusy] = useState(false);

  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const waitingForBarbersRef = useRef(false);
  const confirmLockRef = useRef(false);

  function nextId() {
    idRef.current += 1;
    return idRef.current;
  }

  function addMessage(from: 'bot' | 'user', text: string, buttons?: QuickReply[]) {
    setMessages((prev) => [...prev, { id: nextId(), from, text, buttons }]);
  }

  useEffect(() => {
    fetch('/api/barbers')
      .then((r) => r.json())
      .then((json) => setBarbers(json.barbers ?? []))
      .catch(() => {})
      .finally(() => setBarbersLoaded(true));
  }, []);

  // If the bot told the customer "loading barbers…" because the fetch above was
  // still in flight, resume the conversation automatically once it settles —
  // otherwise the chat just dead-ends with nothing to click or type that helps.
  useEffect(() => {
    if (barbersLoaded && waitingForBarbersRef.current) {
      waitingForBarbersRef.current = false;
      void advance(booking);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbersLoaded]);

  useEffect(() => {
    if (!open || greetedRef.current) return;
    greetedRef.current = true;
    addMessage(
      'bot',
      'היי! אני העוזר של ברבר פרמיום 💈 אפשר לקבוע לך תור — פשוט תכתוב משהו כמו "תספורת למוטי מחר בשבע", או תשאל אותי שאלה.'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function advance(b: Booking, timeGuess?: string | null) {
    if (!b.service) {
      setPendingField('service');
      addMessage('bot', 'איזה שירות תרצה? (תספורת / זקן / תספורת+זקן / פייד / ילדים)', SERVICE_QUICK_REPLIES);
      return;
    }

    if (!b.barberId) {
      if (!barbersLoaded) {
        waitingForBarbersRef.current = true;
        addMessage('bot', 'רק רגע, טוען את רשימת הספרים… 🙏');
        return;
      }
      if (barbers.length === 0) {
        addMessage('bot', 'מצטערים, לא הצלחנו לטעון את רשימת הספרים כרגע 😕 אפשר לקבוע ישירות בוואטסאפ:', WHATSAPP_BUTTON);
        return;
      }
      setPendingField('barber');
      addMessage(
        'bot',
        'עם איזה ספר תרצה?',
        barbers.map((br) => ({ label: br.name, value: br.id }))
      );
      return;
    }

    if (!b.date) {
      setPendingField('date');
      addMessage('bot', 'לאיזה יום? (היום / מחר / או תאריך כמו 14.6)');
      return;
    }

    if (!b.time) {
      setBusy(true);
      const free = await fetchFreeSlots(b.date, b.barberId);
      setBusy(false);

      if (free === null) {
        setPendingField('time');
        addMessage('bot', 'הייתה תקלה בבדיקת השעות הפנויות 😕 אפשר לנסות שוב?', RETRY_TIME_BUTTON);
        return;
      }

      if (free.length === 0) {
        addMessage('bot', 'אין שעות פנויות בתאריך הזה 😕 איזה יום אחר מתאים?');
        setBooking({ ...b, date: null });
        setPendingField('date');
        return;
      }

      if (timeGuess && free.includes(timeGuess)) {
        const updated = { ...b, time: timeGuess };
        setBooking(updated);
        await advance(updated);
        return;
      }

      if (timeGuess && !free.includes(timeGuess)) {
        addMessage(
          'bot',
          `השעה ${timeGuess} תפוסה 😕 הנה השעות הפנויות:`,
          free.map((t) => ({ label: t, value: t }))
        );
        setPendingField('time');
        return;
      }

      setPendingField('time');
      addMessage(
        'bot',
        'איזו שעה מתאימה?',
        free.map((t) => ({ label: t, value: t }))
      );
      return;
    }

    if (!b.name) {
      setPendingField('name');
      addMessage('bot', 'מה השם שלך?');
      return;
    }

    if (!b.phone) {
      setPendingField('phone');
      addMessage('bot', 'ומה הטלפון? (לאישור התור)');
      return;
    }

    setPendingField('confirm');
    const svcName = SERVICE_LABELS[b.service] ?? b.service;
    const barberName = barbers.find((br) => br.id === b.barberId)?.name ?? '';
    addMessage(
      'bot',
      `אז לקבוע: ${svcName} אצל ${barberName}, ${formatDateHebrew(b.date)} בשעה ${b.time}, על שם ${b.name} (${b.phone})?`,
      CONFIRM_BUTTONS
    );
  }

  function resetBooking() {
    setBooking(EMPTY_BOOKING);
    setPendingField(null);
  }

  async function doBook(b: Booking) {
    setBusy(true);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: b.name,
          phone: b.phone,
          service: b.service,
          date: b.date,
          time: b.time,
          barber_id: b.barberId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      setBusy(false);

      if (!res.ok || json.error) {
        // Never surface the raw backend/DB error text to the customer.
        addMessage('bot', 'משהו השתבש בקביעת התור 😕 אפשר גם לקבוע ישירות בוואטסאפ:', WHATSAPP_BUTTON);
        return;
      }

      addMessage('bot', 'מעולה! התור נקבע ✅ נתראה!');
      resetBooking();
    } catch {
      setBusy(false);
      addMessage('bot', 'משהו השתבש בחיבור 😕 אפשר לקבוע ישירות בוואטסאפ:', WHATSAPP_BUTTON);
    }
  }

  async function doConfirm() {
    // Guards against a fast double-click/double-tap firing two concurrent
    // booking requests before React has re-rendered the disabled button.
    if (confirmLockRef.current) return;
    confirmLockRef.current = true;
    try {
      setBusy(true);
      const free = await fetchFreeSlots(booking.date!, booking.barberId);
      setBusy(false);

      if (free === null) {
        addMessage('bot', 'הייתה תקלה בבדיקת השעה לפני האישור 😕 אפשר לנסות שוב?', RETRY_CONFIRM_BUTTON);
        return;
      }

      if (!booking.time || !free.includes(booking.time)) {
        addMessage(
          'bot',
          'אופס, השעה הזו נתפסה הרגע 😕 הנה השעות הפנויות:',
          free.map((t) => ({ label: t, value: t }))
        );
        setBooking({ ...booking, time: null });
        setPendingField('time');
        return;
      }

      await doBook(booking);
    } finally {
      confirmLockRef.current = false;
    }
  }

  function doCancel() {
    addMessage('bot', 'בסדר, ביטלתי. אפשר להתחיל מחדש בכל רגע 🙂');
    resetBooking();
  }

  function handleQuickReply(button: QuickReply) {
    if (busy) return;
    addMessage('user', button.label);

    if (pendingField === 'confirm') {
      if (button.value === 'confirm' || button.value === 'retry-confirm') void doConfirm();
      else doCancel();
      return;
    }

    if (pendingField === 'service') {
      const updated = { ...booking, service: button.value };
      setBooking(updated);
      void advance(updated);
      return;
    }

    if (pendingField === 'barber') {
      const updated = { ...booking, barberId: button.value };
      setBooking(updated);
      void advance(updated);
      return;
    }

    if (pendingField === 'time') {
      if (button.value === 'retry-time') {
        void advance(booking);
        return;
      }
      const updated = { ...booking, time: button.value };
      setBooking(updated);
      void advance(updated);
      return;
    }
  }

  function handleSubmit() {
    const text = inputValue.trim();
    if (!text || busy) return;
    setInputValue('');
    addMessage('user', text);

    // FAQ is checked before the confirm-step gate so a customer who asks a
    // question right at "כן/בטל" (e.g. "כמה זה עולה?") gets answered instead
    // of just being told to pick yes or no again.
    const faqAnswer = matchFaq(text);
    if (faqAnswer) {
      addMessage('bot', faqAnswer);
      void advance(booking);
      return;
    }

    if (pendingField === 'confirm') {
      if (text.includes('כן')) void doConfirm();
      else if (text.includes('בטל') || text.includes('לא')) doCancel();
      else addMessage('bot', 'אפשר לבחור "כן, לקבוע" או "בטל" 🙂', CONFIRM_BUTTONS);
      return;
    }

    if (pendingField === 'name') {
      const updated = { ...booking, name: text };
      setBooking(updated);
      void advance(updated);
      return;
    }

    if (pendingField === 'phone') {
      const digits = text.replace(/\D/g, '');
      if (digits.length < 9) {
        addMessage('bot', 'זה לא נראה כמספר טלפון תקין — אפשר לכתוב שוב? 📱');
        return;
      }
      const updated = { ...booking, phone: digits };
      setBooking(updated);
      void advance(updated);
      return;
    }

    const updated = { ...booking };
    let timeGuess: string | null = null;

    if (!updated.service) {
      const s = parseService(text);
      if (s) updated.service = s;
    }
    if (!updated.barberId) {
      const matchedBarber = parseBarber(text, barbers);
      if (matchedBarber) updated.barberId = matchedBarber.id;
    }
    if (!updated.date) {
      const d = parseDate(text);
      if (d) updated.date = d;
    }
    if (!updated.time) {
      timeGuess = parseTime(text);
    }

    const changed = JSON.stringify(updated) !== JSON.stringify(booking);
    const alreadyInFlow = pendingField !== null || booking.service !== null || booking.barberId !== null || booking.date !== null;
    setBooking(updated);

    if (changed || timeGuess) {
      void advance(updated, timeGuess);
      return;
    }

    if (alreadyInFlow) {
      void advance(updated, timeGuess);
      return;
    }

    if (hasBookingIntent(text)) {
      void advance(updated);
      return;
    }

    addMessage('bot', 'לא הבנתי בדיוק 🙏 אפשר לקבוע תור — פשוט תכתבו "תספורת" או לחצו על הכפתור:', SERVICE_QUICK_REPLIES);
    setPendingField('service');
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'סגור צ׳אט' : 'פתח צ׳אט עם העוזר הדיגיטלי'}
        onClick={() => setOpen((v) => !v)}
        className="bbot-fab"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.02 2 11c0 2.83 1.5 5.36 3.86 7.06L5 22l4.36-1.74A11.4 11.4 0 0012 20.5c5.52 0 10-4.02 10-9S17.52 2 12 2z" />
          </svg>
        )}
      </button>

      <div className={`bbot-panel ${open ? 'is-open' : ''}`} dir="rtl">
        <div className="bbot-header">
          <div className="bbot-header-avatar">💈</div>
          <div>
            <p className="bbot-header-title">העוזר של ברבר פרמיום</p>
            <p className="bbot-header-sub">בדרך כלל עונה תוך כמה שניות</p>
          </div>
        </div>

        <div className="bbot-messages" ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={`bbot-row bbot-row-${m.from}`}>
              <div className={`bbot-bubble bbot-bubble-${m.from}`}>{m.text}</div>
              {m.buttons && m.buttons.length > 0 && (
                <div className="bbot-quick-replies">
                  {m.buttons.map((btn) =>
                    btn.value.startsWith('http') ? (
                      <a
                        key={btn.value}
                        href={btn.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bbot-chip"
                        onClick={() => addMessage('user', btn.label)}
                      >
                        {btn.label}
                      </a>
                    ) : (
                      <button
                        key={`${btn.value}-${btn.label}`}
                        type="button"
                        className="bbot-chip"
                        disabled={busy}
                        onClick={() => handleQuickReply(btn)}
                      >
                        {btn.label}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="bbot-row bbot-row-bot">
              <div className="bbot-bubble bbot-bubble-bot bbot-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <div className="bbot-input-row">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="כתוב הודעה…"
            className="bbot-input"
            disabled={busy}
          />
          <button
            type="button"
            className="bbot-send"
            onClick={handleSubmit}
            disabled={busy || !inputValue.trim()}
            aria-label="שלח"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .bbot-fab {
          position: fixed;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          right: 24px;
          z-index: 201;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE});
          box-shadow: 0 4px 24px rgba(178,102,255,0.45);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .bbot-fab:hover { transform: scale(1.08); box-shadow: 0 6px 30px rgba(178,102,255,0.55); }

        .bbot-panel {
          position: fixed;
          bottom: calc(92px + env(safe-area-inset-bottom, 0px));
          right: 24px;
          z-index: 200;
          width: min(380px, calc(100vw - 32px));
          height: min(560px, calc(100vh - 160px));
          background: #fff;
          border: 1px solid rgba(157,78,221,0.16);
          border-radius: 20px;
          box-shadow: 0 24px 60px rgba(60,9,108,0.28), 0 4px 16px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform-origin: bottom right;
          transform: scale(0.85) translateY(16px);
          opacity: 0;
          pointer-events: none;
          transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease;
        }
        .bbot-panel.is-open {
          transform: scale(1) translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .bbot-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.1rem 1.25rem;
          background: linear-gradient(135deg, ${PURPLE_DEEP}, ${PURPLE_DARK} 55%, ${PURPLE});
          color: #fff;
          flex-shrink: 0;
        }
        .bbot-header-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; flex-shrink: 0;
        }
        .bbot-header-title { font-family: var(--font-display); font-size: 0.95rem; font-weight: 600; }
        .bbot-header-sub { font-family: var(--font-body); font-size: 0.7rem; opacity: 0.85; margin-top: 0.15rem; }

        .bbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          background: #FAF8FE;
          font-family: var(--font-body);
        }

        .bbot-row { display: flex; flex-direction: column; gap: 0.5rem; max-width: 86%; }
        .bbot-row-bot { align-self: flex-start; align-items: flex-start; }
        .bbot-row-user { align-self: flex-end; align-items: flex-end; }

        .bbot-bubble {
          padding: 0.65rem 0.9rem;
          border-radius: 14px;
          font-size: 0.85rem;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .bbot-bubble-bot { background: #F1E9FB; color: #281A38; border-bottom-left-radius: 4px; }
        .bbot-bubble-user {
          background: linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE});
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .bbot-quick-replies { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .bbot-chip {
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          border: 1.5px solid ${PURPLE};
          background: #fff;
          color: ${PURPLE_DEEP};
          font-family: var(--font-body);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .bbot-chip:hover:not(:disabled) { background: ${PURPLE}; color: #fff; }
        .bbot-chip:disabled { opacity: 0.45; cursor: not-allowed; }

        .bbot-typing { display: flex; align-items: center; gap: 4px; padding: 0.8rem 0.9rem; }
        .bbot-typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background: ${PURPLE_DARK}; opacity: 0.6;
          animation: bbot-bounce 1.1s ease-in-out infinite;
        }
        .bbot-typing span:nth-child(2) { animation-delay: 0.15s; }
        .bbot-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bbot-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

        .bbot-input-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-top: 1px solid rgba(157,78,221,0.14);
          background: #fff;
          flex-shrink: 0;
        }
        .bbot-input {
          flex: 1;
          border: 1.5px solid rgba(17,17,17,0.12);
          border-radius: 999px;
          padding: 0.6rem 1rem;
          font-family: var(--font-body);
          font-size: 0.85rem;
          direction: rtl;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .bbot-input:focus { border-color: ${PURPLE}; }
        .bbot-input:disabled { background: #F4F1FA; }

        .bbot-send {
          width: 38px; height: 38px; border-radius: 50%; border: none;
          background: linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE});
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
          transform: scaleX(-1);
        }
        .bbot-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .bbot-send:not(:disabled):hover { transform: scaleX(-1) scale(1.07); }

        @media (max-width: 420px) {
          .bbot-fab { right: 16px; }
          .bbot-panel { right: 16px; width: calc(100vw - 24px); }
        }
      `}</style>
    </>
  );
}
