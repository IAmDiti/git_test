# Daily Horoscope MVP

Daily Horoscope is a simple Next.js 14 app that shows a short daily teaser for
everyone and unlocks a full, sectioned horoscope after login.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- OpenAI API (server-only)

## Features

- Pick any zodiac sign and read a short daily horoscope instantly.
- Full horoscope is gated behind free login.
- Full horoscope includes sections: General, Love, Career/Money, Advice.
- Today’s horoscope is stored once per sign/date.

---

## 1) Create a Supabase project

1. Go to https://app.supabase.com and create a new project.
2. Copy the project URL and API keys from **Project Settings → API**.
3. Enable Email magic links under **Authentication → Providers**.

## 2) Create the database table + RLS policies

Open the Supabase SQL editor and run:

```
-- supabase/migrations/0001_create_horoscopes.sql
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
```

## 3) Configure environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-api-key
```

> `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are server-only.

## 4) Run the app locally

```
npm install
npm run dev
```

Open http://localhost:3000

---

## API

`GET /api/horoscope?sign=aries`

Returns:

```
{
  "sign": "aries",
  "date": "2026-01-21",
  "short_text": "..."
}
```

If the user is authenticated, `long_text` is also returned.

---

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Add the same environment variables in Vercel.
4. Deploy.

---

## Notes

- The OpenAI key is never exposed to the browser.
- The API generates both short and long horoscope in a single call.
