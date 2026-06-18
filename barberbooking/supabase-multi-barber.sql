-- Multi-barber migration
-- Run this in your Supabase SQL editor BEFORE deploying the code changes

-- 1. Barbers table
create table if not exists barbers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  specialty text,
  image_url text,
  password text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. RLS for barbers (public read of active barbers)
alter table barbers enable row level security;

create policy "Allow anon read barbers" on barbers
  for select to anon using (is_active = true);

-- 3. Add barber_id to appointments (nullable so existing appointments aren't broken)
alter table appointments
add column if not exists barber_id uuid references barbers(id);

-- 4. Seed 4 barbers (safe to re-run)
insert into barbers (name, specialty, password) values
('שי',  'כל סוגי התספורות — המנהל', 'manager123'),
('יוסי', 'פייד ועיצוב מודרני',        'yossi123'),
('מוטי', 'זקן וגילוח מסורתי',         'moti123'),
('דני',  'תספורות קלאסיות',           'danny123')
on conflict do nothing;
