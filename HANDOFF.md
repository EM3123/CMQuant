# Accounts handover: what's done, what's left

**From:** Cameron · **To:** EM3123 · **Date:** 27 September 2026

Accounts are built and merged. Most of the setup is done. What's left is
mostly **your Vercel project** (only you can edit it) and a quick check of
the Supabase email settings. Budget about 20 minutes.

> **No secrets in this file.** Keys and passwords live in Supabase, Vercel
> and a password manager. Never paste them into the repo, an issue, a PR
> or a group chat.

---

## 1. Where things stand

| Piece | Status |
|---|---|
| Accounts code (sign-in, usernames, runs saved from every game) | ✅ Merged to `main` (PR #4) |
| Live site `cm-quant.vercel.app` | ✅ Running the accounts code, but **switched off** until the keys are added (step 4) |
| Supabase project | ✅ Created by Cameron |
| Database tables (`profiles`, `runs`) | ✅ Created and checked |
| Gmail sender and email templates | ⚠️ Cameron worked through these, but **check them** (step 3) |
| Keys in Vercel | ❌ **Not done.** Needs your Vercel project (step 4) |
| Setup guide fix (the Gmail step) | ⏳ PR #5 open, docs only. Merge it. |

With the keys missing, the site behaves exactly as before: no sign-in link,
and nothing talks to Supabase. So nothing is broken while you set this up.

---

## 2. Get into Supabase

The Supabase project lives in **Cameron's** account.

- **Project:** `cmquant` (free plan)
- **Project ID:** `bdfxswsutiwkcglcvspz`
- **Project URL:** `https://bdfxswsutiwkcglcvspz.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/bdfxswsutiwkcglcvspz

**Cameron:** invite EM3123 under your organization's **Team** settings, so
they can copy the keys and change settings themselves.

---

## 3. Check the Supabase email setup

Players sign in with a **6-digit code** that Supabase emails them. Supabase
won't let you edit its email templates until a custom email sender (custom
SMTP) is connected, so the site sends through a dedicated Gmail account.

Everything below is in Supabase under **Authentication** (the padlock icon
in the left strip), then **Emails**.

**a) SMTP Settings tab.** **Enable custom SMTP** should be on, with:

| Field | Value |
|---|---|
| Sender email | the site's Gmail address (ask Cameron which one) |
| Sender name | `CMQuant` |
| Host | `smtp.gmail.com` |
| Port | `465` (if sending fails, try `587`) |
| Username | the same Gmail address |
| Password | a 16-character Google **app password**, not the Gmail password |

If it isn't set up:
1. Pick the Gmail account and turn on 2-Step Verification
   (myaccount.google.com, then **Security**).
2. Create an app password at myaccount.google.com/apppasswords.
3. Fill in the table above.

**b) Templates tab.** Both **Magic link** and **Confirm sign up** must
contain `{{ .Token }}`. If either still shows a "Log In" link instead, replace
its body with:

```html
<h2>Your CMQuant sign-in code</h2>
<p>Enter this code on the site: <strong>{{ .Token }}</strong></p>
<p>If you did not ask for this, ignore this email.</p>
```

The code screen on the site only works if the email contains the code.

---

## 4. Add the keys to Vercel (the main job)

The live site is **your** Vercel project, `em3123s-projects/cm-quant`.
Cameron can't reach it: Vercel's free Hobby plan doesn't allow members.

1. In Vercel, open **cm-quant**, then **Environment Variables** in the left
   menu, then **Add Environment Variable**.
2. Add these three. Tick **Production, Preview and Development** for each,
   then **Save**. Copy the names exactly.

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://bdfxswsutiwkcglcvspz.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase, gear icon, **API Keys**: copy the `sb_publishable_…` key |
   | `SUPABASE_SECRET_KEY` | Same page: copy the `sb_secret_…` key. Mark it **Sensitive**. |

3. Go to **Deployments**, click **⋯** on the top deployment, then
   **Redeploy**. This is required: the `NEXT_PUBLIC_` values are baked in
   when the site is built.

---

## 5. Test it

1. Open **cm-quant.vercel.app**. A **Sign in** link should now appear at the
   top right of Home, Comp, Poker Lab and Daily.
2. Sign in with your email and type the 6-digit code. Check spam the first
   time.
3. Pick a username.
4. Play any game. Under the results card it should say **"Saved to your
   account."**
5. In Supabase, **Table Editor**, `runs`: your game should be a row there.

| Symptom | Likely cause |
|---|---|
| No "Sign in" link | Keys missing or misspelled, or you didn't redeploy |
| "Sign in" works but no email arrives | SMTP settings (step 3a), or the email is in spam |
| Email arrives with a link, not a code | Templates not updated (step 3b) |
| "Could not save this run" | `SUPABASE_SECRET_KEY` missing or wrong; redeploy after fixing |

---

## 6. Traps we already hit (so you don't)

- **Don't re-run the setup SQL.** The tables exist. Running
  `supabase/migrations/0001_accounts.sql` again just errors with
  `relation "profiles" already exists`. To check the database is right,
  run this in Supabase's **SQL Editor**:
  ```sql
  select
    (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('profiles','runs')) as tables,
    (select count(*) from pg_policies where schemaname = 'public' and tablename in ('profiles','runs')) as policies,
    (select count(*) from pg_indexes where schemaname = 'public' and tablename in ('profiles','runs')) as indexes,
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'runs' and column_name in ('mode','cleared')) as endless_columns;
  ```
  A correct setup returns **2 · 4 · 8 · 2**. Cameron's does.
- **Ignore `cm-quant-beta.vercel.app`.** It's Cameron's own Vercel project,
  built from a private copy, `CameronSJiang/CMQuant`, which is two weeks
  stale and has no accounts code. It isn't a GitHub fork, so it can't be
  synced. Only `em3123s-projects/cm-quant` matters.
- **Vercel blocks previews from commit authors outside the team.** It
  refused a preview on PR #1 because the commit author, `kiro-agent`, wasn't
  on the Vercel team. Merging to `main` still deploys.
- **Supabase free projects pause after a week with no activity.** You can
  restore one from the dashboard, and nothing is lost.
- **Gmail sends about 500 emails a day.** That's plenty for now. If you
  outgrow it, buy a domain and point the SMTP settings at a provider such
  as Resend. No code changes needed.

---

## 7. How the code fits together

| File | What it does |
|---|---|
| `supabase/migrations/0001_accounts.sql` | Tables and access rules. Emails are private, usernames and runs are public, and only the server can write runs. |
| `lib/accounts/config.ts` | Reads the env vars. With them missing, accounts are off. |
| `lib/accounts/client.ts` | Browser sign-in state (`useAccount()`). The session lives in `localStorage`, and the site uses no cookies. |
| `lib/accounts/server.ts` | Server-only Supabase client that holds the secret key |
| `lib/accounts/games.ts` | Stable game IDs that runs are saved under (`doomsday`, `pot-odds`, …) |
| `app/api/runs/route.ts` | Saves a run after checking the player's token. Decides which runs count as the daily. |
| `app/api/account/route.ts` | Deletes an account, along with its profile and runs |
| `app/account/page.tsx`, `components/account/*` | Sign-in page, header link, and the "Saved" line under the results card |
| `docs/accounts.md` | The full setup guide |

Rules the code already enforces:
- **The daily counts once per player per day**, enforced in the database.
- **Endless and 60-second runs are stored apart.** Endless runs have
  `mode = 'endless'` and a `cleared` depth, so a board can never rank one
  against the other.
- **Assisted runs are never saved.**

**Running it locally:** put the same three values in `.env.local` at the
repo root (git ignores it), then `npm run dev`.

---

## 8. What to build next

1. **Server-checked scores.** Right now the browser reports its own score,
   so every run is saved with `verified = false` and anyone with browser
   dev tools could fake one. The fix: the browser sends its *answers*
   instead, and `app/api/runs` rebuilds the questions from the seed
   (generators are pure and seeded) and scores them itself.
2. **Leaderboard pages.** Daily (today's `day_key`, best score per player)
   and all-time (best per game, per mode). They should show only
   `verified = true` runs.
3. **Carry XP over to accounts.** XP, levels and the dragon (README, "XP,
   levels and the dragon") are stored per browser. Once runs are
   server-checked, rebuild each player's ledger from their `runs` rows, so
   it follows them between devices.

Checks to run before every push (`main` deploys straight to production):

```bash
npm run verify && npm run lint && npm run build
```
