-- Barber appointment booking schema

create table appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  service text not null,
  date date not null,
  time text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

create table blocked_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time text not null,
  unique(date, time)
);

-- Index for fast slot availability checks
create index appointments_date_time on appointments(date, time);
create index blocked_slots_date_time on blocked_slots(date, time);

-- RLS: allow all reads and inserts from anon (the app uses service role for admin ops)
alter table appointments enable row level security;
alter table blocked_slots enable row level security;

create policy "Allow anon insert appointments" on appointments
  for insert to anon with check (true);

create policy "Allow anon read appointments" on appointments
  for select to anon using (true);

create policy "Allow anon read blocked_slots" on blocked_slots
  for select to anon using (true);

-- For admin operations (approve/reject), use the service role key server-side
