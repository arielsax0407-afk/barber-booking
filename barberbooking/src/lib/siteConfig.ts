// ── Site-wide business info — single source of truth ───────────
// Update these to change the shop's branding/contact info everywhere at once.

export const SHOP_NAME = 'S.R BARBER SHOP';

// The homepage hero headline splits the name across two separately-styled
// lines (bold/gold + italic/cream) — kept as their own exports since that
// split is a presentational choice, not something to derive from SHOP_NAME.
export const SHOP_NAME_HERO_LINE1 = 'S.R';
export const SHOP_NAME_HERO_LINE2 = 'BARBER SHOP';

// Business WhatsApp contact — digits-only international format (no +, no
// dashes, no leading 0), which is what wa.me links need directly. Twilio's
// ADMIN_WHATSAPP_NUMBER env var needs this same number with a `whatsapp:+`
// prefix instead, set separately per environment.
export const BUSINESS_WHATSAPP_INTL = '972535907078';

export const BUSINESS_ADDRESS = 'הרצל 49, רחובות';
export const BUSINESS_CITY = 'רחובות';
