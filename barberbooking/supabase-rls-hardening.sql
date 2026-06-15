-- ============================================================
-- RLS hardening — run this in the Supabase SQL Editor
-- ============================================================
-- Why: the app now reads/writes appointments and blocked_slots
-- ONLY through server-side API routes using the service-role key
-- (which bypasses RLS entirely). The anon (browser) key no longer
-- needs ANY direct access to these tables.
--
-- Today the anon key can:
--   - SELECT * on appointments  -> leaks every customer's name + phone
--   - INSERT/UPDATE/DELETE on blocked_slots -> anyone can wipe the calendar
--
-- This script removes ALL policies for both tables (RLS stays
-- enabled), so the anon role gets zero access by default. The
-- service role is unaffected — it always bypasses RLS.
-- ============================================================

-- Make sure RLS is enabled (no-op if already on)
alter table appointments enable row level security;
alter table blocked_slots enable row level security;

-- Drop every existing policy on both tables, whatever they're named
-- (some blocked_slots policies were created outside this repo's schema file)
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('appointments', 'blocked_slots')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- No new policies are created. With RLS enabled and zero policies,
-- the anon and authenticated roles have NO access (select/insert/
-- update/delete) to appointments or blocked_slots. The service-role
-- key used by the API routes (/api/book, /api/availability,
-- /api/queue/[id], /api/admin/*) bypasses RLS and continues to work
-- normally.
