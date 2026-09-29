# CMQuant runbook

The operational half of the project: who has access to what, the one job that
is currently blocking everything, and how the two of us work on the same repo
without standing on each other.

This is the page to open when something needs doing. It does not explain how
the code works — [`CONTRIBUTING.md`](CONTRIBUTING.md) does that.

---

## 1. Where things actually stand

| Thing | State | Whose job |
| --- | --- | --- |
| The site | Live at cm-quant.vercel.app, deploys on every push to `main` | — |
| Games | 12, all playable, all in the daily rotation | done |
| Accounts code | Merged and working | done |
| **Accounts in production** | **Off. The three Supabase keys are not in Vercel.** | **Edmund, §2** |
| Supabase project | Created, tables and policies checked | Cameron |
| Email sign-in codes | Working via Gmail SMTP — worth re-checking, §4 | Cameron |
| GitHub access | **Both of us have write access already** | done |
| Vercel access | Edmund only, and that cannot change on the free plan, §5 | — |
| Leaderboards | Not built. Promised nowhere in the UI any more. | Cameron, §6 |

### Access, accurately

**Cameron already has write access to `EM3123/CMQuant`.** He has merged seven
pull requests into `main` and pushes branches directly to the repo, neither of
which is possible without it. If anybody says otherwise, this is the evidence:

```bash
git log --merges --pretty='%an  %s' -8
```

Every one of those merges is his. **There is no GitHub invite to send.**

What he genuinely does not have is **Vercel** — see §5, which explains why and
what to do about it.

---

## 2. Turn accounts on — Edmund, 10 minutes

This is the only thing blocking the whole accounts feature. Until it is done,
the site behaves exactly as it did before Cameron built any of it: no sign-in
link, nothing talks to Supabase, no run is ever saved. Nothing is broken in the
meantime — it is simply switched off.

### 2a. Get the two keys out of Supabase

1. Open <https://supabase.com/dashboard/project/bdfxswsutiwkcglcvspz>.
   If you cannot get in, ask Cameron to add you to his organisation's **Team**
   first — see §4.
2. Click the **gear icon** (Project Settings) in the bottom left.
3. Click **API Keys**.
4. Leave this tab open. You need two values from it:
   - the key beginning `sb_publishable_…`
   - the key beginning `sb_secret_…`

> **The secret key is a password.** It goes in Vercel and nowhere else. Never
> in the repo, a PR, an issue, a screenshot or a group chat. If it ever leaks,
> rotate it on this same page.

### 2b. Put three variables into Vercel

1. Open <https://vercel.com> and pick the **cm-quant** project.
2. **Settings** → **Environment Variables**.
3. Add these three, one at a time. For each one, tick **Production**,
   **Preview** *and* **Development** before saving.

   | Name (copy exactly) | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://bdfxswsutiwkcglcvspz.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key |
   | `SUPABASE_SECRET_KEY` | the `sb_secret_…` key — also tick **Sensitive** |

   The names are case-sensitive and the `NEXT_PUBLIC_` prefix is load-bearing.
   A typo here fails silently: the site keeps working and accounts stay off.

### 2c. Redeploy — do not skip this

1. **Deployments** tab.
2. **⋯** on the most recent deployment → **Redeploy**.

Anything named `NEXT_PUBLIC_*` is compiled into the JavaScript at build time,
not read when somebody visits. Saving the variables changes nothing on its own;
the redeploy is what actually turns accounts on.

### 2d. Check it worked

Open <https://cm-quant.vercel.app> and walk through this:

1. A **Sign in** link appears at the top right of Home, Comp, Poker Lab, Daily
   and My Firm. ← if not, stop; see the table below
2. Click it, enter your email, and a six-digit code arrives. Check spam the
   first time.
3. Type the code. Pick a username.
4. Play any game to the end. Under the results card: **"Saved to your
   account."**
5. In Supabase → **Table Editor** → `runs`, your run is a row.

