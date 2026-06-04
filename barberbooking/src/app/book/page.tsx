'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SERVICES, TIME_SLOTS } from '@/lib/services';
import { ChevronRight, Check } from 'lucide-react';

type Step = 'service' | 'date' | 'time' | 'details' | 'confirm';

const STEPS: Step[] = ['service', 'date', 'time', 'details', 'confirm'];
const STEP_LABELS: Record<Step, string> = {
  service: 'שירות',
  date: 'תאריך',
  time: 'שעה',
  details: 'פרטים',
  confirm: 'אישור',
};

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
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
    const { data: appts } = await supabase
      .from('appointments')
      .select('time')
      .eq('date', selectedDate)
      .neq('status', 'rejected');

    const { data: blocked } = await supabase
      .from('blocked_slots')
      .select('time')
      .eq('date', selectedDate);

    const taken = [
      ...(appts?.map((a) => a.time) ?? []),
      ...(blocked?.map((b) => b.time) ?? []),
    ];
    setTakenSlots(taken);
    setLoadingSlots(false);
  }

  function goToDate() {
    setStep('date');
  }

  function goToTime() {
    loadSlots(date);
    setStep('time');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('appointments').insert({
      name,
      phone,
      service,
      date,
      time,
      status: 'pending',
    });
    setSubmitting(false);
    if (err) {
      setError('שגיאה בשמירת התור. נסה שוב.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div
            className="mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ width: 80, height: 80, background: '#1a2a1a', border: '2px solid #4caf50' }}
          >
            <Check size={40} color="#4caf50" />
          </div>
          <h2 className="text-2xl font-bold mb-2">התור נקבע!</h2>
          <p className="text-gray-400 mb-4">
            הבקשה שלך נשלחה. הספר יאשר את התור בהקדם.
          </p>
          <div className="card mb-6 text-right">
            <p className="text-sm text-gray-400 mb-1">פרטי התור:</p>
            <p className="font-bold gold">{SERVICES.find((s) => s.id === service)?.name}</p>
            <p>{formatDate(date)} | {time}</p>
            <p>{name} · {phone}</p>
            <p className="mt-2 text-xs text-yellow-500">סטטוס: ממתין לאישור</p>
          </div>
          <button className="btn-gold w-full" onClick={() => router.push('/')}>
            חזרה לדף הבית
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (stepIndex === 0) router.push('/');
            else setStep(STEPS[stepIndex - 1]);
          }}
          className="text-gray-400 hover:text-white"
        >
          <ChevronRight size={24} />
        </button>
        <h1 className="text-xl font-bold">קביעת תור</h1>
      </div>

      {/* Step dots */}
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}
          />
        ))}
      </div>

      <p className="text-center text-gray-400 text-sm mb-6">
        שלב {stepIndex + 1} מתוך {STEPS.length} — {STEP_LABELS[step]}
      </p>

      {/* Step: Service */}
      {step === 'service' && (
        <div>
          <h2 className="text-xl font-bold mb-4">בחר שירות</h2>
          <div className="flex flex-col gap-3">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                className={`card text-right w-full ${service === s.id ? 'card-selected' : ''}`}
                onClick={() => setService(s.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{s.name}</p>
                    <p className="text-gray-400 text-sm">{s.duration} דקות</p>
                  </div>
                  <span className="gold font-bold text-lg">{s.price}</span>
                </div>
              </button>
            ))}
          </div>
          <button
            className="btn-gold w-full mt-6"
            disabled={!service}
            onClick={goToDate}
          >
            המשך
          </button>
        </div>
      )}

      {/* Step: Date */}
      {step === 'date' && (
        <div>
          <h2 className="text-xl font-bold mb-4">בחר תאריך</h2>
          <input
            type="date"
            min={getMinDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-4 rounded-xl text-center text-lg"
            style={{ background: '#111', border: '1px solid var(--dark-border)', color: '#f0f0f0' }}
          />
          <button
            className="btn-gold w-full mt-6"
            disabled={!date}
            onClick={goToTime}
          >
            המשך
          </button>
        </div>
      )}

      {/* Step: Time */}
      {step === 'time' && (
        <div>
          <h2 className="text-xl font-bold mb-4">בחר שעה</h2>
          <p className="text-gray-400 text-sm mb-4">{formatDate(date)}</p>
          {loadingSlots ? (
            <p className="text-center text-gray-400 py-8">טוען שעות...</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {TIME_SLOTS.map((slot) => {
                const taken = takenSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    disabled={taken}
                    onClick={() => setTime(slot)}
                    className={`py-3 rounded-lg font-medium transition-all ${
                      taken
                        ? 'text-gray-600 cursor-not-allowed'
                        : time === slot
                        ? 'text-black font-bold'
                        : 'text-gray-200 hover:border-yellow-500'
                    }`}
                    style={{
                      background: taken ? '#111' : time === slot ? 'var(--gold)' : '#1a1a1a',
                      border: taken
                        ? '1px solid #222'
                        : time === slot
                        ? '1px solid var(--gold)'
                        : '1px solid var(--dark-border)',
                      textDecoration: taken ? 'line-through' : 'none',
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
          <button
            className="btn-gold w-full mt-6"
            disabled={!time}
            onClick={() => setStep('details')}
          >
            המשך
          </button>
        </div>
      )}

      {/* Step: Details */}
      {step === 'details' && (
        <div>
          <h2 className="text-xl font-bold mb-4">הפרטים שלך</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">שם מלא</label>
              <input
                type="text"
                placeholder="ישראל ישראלי"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">מספר טלפון</label>
              <input
                type="tel"
                placeholder="050-0000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <button
            className="btn-gold w-full mt-6"
            disabled={!name.trim() || !phone.trim()}
            onClick={() => setStep('confirm')}
          >
            המשך
          </button>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div>
          <h2 className="text-xl font-bold mb-4">אישור התור</h2>
          <div className="card mb-6">
            <div className="flex flex-col gap-3">
              <Row label="שירות" value={SERVICES.find((s) => s.id === service)?.name ?? ''} />
              <Row label="תאריך" value={formatDate(date)} />
              <Row label="שעה" value={time} />
              <Row label="שם" value={name} />
              <Row label="טלפון" value={phone} />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
          <button
            className="btn-gold w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'שולח...' : 'אשר וקבע תור'}
          </button>
          <p className="text-center text-gray-500 text-xs mt-3">
            לאחר הקביעה, הספר יאשר את התור ותקבל אישור
          </p>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--dark-border)' }}>
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
