# Cameron — what comes after accounts

Read [`accounts.md`](accounts.md) for how the thing you built works and
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the two rules that break everything
else. This is the argument for what to do next and in what order.

## Access

**GitHub.** Edmund adds you as a collaborator on `EM3123/CMQuant`. That is the
only access you actually need to work.

**Vercel: you are not getting an invite, and it does not matter much.** The
project is on the Hobby plan, which is a single account with no members — the
fix is Pro at $20 per seat, $40 for the two of you, for a site currently
earning nothing. Two consequences to plan around:

- **No preview deployments on your pull requests.** Hobby refuses a preview
  when the commit author is not on the team, and on Hobby the team is one
  person. `npm run dev` is your preview; `main` deploys to production on push.
- **Environment variables are Edmund's job.** You cannot set them, so anything
  needing a new key needs a message to him, not a PR.

The number to beat is in [`ads-brief.md`](ads-brief.md): Pro only makes sense
once something is paying for it.

## The thing that is actually broken right now

Accounts are switched off in production because the three Supabase keys are
not in Vercel yet. Until Edmund does that, everything you shipped is dark. It
is ten minutes of his time and it blocks all of the below, so chase it before
you write any code.

## Then, in this order

### 1. Server-checked scores

Everything else waits on this, and it is not a preference. `app/api/runs`
inserts without touching `verified`, which defaults to `false`, and the schema
comment on that column says boards should rank verified runs only. So a
leaderboard built today ranks an empty set.

The shape of the fix is already written in the handler's header comment: the
browser sends its **answers** rather than its score, and the server rebuilds
the questions from the seed — generators are pure and seeded, which is the
entire reason that rule exists — and scores them itself.

Two things to get right:

- **Scoring is shared code, not a second copy.** `lib/scoring.ts` for timed,
  `lib/endless.ts` for endless. A server that scores by its own arithmetic will
  disagree with the number the player just watched go up, and they will believe
  the screen.
- **A run has a plausible duration.** Sixty questions in a sixty-second game is
  a bot. The tape already carries per-answer milliseconds.

### 2. `/leaderboard`

The site already promises this. `app/account/page.tsx` says "Sign in to save
your runs and appear on the leaderboards" and there is no such page. That is a
broken promise sitting in production copy, which is the cheapest kind of bug to
find and the worst kind to leave.

The indexes exist for exactly three boards, so build those three:

| Index | Board |
| --- | --- |
| `runs_by_day_score` | Today's daily, best score per player |
| `runs_by_game_score` | All-time per game, timed |
| `runs_by_endless_depth` | All-time per game, endless, by depth then points |

**Timed and endless never share a board.** Endless scores by a different model
and its headline is depth, not points. Mixing them produces a ranking where the
number means two things.

### 3. Your own runs, on `/account`

Right now signing in gives a player a history they cannot see: "Saved to your
account", and then nothing, ever. A short list of recent runs with the score
and the game closes that loop, and it is an afternoon.

## And the posters

Worth doing, worth starting the design now because approval and printing have
lead time, but it is not the next job. A poster produces a spike of people who
each play once. What turns a spike into anything is the board and the daily, so
the board should exist by the time paper goes up.

Three constraints that will trip a poster immediately:

1. **No CMU marks and no CMU name.** Not the wordmark, the seal, the Scottie
   dog, the tartan, "Tartans", "Carnegie Mellon" or "CMU". The colours are
   fine; the identity is the university's property. A poster reading "CMU's
   quant trainer" is the exact thing that gets a takedown.
2. **The unaffiliated line goes on the poster**, same as the footer: a
   student-built project, not affiliated with or endorsed by the university.
3. **Campus posting almost certainly needs approval.** Check the current
   student affairs posting policy before printing a hundred of anything.

And one honest limitation: **there is no analytics, so a poster is
unmeasurable.** The only signal a campaign leaves today is sign-ups appearing
in Supabase. If measuring matters, that is a decision to make before printing,
not after — and it is a privacy-policy change, so it is the same conversation
as the one in [`ads-brief.md`](ads-brief.md).

## Before every push

```bash
npm run verify && npm run lint && npm run build
```

`main` deploys straight to production. There is no staging, so that command is
the staging environment.