| What you see | What is wrong |
| --- | --- |
| No **Sign in** link at all | A variable name is misspelled, or you did not redeploy |
| Sign in works, no email arrives | SMTP settings (§4a), or it is in spam |
| Email has a login *link* instead of a *code* | Email templates (§4b) |
| "Could not save this run" | `SUPABASE_SECRET_KEY` missing or wrong — fix it, then redeploy again |

---

## 3. Running it on your own machine

Both of us, any time:

```bash
git clone https://github.com/EM3123/CMQuant.git
cd CMQuant
npm install
npm run dev
```

Open <http://localhost:3000>. That is the landing page and it is also Equalize
— the game is the front page on purpose.

To work on accounts locally, make a file called `.env.local` in the repo root
with the same three values from §2b:

```
NEXT_PUBLIC_SUPABASE_URL=https://bdfxswsutiwkcglcvspz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

`.env*` is gitignored, so it cannot be committed by accident. Without it,
accounts are simply off locally and everything else works.

### Before every push

```bash
npm run verify && npm run lint && npm run build
```

`main` deploys straight to production. **There is no staging environment, so
that command is the staging environment.** It takes a few minutes; run it and
wait rather than pushing hopefully.

If the build fails with `EPERM ... unlink '.next/...'`, that is OneDrive
syncing the build folder mid-write. Stop the dev server, `rm -rf .next`, build
again.

---

## 4. Supabase — Cameron

### 4a. Add Edmund to the project

Supabase dashboard → your organisation → **Team** → invite
`edmund.y.michalski@gmail.com`. Without this he cannot read the keys in §2a and
has to ask you every time.

### 4b. Re-check the email settings

Players sign in with a six-digit code that Supabase emails them. Supabase will
not let you edit its email templates until a custom sender is connected, which
is why this goes through a dedicated Gmail account.

**Authentication** (padlock icon) → **Emails**:

- **SMTP Settings** — *Enable custom SMTP* on, host `smtp.gmail.com`, port
  `465` (try `587` if sending fails), username the site's Gmail address,
  password a 16-character Google **app password** — not the Gmail password.
- **Templates** — both **Magic link** and **Confirm sign up** must contain
  `{{ .Token }}`. If either still shows a "Log In" link, replace the body with:

  ```html
  <h2>Your CMQuant sign-in code</h2>
  <p>Enter this code on the site: <strong>{{ .Token }}</strong></p>
  <p>If you did not ask for this, ignore this email.</p>
  ```

The code screen on the site only works if the email contains the code.

### 4c. Do not re-run the setup SQL

The tables exist. Running `supabase/migrations/0001_accounts.sql` again just
errors. To check the database is intact, run this in the **SQL Editor**:

```sql
select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('profiles','runs')) as tables,
  (select count(*) from pg_policies where schemaname = 'public' and tablename in ('profiles','runs')) as policies,
  (select count(*) from pg_indexes where schemaname = 'public' and tablename in ('profiles','runs')) as indexes,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'runs' and column_name in ('mode','cleared')) as endless_columns;
