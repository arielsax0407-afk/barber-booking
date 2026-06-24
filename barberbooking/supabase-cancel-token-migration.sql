-- Secure customer self-cancellation — run this in the Supabase SQL Editor.
--
-- A customer can only cancel their own appointment via a long random token
-- (never a phone number or appointment id) — knowing someone's phone is not
-- enough to cancel their appointment.

-- ── Step 1: add the token column ────────────────────────────────────
alter table appointments add column if not exists cancel_token text;

-- ── Step 2: unique index for fast, collision-safe token lookups ─────
-- Partial (where cancel_token is not null) so old rows without a token
-- (see note below) don't all collide on null — Postgres treats every
-- null as distinct under a unique index anyway, but the partial form
-- keeps the index smaller since most historical rows will have no token.
create unique index if not exists appointments_cancel_token_idx
  on appointments (cancel_token)
  where cancel_token is not null;

-- ── Step 3: backfill — intentionally skipped ────────────────────────
-- Existing appointments simply won't have a self-cancel link; that's
-- fine — they were booked before this feature existed, so no customer
-- currently has (or expects) a cancel link for them. Customers can still
-- call/WhatsApp the shop for those, same as before this feature. Every
-- appointment booked from here on gets a token at insert time (STEP 2 of
-- the app-code changes), so the gap only ever covers pre-existing rows.
