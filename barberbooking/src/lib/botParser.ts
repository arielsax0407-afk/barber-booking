import { TIME_SLOTS } from './services';

// ── Service ─────────────────────────────────────────────────

export function parseService(text: string): string | null {
  const hasHaircutWord = text.includes('תספורת');
  const hasBeardWord = text.includes('זקן');

  if (hasHaircutWord && hasBeardWord) return 'haircut-beard';
  if (text.includes('ילד')) return 'kids'; // covers ילד / ילדים
  if (/fade/i.test(text) || text.includes('פייד')) return 'fade';
  if (hasBeardWord) return 'beard';
  if (hasHaircutWord || text.includes('גבר')) return 'haircut';
  return null;
}

// ── Barber ──────────────────────────────────────────────────

export function parseBarber<T extends { name: string }>(text: string, barbers: T[]): T | null {
  for (const barber of barbers) {
    if (barber.name && text.includes(barber.name)) return barber;
  }
  return null;
}

// ── Date ────────────────────────────────────────────────────

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const JERUSALEM_TZ = 'Asia/Jerusalem';

function jerusalemTodayParts() {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: JERUSALEM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone: JERUSALEM_TZ, weekday: 'short' }).format(now);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { todayStr, weekday: weekdayMap[weekdayShort] ?? 0 };
}

function shiftDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d, 12, 0, 0) + days * 86400000);
  const yy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function parseDate(text: string): string | null {
  const { todayStr, weekday } = jerusalemTodayParts();

  // Check 'מחרתיים' before 'מחר' — the latter is a substring of the former.
  if (text.includes('מחרתיים')) return shiftDateStr(todayStr, 2);
  if (text.includes('מחר')) return shiftDateStr(todayStr, 1);
  if (text.includes('היום')) return todayStr;

  // Day names — the shop is closed שבת, so it's intentionally excluded here.
  for (let i = 0; i < HEBREW_WEEKDAYS.length - 1; i++) {
    if (text.includes(HEBREW_WEEKDAYS[i])) {
      const offset = (i - weekday + 7) % 7;
      return shiftDateStr(todayStr, offset);
    }
  }

  // Explicit numeric date — Israeli DD.MM[.YYYY] / DD/MM[/YYYY].
  const match = text.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const currentYear = parseInt(todayStr.slice(0, 4), 10);
    let year = match[3] ? parseInt(match[3], 10) : currentYear;
    if (match[3] && year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!match[3] && candidate < todayStr) {
        candidate = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return candidate;
    }
  }

  return null;
}

// ── Time ────────────────────────────────────────────────────

// Compound forms (11, 12) must be checked before their single-word parts ('עשר', 'אחת', 'שתיים').
const HEBREW_NUMBER_WORDS: Record<string, number> = {
  'שתים עשרה': 12,
  'שתיים עשרה': 12,
  'אחת עשרה': 11,
  'עשר': 10,
  'תשע': 9,
  'שמונה': 8,
  'שבע': 7,
  'שש': 6,
  'חמש': 5,
  'ארבע': 4,
  'שלוש': 3,
  'שתיים': 2,
  'שתים': 2,
  'אחת': 1,
};

function slotToMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}

const MIN_SLOT_MIN = slotToMinutes(TIME_SLOTS[0]);
const MAX_SLOT_MIN = slotToMinutes(TIME_SLOTS[TIME_SLOTS.length - 1]);

function roundToSlot(totalMinutes: number): string {
  let rounded = Math.round(totalMinutes / 30) * 30;
  rounded = Math.max(MIN_SLOT_MIN, Math.min(MAX_SLOT_MIN, rounded));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTime(text: string): string | null {
  const explicit = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (explicit) {
    const h = parseInt(explicit[1], 10);
    const m = parseInt(explicit[2], 10);
    return roundToSlot(h * 60 + m);
  }

  let hour: number | null = null;

  for (const word of Object.keys(HEBREW_NUMBER_WORDS)) {
    if (text.includes(word)) {
      hour = HEBREW_NUMBER_WORDS[word];
      break;
    }
  }

  if (hour === null) {
    const digitMatch = text.match(/\b([1-9]|1[0-2])\b/);
    if (digitMatch) hour = parseInt(digitMatch[1], 10);
  }

  if (hour === null) return null;

  // Bare 1–8 would fall before opening (9:00) — treat as PM, matching how
  // people actually talk about evening appointments ('שבע' → 19:00).
  if (hour >= 1 && hour <= 8) hour += 12;

  const minute = text.includes('וחצי') ? 30 : 0;

  return roundToSlot(hour * 60 + minute);
}
