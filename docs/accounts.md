# Accounts

Optional accounts so runs can be saved and ranked. Anyone can join; players
sign in with a six-digit code sent to their email, pick a username, and every
finished run is saved to their account. Leaderboards are built from those runs.

Until the three environment variables below exist, accounts are switched off:
no sign-in link renders, nothing talks to Supabase, and the site is exactly
what it was.

## How it fits together

- **Supabase** holds the accounts (emails, in its own `auth.users` table) and
  two tables of ours, `profiles` (usernames) and `runs` (saved runs). The
  schema and its access rules are `supabase/migrations/0001_accounts.sql`.
- **Sign-in runs in the browser** (`lib/accounts/client.ts`). The session sits
  in `localStorage`, so pages stay static and the site sets no cookies.
- **Runs are saved by the server** (`app/api/runs/route.ts`). The browser
  sends its access token; the route checks it with Supabase and writes the row
  with the secret key. The database has no insert policy on `runs`, so the
  browser cannot write a run directly, even with the public key.
- **The daily is one per player per day**, enforced by a unique index in the
  database, not by `localStorage`.
- **Timed and endless runs are kept apart.** Each run has a `mode`. Endless
  runs also store `cleared`, the depth reached, which is what they rank by;
  their points only break ties. A leaderboard must never mix the two modes,
  and the daily is always a timed run.
- **Scores are not verified yet.** The browser reports the score and every row
  is saved with `verified = false`. The next step replaces that: the browser
  sends its answers, and the server rebuilds the questions from the seed and
  scores them itself. Leaderboards should rank only verified runs.

## Setup (once, about fifteen minutes)

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (signing in with
   GitHub is simplest). The free plan needs no card.
2. **New project**. Name it `cmquant`, pick a region near your players (for
   CMU, an East US region), and set a database password. Save the password in
   a password manager; the app never needs it, but you will if you ever
   connect to the database directly.
3. Wait a minute or two for it to finish setting up.

### 2. Create the tables

1. In the project, open **SQL Editor** from the left sidebar.
2. Open `supabase/migrations/0001_accounts.sql` from this repo, copy the whole
   file, paste it into the editor, and press **Run**. It should say
   "Success. No rows returned."
3. Open **Table Editor**: you should now see `profiles` and `runs`.

### 3. Connect an email sender (custom SMTP)

Supabase's built-in email is for trying things out only: it will not let you
edit the email templates, it sends only a handful of emails an hour, and it
may only deliver to members of your Supabase team. So CMQuant sends its sign-in
emails through an ordinary Gmail account instead. It is free, needs no domain,
and Gmail allows around 500 emails a day.

1. **Make a Gmail account just for the site**, e.g. `cmquant.game@gmail.com`,
   rather than using a personal one. The app password below can read and send
   that account's mail, so it should hold nothing else.
2. In that account, turn on **2-Step Verification**
   (myaccount.google.com, then **Security**). App passwords require it.
3. Go to **myaccount.google.com/apppasswords**, create one named `Supabase`,
   and copy the 16-character password (the spaces do not matter). Google
   shows it once.
4. In Supabase: **Authentication**, **Emails**, the **SMTP Settings** tab.
   Turn on **Enable custom SMTP** and fill in:

   | Field | Value |
   |---|---|
   | Sender email | the Gmail address |
   | Sender name | `CMQuant` |
   | Host | `smtp.gmail.com` |
   | Port | `465` |
   | Username | the Gmail address |
   | Password | the app password |

   Leave the minimum interval as it is, and save.
5. Under **Authentication**, **Rate Limits**, "emails sent per hour" can now be
   raised. 30 is plenty to start.

If sending fails, try port `587`, and check the app password was pasted with no
extra characters.

### 4. Make the sign-in email send a code

Supabase's default emails contain a link. CMQuant asks for the code instead,
because a link has to return to an address Supabase trusts (every Vercel
preview has a different one), and a code also works when you read your mail
on your phone while playing on a laptop.

1. Open **Authentication**, then **Emails** (email templates).
2. Edit the **Magic Link** template. Replace its body with something like:

   ```html
   <h2>Your CMQuant sign-in code</h2>
   <p>Enter this code on the site: <strong>{{ .Token }}</strong></p>
   <p>If you did not ask for this, ignore this email.</p>
   ```

3. Do the same for the **Confirm signup** template. A player's very first
   sign-in uses that one.
4. Save both.

Email sign-in is on by default. Leave "Confirm email" on.

### 5. Copy the keys into Vercel

1. In Supabase, open **Project Settings**, then **API Keys**. You need:
   - the **Project URL** (also under the **Connect** button at the top, or
     **Project Settings, Data API**), like `https://abcdefgh.supabase.co`
   - the **publishable key**, starting `sb_publishable_`
   - a **secret key**, starting `sb_secret_` (click to reveal). Treat this one
     like a password: it bypasses every access rule. Never paste it into
     code, a chat, an issue or a commit.
2. In Vercel, open the `cm-quant` project, then **Settings**, then
   **Environment Variables**. Add three, each for Production, Preview and
   Development:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key |
   | `SUPABASE_SECRET_KEY` | the secret key (tick **Sensitive**) |

3. **Redeploy.** The two `NEXT_PUBLIC_` values are baked in when the site is
   built, so they only take effect on the next deployment: **Deployments**,
   the latest one, **...**, **Redeploy**.

### 6. Try it

Open the site, click **Sign in** in the top bar, enter your email, type the
code from the email, and pick a username. Play any game; under the results
card it should say "Saved to your account." In Supabase's **Table Editor**,
the `runs` table now has your row.

### Running locally

Put the same three values in `.env.local` at the repo root (it is gitignored)
and restart `npm run dev`.

## Limits of the free setup

- **About 500 sign-in emails a day** through Gmail. A player stays signed in
  on a device, so this is new sign-ins, not visits. If the site outgrows it,
  buy a domain and move the SMTP settings to a provider like Resend (3,000
  emails a month free); nothing in the code changes.
- **Free projects pause after a week with no activity.** A paused project is
  restored from the Supabase dashboard; nothing is lost. Once people are
  playing daily, this will not trigger.
- **500 MB of database.** A saved run is well under 200 bytes, so that is
  millions of runs.

## Deleting data

Players delete their own account from `/account`. That calls
`app/api/account/route.ts`, which removes the auth user; the foreign keys
cascade to their profile and every run. To remove a player by hand, delete
them under **Authentication, Users** in Supabase; the same cascade applies.
