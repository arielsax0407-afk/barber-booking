'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICES, TIME_SLOTS } from '@/lib/services';

type Step = 'service' | 'date' | 'time' | 'details' | 'confirm';
const STEPS: Step[] = ['service', 'date', 'time', 'details', 'confirm'];
const STEP_LABELS: Record<Step, string> = {
  service: 'שירות', date: 'תאריך', time: 'שעה', details: 'פרטים', confirm: 'אישור',
};

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

function getMinDate() {
  return new Date().toISOString().split('T')[0];
}

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [appointmentId, setAppointmentId] = useState('');
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  const stepIndex = STEPS.indexOf(step);

  function goBack() {
    if (stepIndex === 0) router.push('/');
    else setStep(STEPS[stepIndex - 1]);
  }

  async function loadSlots(selectedDate: string): Promise<string[]> {
    setLoadingSlots(true);
    const res = await fetch(`/api/availability?date=${selectedDate}`);
    const json = await res.json();
    const taken = (json.takenSlots ?? []) as string[];
    setTakenSlots(taken);
    setLoadingSlots(false);
    return taken;
  }

  async function handleDateContinue() {
    setDateError('');
    const taken = await loadSlots(date);
    if (TIME_SLOTS.every((t) => taken.includes(t))) {
      setDateError('אין תורים פנויים בתאריך זה. נסה תאריך אחר.');
      return;
    }
    setStep('time');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, service, date, time }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok || !json.id) { setError('שגיאה בשמירת התור. אנא נסה שוב.'); return; }
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, service, date, time }),
    });
    setAppointmentId(json.id);
    setDone(true);
  }

  /* ── Success screen ──────────────────────────────────── */
  if (done) {
    const svcObj = SERVICES.find((s) => s.id === service);
    return (
      <div className="page-bg min-h-screen flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-sm w-full animate-fade-up">
          {/* Check circle */}
          <div className="mx-auto mb-8 flex items-center justify-center animate-pulse-gold" style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.14), transparent)',
            border: '1.5px solid rgba(16,185,129,0.32)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p style={{ fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '0.75rem', fontWeight: 600 }}>הצלחה</p>
          <h2 className="serif" style={{ fontSize: '2.25rem', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--text)' }}>התור נקבע!</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.9rem' }}>
            התור שלך אושר ונקבע בהצלחה. מחכים לך!
          </p>

          <div className="glass-card p-6 text-right mb-6" style={{ gap: '0.75rem', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            {[
              ['שירות', svcObj?.name ?? ''],
              ['תאריך', formatDate(date)],
              ['שעה', time],
              ['שם', name],
              ['טלפון', phone],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-start" style={{ fontSize: '0.875rem', gap: '0.75rem' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, flexShrink: 0, paddingTop: 2 }}>{l}</span>
                <span style={{ fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word', textAlign: 'left', minWidth: 0 }}>{v}</span>
              </div>
            ))}
            <div className="divider" style={{ margin: '0.25rem 0' }} />
            <div className="flex justify-between items-center">
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>סטטוס</span>
              <span className="badge badge-approved">מאושר</span>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={() => router.push(`/my-appointments?phone=${encodeURIComponent(phone)}`)} style={{ width: '100%', marginBottom: '0.75rem' }}>
            התורים שלי
          </button>
          <button className="btn-ghost w-full" onClick={() => router.push('/')} style={{ width: '100%' }}>
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen px-4 py-10">
      <div className="max-w-md mx-auto" style={{ minWidth: 0 }}>

        {/* Back + title */}
        <div className="flex items-center gap-4 mb-10 animate-fade-in">
          <button
            className="btn-ghost"
            onClick={() => { if (stepIndex === 0) router.push('/'); else setStep(STEPS[stepIndex - 1]); }}
            style={{ padding: '0.5rem', borderRadius: '50%', width: 40, height: 40, flexShrink: 0, background: 'rgba(28,25,23,0.06)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '0.125rem', fontWeight: 700 }}>
              קביעת תור
            </p>
            <h1 className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{STEP_LABELS[step]}</h1>
          </div>
        </div>

        {/* Step tracker */}
        <div className="step-track animate-fade-in">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`step-node ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : 'inactive'}`}>
                {i < stepIndex
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : <span style={{ fontSize: '0.65rem' }}>{i + 1}</span>
                }
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < stepIndex ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* ── Step content ──────────────────────────── */}
        <div className="animate-fade-up">

          {/* Service */}
          {step === 'service' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                בחר את השירות הרצוי
              </p>
              <div className="flex flex-col gap-3">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setService(s.id)}
                    className={`glass-card ${service === s.id ? 'card-selected' : ''}`}
                    style={{ padding: '1.25rem 1.5rem', textAlign: 'right', width: '100%', cursor: 'pointer', background: service === s.id ? undefined : '#fff', border: '1px solid var(--glass-border)' }}
                  >
                    <div className="flex justify-between items-center" style={{ gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{s.duration} דקות</p>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span className="serif" style={{ color: 'var(--amber)', fontSize: '1.375rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.price}</span>
                        {service === s.id && (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <button className="btn-ghost" onClick={goBack} style={{ flex: 1 }}>חזור</button>
                <button className="btn-primary" disabled={!service} onClick={() => setStep('date')} style={{ flex: 2 }}>
                  המשך
                </button>
              </div>
            </div>
          )}

          {/* Date */}
          {step === 'date' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                בחר תאריך לתור
              </p>
              <div className="glass-card" style={{ padding: '0.5rem', background: '#fff' }}>
                <input
                  type="date"
                  min={getMinDate()}
                  value={date}
                  onChange={(e) => { setDate(e.target.value); setDateError(''); }}
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '1.125rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: '1.25rem' }}
                />
              </div>
              {date && (
                <div className="glass-card-amber mt-4" style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                  <p className="serif" style={{ fontSize: '1.1rem', color: 'var(--amber)', fontWeight: 500 }}>{formatDate(date)}</p>
                </div>
              )}
              {dateError && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginTop: '1rem', color: '#991B1B', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500 }}>
                  {dateError}
                </div>
              )}
              <div className="flex gap-3 mt-8">
                <button className="btn-ghost" onClick={goBack} style={{ flex: 1 }}>חזור</button>
                <button className="btn-primary" disabled={!date || loadingSlots} onClick={handleDateContinue} style={{ flex: 2 }}>
                  {loadingSlots ? (
                    <span className="flex items-center justify-center gap-2">
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.6)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin-slow 0.7s linear infinite' }} />
                      בודק זמינות...
                    </span>
                  ) : 'המשך'}
                </button>
              </div>
            </div>
          )}

          {/* Time */}
          {step === 'time' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {formatDate(date)} — בחר שעה פנויה
              </p>
              {loadingSlots ? (
                <div className="text-center py-16">
                  <div style={{ width: 32, height: 32, border: '2.5px solid var(--amber)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin-slow 0.8s linear infinite' }} />
                  <p style={{ color: 'var(--text-dim)', marginTop: '1rem', fontSize: '0.875rem' }}>טוען שעות פנויות...</p>
                </div>
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {TIME_SLOTS.map((slot) => {
                    const taken = takenSlots.includes(slot);
                    const selected = time === slot;
                    return (
                      <button
                        key={slot}
                        disabled={taken}
                        onClick={() => setTime(slot)}
                        style={{
                          padding: '0.75rem 0.5rem',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.875rem',
                          fontWeight: selected ? 700 : 500,
                          cursor: taken ? 'not-allowed' : 'pointer',
                          transition: 'var(--transition)',
                          background: selected
                            ? 'linear-gradient(135deg, var(--amber-dark), var(--amber-light))'
                            : taken ? 'rgba(28,25,23,0.03)' : '#fff',
                          border: selected
                            ? '1.5px solid var(--amber)'
                            : taken ? '1px solid rgba(28,25,23,0.06)' : '1px solid var(--glass-border)',
                          color: selected ? '#fff' : taken ? 'var(--text-dim)' : 'var(--text)',
                          textDecoration: taken ? 'line-through' : 'none',
                          boxShadow: selected ? 'var(--shadow-amber)' : taken ? 'none' : 'var(--shadow-card)',
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-3 mt-8">
                <button className="btn-ghost" onClick={goBack} style={{ flex: 1 }}>חזור</button>
                <button className="btn-primary" disabled={!time} onClick={() => setStep('details')} style={{ flex: 2 }}>
                  המשך
                </button>
              </div>
            </div>
          )}

          {/* Details */}
          {step === 'details' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                הזן את פרטיך לאישור התור
              </p>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="input-label">שם מלא</label>
                  <input type="text" className="input-field" placeholder="ישראל ישראלי" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">מספר טלפון</label>
                  <input type="tel" className="input-field" placeholder="050-0000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button className="btn-ghost" onClick={goBack} style={{ flex: 1 }}>חזור</button>
                <button
                  className="btn-primary"
                  disabled={!name.trim() || !phone.trim()}
                  onClick={() => setStep('confirm')}
                  style={{ flex: 2 }}
                >
                  המשך
                </button>
              </div>
            </div>
          )}

          {/* Confirm */}
          {step === 'confirm' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                אמת את פרטי התור לפני הקביעה
              </p>
              <div className="glass-card p-6 mb-6" style={{ background: '#fff' }}>
                {[
                  ['שירות', SERVICES.find((s) => s.id === service)?.name ?? ''],
                  ['תאריך', formatDate(date)],
                  ['שעה', time],
                  ['שם', name],
                  ['טלפון', phone],
                ].map(([l, v], i) => (
                  <div key={l}>
                    {i > 0 && <div className="divider" style={{ margin: '0.75rem 0' }} />}
                    <div className="flex justify-between items-start" style={{ gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>{l}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)', wordBreak: 'break-word', textAlign: 'left', minWidth: 0 }}>{v}</span>
                    </div>
                  </div>
                ))}
                <div className="divider" style={{ margin: '0.75rem 0' }} />
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>מחיר</span>
                  <span className="serif" style={{ color: 'var(--amber)', fontSize: '1.125rem', fontWeight: 600 }}>{SERVICES.find((s) => s.id === service)?.price}</span>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.875rem', textAlign: 'center', fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button className="btn-ghost" onClick={goBack} disabled={submitting} style={{ flex: 1 }}>חזור</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 2 }}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.6)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin-slow 0.7s linear infinite' }} />
                      שולח...
                    </span>
                  ) : 'אשר וקבע תור'}
                </button>
              </div>
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '1rem', letterSpacing: '0.05em' }}>
                התור יאושר אוטומטית מיד לאחר הקביעה
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin-slow { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