```

A correct setup returns **2 · 4 · 8 · 2**.

---

## 5. Vercel, and why Cameron is not on it

The project is on Vercel's **Hobby** plan, which is one account with no members.
Adding him means **Pro at $20 per seat**, so $40 a month for a site currently
earning nothing. Two consequences to plan around rather than fight:

- **Cameron's pull requests will never get a preview deployment.** Hobby
  refuses previews when the commit author is not on the team, and the team is
  one person. This is not a misconfiguration and it is not worth debugging.
  `npm run dev` is his preview; merging to `main` deploys for real.
- **Environment variables are Edmund's alone.** Anything needing a new key is a
  message to Edmund, not a pull request.

Hobby is also **non-commercial use only**, so the day anything earns money —
ads, a subscription — the upgrade stops being optional. The arithmetic for that
decision is in [`ads-brief.md`](ads-brief.md).

**Ignore `cm-quant-beta.vercel.app`.** It is Cameron's own Vercel project built
from a private copy that is weeks stale and has no accounts code. It is not a
GitHub fork, so it cannot be synced. Only `em3123s-projects/cm-quant` matters.

---

## 6. Who does what next

### Cameron

In this order, because each one needs the one before it. The reasoning is in
[`next-brief.md`](next-brief.md).

1. **Server-checked scores.** `app/api/runs` never sets `verified`, so every
   row defaults to `false`, and the schema comment says boards should rank
   verified runs only. A leaderboard built today ranks an empty set. The fix is
   already sketched in that file's header comment: the browser sends its
   *answers*, the server rebuilds the questions from the seed — generators are
   pure and seeded, which is the entire reason that rule exists — and scores
   them itself with the same `lib/scoring.ts` the player watched.
2. **`/leaderboard`.** Three boards, one per index that already exists: today's
   daily, all-time per game timed, all-time per game endless by depth. Timed
   and endless never share a board.
3. **Your own runs on `/account`.** Signing in currently gives you a history
   you cannot see.

### Edmund

1. §2, today.
2. §4a — get yourself into Supabase so you stop being blocked on Cameron.
3. Poster and QR artwork, once there is a leaderboard to point at. Three
   constraints that will trip a poster immediately:
   - **No CMU marks and no CMU name.** Not the wordmark, seal, Scottie dog,
     tartan, "Tartans", "Carnegie Mellon" or "CMU". The colours are fine; the
     identity is the university's property.
   - **The unaffiliated line goes on the poster**, same as the site footer.
   - **Campus posting needs approval** — check the current student affairs
     policy before printing a hundred of anything.

   And one honest limitation: there is no analytics, so a poster campaign is
   unmeasurable except by sign-ups appearing in Supabase. If measuring matters,
   decide that before printing, and note it is a privacy-policy change.

---

## 7. Working on the same repo without collisions

The seam is **runtime versus content**, and it exists so two people can work at
once:

- **Content** is `lib/games/*` and `scripts/verify-*`. Pure functions, no React,
  no DOM. Two people editing different generators will never conflict.
- **Runtime** is `components/game/*`, `app/*`, `lib/browserState.ts` and
  `app/globals.css`. Routing, the clock, persistence, the design tokens.

In practice:

- **Branch, don't push to `main` directly**, when the change is more than a
  line. Open a PR, let the other person glance at it, merge it.
- **Pull before you start.** Both of us have had to rebase mid-change because
  the other merged something. `git pull --rebase` is the cheap habit.
- The files that have actually collided so far are
  `components/game/ResultsCard.tsx`, `app/daily/page.tsx` and `lib/daily.ts` —
  every one of them a place where a new game or a new feature has to register
  itself. Expect conflicts there and nowhere much else.

### Adding a game later

```bash
npm run new:game -- bayes "Bayes" comp
```

That writes the generator, the property test, the UI and the route, and wires
the test into `npm run verify`. **The test fails on purpose the first time** —
the placeholder generator puts the answer in the first slot every time and the
test catches it. That is the lesson the whole repo is built around.

Then register the game in all four places or the build will tell you:
`lib/daily.ts` (rotation), `lib/accounts/games.ts` (so runs save), the wing
index (`app/comp` or `app/poker`), and `app/page.tsx` (the landing list).
`scripts/verify-daily.ts` walks `app/g/` and fails if a playable route is
missing from the rotation or the landing page.

---

## 8. Things that are deliberately not done

So nobody "fixes" them:

- **No ads.** The reasoning and the number they would have to clear are in
  [`ads.md`](ads.md) and [`ads-brief.md`](ads-brief.md).
- **No analytics, no cookies, no third-party scripts.** Signed out, the site
  talks to nobody. That is a claim `/legal/privacy` makes in plain language and
  it is currently true.
- **Poker Minute has no endless mode.** It withholds the grade until the run
  ends, and a life you can watch disappear is feedback. The two contradict each
  other; it is not an oversight.
- **The poker wing is strictly simulated.** No deposits, withdrawals, prizes,
  wagering, virtual currency with value, or loot-box mechanics, and it is never
  marketed as a way to win money.
