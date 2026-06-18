export const SERVICES = [
  { id: 'haircut', name: 'תספורת', duration: 30, price: '60₪' },
  { id: 'beard', name: 'עיצוב זקן', duration: 20, price: '40₪' },
  { id: 'haircut-beard', name: 'תספורת + זקן', duration: 50, price: '90₪' },
  { id: 'kids', name: 'תספורת ילדים', duration: 20, price: '40₪' },
  { id: 'fade', name: 'פייד', duration: 40, price: '70₪' },
];

export const PRICE_MAP: Record<string, number> = {
  haircut: 60, beard: 40, 'haircut-beard': 90, kids: 40, fade: 70,
};

// ── Loyalty club ────────────────────────────────────────────
// Every Nth completed visit earns a free haircut. No redemption
// table needed: progress is derived from completed-appointment
// count via modulo, so it naturally resets once the customer's
// next visit pushes the count past the reward threshold.
export const LOYALTY_THRESHOLD = 6;
export const LOYALTY_REWARD_LABEL = 'תספורת חינם';

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30',
];
