-- Security hardening — run this in the Supabase SQL Editor.
--
-- Why: every read/write in this app goes through Next.js API routes using
-- the service-role key (which bypasses RLS entirely). The anon key is never
-- used to query the database directly from the client — so the permissive
-- "using (true)" policies below only exist to leak data to anyone holding
-- the public anon key, which is embedded in the page source of every visit.
--
-- Verified exposed before this fix (via the public anon key, no login):
--   - barbers.password — every barber's plaintext login password
--   - appointments      — every customer's full name + phone number
--
-- (Plaintext barber passwords have separately been rotated to salted
-- scrypt hashes — see src/lib/passwordHash.ts — so this closes both the
-- exposure and the underlying plaintext-storage risk.)

-- barbers: stop leaking passwords (and everything else) to anyone with the anon key
drop policy if exists "Allow anon read barbers" on barbers;

-- appointments: stop leaking every customer's name + phone number
drop policy if exists "Allow anon read appointments" on appointments;
drop policy if exists "Allow anon insert appointments" on appointments;

-- blocked_slots: low sensitivity, but not needed publicly either — same principle
drop policy if exists "Allow anon read blocked_slots" on blocked_slots;

-- Belt-and-suspenders: revoke the underlying table grants too, so a future
-- "for select using (true)" policy doesn't silently reopen public access.
revoke all on barbers, appointments, blocked_slots from anon, authenticated;

-- service_role bypasses RLS (Supabase default) and keeps its own grants,
-- so none of this affects the app's own API routes — only direct
-- anon/authenticated access via the public REST API is blocked.
