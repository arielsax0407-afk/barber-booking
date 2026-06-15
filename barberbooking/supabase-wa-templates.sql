-- ============================================================
-- WhatsApp templates table — run this in the Supabase SQL Editor
-- ============================================================
-- Lets the admin edit the WhatsApp message templates (approve /
-- reject / reschedule) from the Settings tab. Falls back to the
-- built-in defaults in src/lib/waTemplates.ts when a key is missing.

create table if not exists wa_templates (
  key text primary key,
  body text not null,
  updated_at timestamptz default now()
);

alter table wa_templates enable row level security;

-- No policies: anon/authenticated get zero access, same as
-- appointments/blocked_slots after supabase-rls-hardening.sql.
-- The service-role key used by /api/admin/* bypasses RLS.
