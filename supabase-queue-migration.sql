-- ── Enable Realtime on appointments table ─────────────────────────
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

alter publication supabase_realtime add table appointments;

-- ── Optional: add cancelled status check ──────────────────────────
-- The status column is already text, so new values work without schema changes.
-- Existing statuses: pending | approved | rejected
-- New statuses added: in_progress | completed | cancelled

-- ── Supabase Edge Function trigger (requires pg_net extension) ─────
-- Only needed if you deploy the notify-admin Edge Function.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

/*
create or replace function call_notify_admin()
returns trigger as $$
begin
  perform net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-admin',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := jsonb_build_object('record', row_to_json(new))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_appointment
  after insert on appointments
  for each row execute procedure call_notify_admin();
*/

-- Note: The Next.js API route /api/notify-admin handles notifications
-- without needing the Edge Function. The trigger above is optional.
