-- ── Prevent double-booking the same barber+date+time ──────────────
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

-- ── Step 1: resolve the one existing duplicate before adding the constraint ──
-- Two rows currently share barber_id b35ff921-8114-4536-ad92-a562c889ceeb,
-- date 2026-06-17, time 09:30 (leftover dev test data). Cancel the 'approved'
-- one and keep the 'completed' one, so the unique index below can be created
-- (Postgres refuses to add a unique index over data that already violates it).
update appointments
set status = 'cancelled'
where id = 'a10874eb-d263-4bf7-992a-f07d88684bf8';

-- ── Step 2: add the partial unique index ───────────────────────────
-- Cancelled/rejected appointments don't count (a freed slot should be
-- bookable again), and rows with no barber_id aren't covered — every real
-- booking flow (web form, chat bot) requires picking a barber before
-- submitting, so barber_id is never actually null in practice today.
create unique index if not exists appointments_active_slot_unique
  on appointments (barber_id, date, time)
  where status not in ('cancelled', 'rejected') and barber_id is not null;
