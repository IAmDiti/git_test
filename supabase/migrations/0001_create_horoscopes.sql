create extension if not exists "pgcrypto";

create table if not exists public.horoscopes (
  id uuid primary key default gen_random_uuid(),
  sign text not null,
  date date not null,
  short_text text not null,
  long_text text not null,
  created_at timestamp default now(),
  unique (sign, date)
);

alter table public.horoscopes enable row level security;

create policy "Horoscopes are readable by all"
on public.horoscopes
for select
using (true);

revoke all on public.horoscopes from anon, authenticated;
grant select (id, sign, date, short_text, created_at) on public.horoscopes to anon;
grant select on public.horoscopes to authenticated;
