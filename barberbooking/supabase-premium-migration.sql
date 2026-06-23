-- Premium appointments migration — run this in the Supabase SQL Editor.
--
-- Premium slots are NOT a new table — they're appointments rows with
-- is_premium=true and a custom premium_price, plus a new 'premium_open'
-- status for a slot the barber has published but no customer has booked yet.

-- ── Step 1: add premium columns ─────────────────────────────────────
alter table appointments add column if not exists is_premium boolean not null default false;
alter table appointments add column if not exists premium_price integer;

-- ── Step 2: widen the status CHECK constraint ───────────────────────
-- The original schema file (supabase-schema.sql) defined:
--   status text not null default 'pending' check (status in ('pending','approved','rejected'))
-- Since then in_progress/completed/cancelled were added to the codebase
-- without an accompanying migration in this repo, so the live constraint
-- (if it still exists at all, under whatever name Postgres or a manual
-- ALTER gave it) may or may not match what's actually in code today.
--
-- Rather than assume its current name/shape, this dynamically finds ANY
-- CHECK constraint on appointments.status and drops it, then adds a single
-- explicitly-named constraint covering every status the app now uses.
do $$
declare
  con record;
begin
  for con in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att
      on att.attrelid = rel.oid
      and att.attnum = any(con.conkey)
    where rel.relname = 'appointments'
      and con.contype = 'c'
      and att.attname = 'status'
  loop
    execute format('alter table appointments drop constraint %I', con.conname);
  end loop;
end $$;

alter table appointments add constraint appointments_status_check
  check (status in (
    'pending', 'approved', 'rejected',
    'in_progress', 'completed', 'cancelled',
    'premium_open'
  ));

-- ── Step 3: double-booking protection — no migration needed, verified ──
-- appointments_active_slot_unique (see supabase-unique-slot-migration.sql) is:
--   create unique index ... on appointments (barber_id, date, time)
--   where status not in ('cancelled', 'rejected') and barber_id is not null;
--
-- 'premium_open' is not in the excluded ('cancelled','rejected') list, so it
-- IS already covered by this index:
--   - a barber can't open a premium slot on top of any existing active
--     appointment (pending/approved/in_progress/completed/premium_open) —
--     the insert will hit the unique-index violation (Postgres error 23505).
--   - a normal /api/book insert can't land on a barber_id+date+time that
--     already has an open premium slot — same 23505 violation.
-- The barber-open endpoint (STEP 2) still does its own availability
-- pre-check for a clean 409 response, with this index as the hard backstop
-- against race conditions.
