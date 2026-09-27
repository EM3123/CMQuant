-- Accounts and saved runs.
--
-- Paste this whole file into the Supabase SQL Editor and press Run, once.
-- docs/accounts.md walks through the rest of the setup.
--
-- Who can do what is decided here, by row level security, not by the app:
--   * Emails live in auth.users, which the public API cannot read at all.
--   * Usernames are public, because a leaderboard has to show them. Each
--     player can create and change only their own.
--   * Runs are public to read, because leaderboards are built from them.
--     Nobody can write one from the browser: there is no insert policy, so
--     only the server (holding the secret key) saves runs. That is the seam
--     where score verification goes.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usernames are public"
  on public.profiles for select
  using (true);

create policy "Players create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Players rename themselves"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table public.runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Stable slug from lib/accounts/games.ts, e.g. 'doomsday', 'pot-odds'.
  game text not null,
  -- 'timed' is the sixty-second round; 'endless' is lives and a shrinking
  -- window, scored by lib/endless.ts. The two are different quantities and a
  -- leaderboard must never rank one against the other.
  mode text not null default 'timed' check (mode in ('timed', 'endless')),
  seed text not null,
  -- Set only for the daily: the UTC date whose puzzle this was. Always a
  -- timed run.
  day_key date check (day_key is null or mode = 'timed'),
  score integer not null check (score >= 0),
  -- Endless only: questions cleared, which is the headline there. Points only
  -- break ties between runs that died on the same question.
  cleared integer check (cleared >= 0),
  correct integer not null check (correct >= 0),
  attempted integer not null check (attempted >= correct),
  best_streak integer not null check (best_streak >= 0),
  -- False until the server replays the answers from the seed and recomputes
  -- the score itself. Leaderboards should only rank verified runs.
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  check ((mode = 'endless') = (cleared is not null))
);

-- One daily per player per day, enforced by the database rather than by
-- localStorage, which anyone can clear.
create unique index runs_one_daily_per_player
  on public.runs (user_id, day_key)
  where day_key is not null;

-- The leaderboard shapes: best per game and mode, deepest endless, and a
-- single day's daily.
create index runs_by_game_score on public.runs (game, mode, score desc);
create index runs_by_endless_depth on public.runs (game, cleared desc, score desc)
  where mode = 'endless';
create index runs_by_day_score on public.runs (day_key, score desc)
  where day_key is not null;
create index runs_by_player on public.runs (user_id, created_at desc);

alter table public.runs enable row level security;

create policy "Runs are public"
  on public.runs for select
  using (true);
