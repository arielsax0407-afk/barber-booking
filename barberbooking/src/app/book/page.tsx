'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  const [error, setError] = useState('');

  const stepIndex = STEPS.indexOf(step);

  async function loadSlots(selectedDate: string) {
    setLoadingSlots(true);
    const [{ data: appts }, { data: blocked }] = await Promise.all([
      supabase.from('appointments').select('time').eq('date', selectedDate).neq('status', 'rejected'),
      supabase.from('blocked_slots').select('time').eq('date', selectedDate),
    ]);
    setTakenSlots([...(appts?.map((a) => a.time) ?? []), ...(blocked?.map((b) => b.time) ?? [])]);
    setLoadingSlots(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('appointments').insert({ name, phone, service, date, time, status: 'pending' });
    setSubmitting(false);
    if (err) { setError('שגיאה בשמירת התור. אנא נסה שוב.'); return; }
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
            background: 'radial-gradient(circle, rgba(34,197,94,0.15), transparent)',
            border: '1px solid rgba(34,197,94,0.3)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.75rem' }}>הצלחה</p>
          <h2 className="serif" style={{ fontSize: '2.25rem', fontWeight: 300, marginBottom: '0.75rem' }}>התור נקבע!</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.9rem' }}>
            הבקשה שלך התקבלה. הספר יאשר אותה בהקדם וישלח אישור.
          </p>

          <div className="glass-card p-6 text-right mb-6" style={{ gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
            {[
              ['שירות', svcObj?.name ?? ''],
              ['תאריך', formatDate(date)],
              ['שעה', time],
              ['שם', name],
              ['טלפון', phone],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-center" style={{ fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div className="divider" style={{ margin: '0.25rem 0' }} />
            <div className="flex justify-between items-center">
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>סטטוס</span>
              <span className="badge badge-pending">ממתין לאישור</span>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={() => router.push('/')} style={{ width: '100%' }}>
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen px-4 py-10">
      <div className="max-w-md mx-auto">

        {/* Back + title */}
        <div className="flex items-center gap-4 mb-10 animate-fade-in">
          <button
            className="btn-ghost"
            onClick={() => { if (stepIndex === 0) router.push('/'); else setStep(STEPS[stepIndex - 1]); }}
            style={{ padding: '0.5rem', borderRadius: '50%', width: 40, height: 40 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.125rem' }}>
              קביעת תור
            </p>
            <h1 className="serif" style={{ fontSize: '1.5rem', fontWeight: 400 }}>{STEP_LABELS[step]}</h1>
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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                בחר את השירות הרצוי
              </p>
              <div className="flex flex-col gap-3">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setService(s.id)}
                    className={`glass-card ${service === s.id ? 'card-selected' : ''}`}
                    style={{ padding: '1.25rem 1.5rem', textAlign: 'right', width: '100%', cursor: 'pointer', background: 'none', border: '1px solid var(--glass-border)' }}
                  >
                    <div className="flex justify-between items-center">
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: '0.25rem' }}>{s.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{s.duration} דקות</p>
                      </div>
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span className="serif gold" style={{ fontSize: '1.375rem', fontWeight: 500 }}>{s.price}</span>
                        {service === s.id && (
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button className="btn-primary mt-8" disabled={!service} onClick={() => setStep('date')} style={{ width: '100%' }}>
                המשך
              </button>
            </div>
          )}

          {/* Date */}
          {step === 'date' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                בחר תאריך לתור
              </p>
              <div className="glass-card" style={{ padding: '0.5rem' }}>
                <input
                  type="date"
                  min={getMinDate()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '1.125rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: '1.25rem' }}
                />
              </div>
              {date && (
                <div className="glass-card-gold mt-4" style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                  <p className="serif" style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>{formatDate(date)}</p>
                </div>
              )}
              <button className="btn-primary mt-8" disabled={!date} onClick={() => { loadSlots(date); setStep('time'); }} style={{ width: '100%' }}>
                המשך
              </button>
            </div>
          )}

          {/* Time */}
          {step === 'time' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {formatDate(date)} — בחר שעה פנויה
              </p>
              {loadingSlots ? (
                <div className="text-center py-16">
                  <div style={{ width: 32, height: 32, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin-slow 0.8s linear infinite' }} />
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
                          fontWeight: selected ? 600 : 400,
                          cursor: taken ? 'not-allowed' : 'pointer',
                          transition: 'var(--transition)',
                          background: selected
                            ? 'linear-gradient(135deg, var(--gold-dim), var(--gold-light))'
                            : taken ? 'rgba(255,255,255,0.02)' : 'var(--glass)',
                          border: selected
                            ? '1px solid var(--gold)'
                            : taken ? '1px solid rgba(255,255,255,0.04)' : '1px solid var(--glass-border)',
                          color: selected ? '#080808' : taken ? 'var(--text-dim)' : 'var(--text)',
                          textDecoration: taken ? 'line-through' : 'none',
                          boxShadow: selected ? '0 0 20px rgba(201,168,76,0.3)' : 'none',
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
              <button className="btn-primary mt-8" disabled={!time} onClick={() => setStep('details')} style={{ width: '100%' }}>
                המשך
              </button>
            </div>
          )}

          {/* Details */}
          {step === 'details' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
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
              <button
                className="btn-primary mt-8"
                disabled={!name.trim() || !phone.trim()}
                onClick={() => setStep('confirm')}
                style={{ width: '100%' }}
              >
                המשך
              </button>
            </div>
          )}

          {/* Confirm */}
          {step === 'confirm' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                אמת את פרטי התור לפני הקביעה
              </p>
              <div className="glass-card p-6 mb-6">
                {[
                  ['שירות', SERVICES.find((s) => s.id === service)?.name ?? ''],
                  ['תאריך', formatDate(date)],
                  ['שעה', time],
                  ['שם', name],
                  ['טלפון', phone],
                ].map(([l, v], i) => (
                  <div key={l}>
                    {i > 0 && <div className="divider" style={{ margin: '0.75rem 0' }} />}
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{l}</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{v}</span>
                    </div>
                  </div>
                ))}
                <div className="divider" style={{ margin: '0.75rem 0' }} />
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>מחיר</span>
                  <span className="serif gold" style={{ fontSize: '1.125rem' }}>{SERVICES.find((s) => s.id === service)?.price}</span>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ width: '100%' }}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span style={{ width: 14, height: 14, border: '2px solid #080808', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin-slow 0.7s linear infinite' }} />
                    שולח...
                  </span>
                ) : 'אשר וקבע תור'}
              </button>
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '1rem', letterSpacing: '0.05em' }}>
                לאחר הקביעה, הספר יאשר את התור
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin-slow { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
