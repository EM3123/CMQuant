# GitHub poker bot recon

Scope: public repositories for collegiate and competition poker bots (MIT Pokerbots, IIT Pokerbots, HPI Showdown, Warwick AI, MIT Pokerbots engines). Repos for real-money poker sites were excluded on purpose. Their purpose is to play against people for money, so an "exploit" write-up for them is not something this project should carry.

Gathered on 2026-10-29 with `gh search repos` and `gh api`. Star counts are as of that date and are small, so treat them as a rough signal only.

## What the search did and did not find

- **Citadel / Sequoia poker bots: none found.** Every "citadel poker" and "sequoia poker" query came back empty. The Citadel Datathon repos that do show up (`roshinib3/citadel-datathon-summer-2020`, `evilpegasus/datathon-spring-2021`, `arjashok/2024-Summer-Datathon`, and others) are economics and health data analysis, not game-playing code. The Citadel item in the brief has no source here.
- **MIT Pokerbots:** well covered. The engines and skeletons are public, and so are several student bots for the 2020–2025 variants.
- **IIT, HPI, Warwick:** public skeletons and student bots, with varying levels of documentation.

## Top 10 relevant repos

Ranked by how useful each is for a bot that has to play a fixed engine. Stars are in parentheses.

1. **[mitpokerbots/engine](https://github.com/mitpokerbots/engine)** (11). The reference vanilla hold'em engine, with Python, Java and C++ skeletons. Its README says not to change it for yearly variants. Read this first for the rules and the subprocess protocol.
2. **[mitpokerbots/engine-2023](https://github.com/mitpokerbots/engine-2023)** (12). Same skeleton layout, with the 2023 config. Useful for the current `config.py` and `engine.py` shape.
3. **[abh-win/auction-poker-bot](https://github.com/abh-win/auction-poker-bot)** (0, updated 2026-10-27). C++17 bot for MIT Pokerbots 2024 "Auction Hold'em". Includes a rules-exact engine, a 169-class preflop table, bounded Monte Carlo equity, a Beta-smoothed opponent model, and a marginal-EV auction bid. Its `results/arena.txt` has a 40,000-hand duplicate-match table against baseline bots. This is the strongest technical write-up in the set.
4. **[Bhavana-B-del/IITM-Pokerbots-2025](https://github.com/Bhavana-B-del/IITM-Pokerbots-2025)** (1). Python bot for IIT Pokerbots 2026 "Sneak Peek Hold'em", placed 49th of 500. Uses preflop tiers, eval7 Monte Carlo, and an auction bid tuned to avoid leaking hand strength through bid size. Good worked example of a time-budget-aware design (2 s per query, 20 s per match).
5. **[pashneal/PokerBots2024](https://github.com/pashneal/PokerBots2024)** (0). Rust implementation with MCCFR (`src/algorithm/mccfr.rs`), a blueprint and regret strategy, and a Kuhn/Goofspiel/auction implementation set. The only repo here that actually runs counterfactual regret minimisation. Early-stage, so read it for structure rather than strength.
6. **[mixedsolver/poker-arena](https://github.com/mixedsolver/poker-arena)** (3). Rust arena with 20 hold'em and draw variants, seeded duplicate dealing, 95% confidence intervals, and a JSON-lines wire protocol for bots in any language. Its match reports include per-bot VPIP, PFR, aggression factor and showdown rates. Best reference for how to evaluate a bot honestly.
7. **[mitpokerbots/pbots_calc](https://github.com/mitpokerbots/pbots_calc)** (58). C ranged equity calculator with Python and Java wrappers. Marked as no longer maintained. Useful for range-vs-range equity in a fixed-depth loop.
8. **[KanishkT123/PokerBot](https://github.com/KanishkT123/PokerBot)** (60). RNN bot in the DeepStack style, with TensorFlow checkpoints. README is one line. Mainly useful as a neural-policy baseline.
9. **[HPI-Poker/competition-2025](https://github.com/HPI-Poker/competition-2025)** (0). Official HPI Showdown 2025 repo with Python and C++ skeletons, Dockerised bots and a submission layout. Good reference for a sandboxed multi-language setup.
10. **[ixng/Poker-Bot-](https://github.com/ixng/Poker-Bot-)** (0). Warwick AI competition template. Single `myAI.py` file, a `poker/` engine, and example bots (`call`, `go_all_in`, `raise_by_pot`). Useful as a minimal, readable starting bot.

Honourable mentions: `mitpokerbots/scrimmage` (the scrimmage server, with a sandboxed build and run pipeline and ELO ladder), `jesusCaraball0/pokerbots-2025` (DQN trained against GTO bots), and `valkwek/Pokerbots` (a fork of the MIT engine with a chatbot player).

## Strategy matrix

| Category | What the repos do | Examples |
| --- | --- | --- |
| **Solvers / equilibrium** | MCCFR with blueprint and regret strategy, or precomputed ranges. Rare in student code because of time limits. | `pashneal/PokerBots2024` (MCCFR); `jesusCaraball0/pokerbots-2025` (DQN trained against GTO bots, not a solver itself) |
| **Neural policies** | RNN and DQN policies trained by self-play or against fixed bots. | `KanishkT123/PokerBot` (RNN, DeepStack style); `jesusCaraball0/pokerbots-2025` (DQN) |
| **Monte Carlo equity** | Sampling over opponent ranges with eval7 or a custom evaluator. The most common approach. | `abh-win/auction-poker-bot` (bounded MC, time-capped); `Bhavana-B-del/IITM-Pokerbots-2025` (100–200 iterations per street) |
| **Opponent modelling** | Beta-smoothed VPIP / PFR / aggression, archetype labels (nit, TAG, LAG, station, maniac), and range narrowing from observed actions. | `abh-win/auction-poker-bot` (five archetypes, range width mapped from stats); `Bhavana-B-del/IITM-Pokerbots-2025` (fold and aggression counters only) |
| **Auction / bidding** | Second-price bids for a hole card, sized against the opponent's empirical bid distribution. | `abh-win/auction-poker-bot` (marginal-EV bid); `Bhavana-B-del/IITM-Pokerbots-2025` (equity-scaled bid, low with premium hands) |
| **Preflop rules** | Static tiers (premium / strong / playable / trash) or percentile tables from heads-up equity. | `Bhavana-B-del/IITM-Pokerbots-2025` (tier sets); `abh-win/auction-poker-bot` (169-class table) |
| **Action abstraction** | Pot-fraction bet sizes; filter-based action sets to make changes easy. | `pashneal/PokerBots2024` (filter-based abstraction); `abh-win/auction-poker-bot` (pot fractions, SPR-based shoves) |
| **Fallbacks / safety** | Catch-all `except` returning 0.5 equity; illegal-action coercion; time-budget checks every 64 samples. | `Bhavana-B-del/IITM-Pokerbots-2025` (`_calculate_equity` falls back to 0.5); `abh-win/auction-poker-bot` (`game.cpp` coerces illegal actions) |

## Recurring weaknesses seen in these repos

These are observations from the code and README text, not measured head-to-head results, except where the arena table is cited.

1. **Fixed pot-odds thresholds.** `abh-win/auction-poker-bot` calls when equity is at least pot odds plus a margin, with the margin set from the opponent's aggression. The IITM bot uses fixed equity tiers instead. A fixed margin does not adapt to polarised bets, so it is a candidate weakness. Not measured here.
2. **Equity against a random range.** The IITM bot's Monte Carlo draws opponent hole cards uniformly, then only shifts the estimate by one revealed card. It ignores the betting history that the opponent model has already collected. A bot that narrows opponent ranges on the action it has seen will beat it in spots where the range matters.
3. **Preflop tiers as lookups.** The IITM bot classifies suited hands with a hand-tuned bump (`STRONG_HANDS` becomes `premium` when suited). Hand-coded tiers like this don't account for the opponent's actual range, so they are predictable.
4. **Auction bids that leak strength.** The IITM README says bidding too hard with strong hands gives the hand away, and the bot bids low with premiums to avoid that. A bot that always bids low with premiums is predictable, because the bid size itself reveals a premium hand.
5. **Trap play that is easy to read.** `Bhavana-B-del/IITM-Pokerbots-2025` deliberately calls with AA, KK, QQ and AK instead of re-raising. Against a bot that folds to large raises from this range, that is an exploitable pattern.
6. **Thin margins against all-in bidders without profiling.** In the `abh-win` arena table, the unprofiled variant (`main-noprofile`) beats `allin-bidder` by only +61.0 ± 35.9 chips over 40,000 hands, and wins 17 of 20 runs. The profiled main bot wins +2,002.0 ± 58.4 against the same opponent. Profiling is what keeps the margin large here.

## Exploit triggers worth testing in our own framework

These are hypotheses to check, not conclusions. Each needs a seeded test before anyone relies on it.

- **Bid-size tells.** If a bot bids below a fixed fraction of pot with premium hands, a bidder who detects that pattern can overbid to take the card when the bot is holding a strong hand.
- **Repeated trap calls.** A bot that calls with AA, KK, QQ and AK, but raises with everything else, can be exploited by a bet of about half the pot on every street when the board is dry.
- **Time-capped sampling.** `abh-win/auction-poker-bot` stops Monte Carlo at a sample count or a time budget. Whether that cap biases its equity under load has not been tested.
- **Overbet response.** Not verified in any repo read here. The hypothesis is that a flat call threshold under-calls overbets. This needs a test against an overbetting baseline before it goes into the framework.

## Notes for the CMQuant framework

The project has no poker-bot exploitation framework to compare against. The only exploit-style code is `scripts/verify-pokerminute.ts`, which simulates the Equalize exploit (hold one key and out-earn a careful player). Nothing in `lib/games/` or `components/poker/` models a bot. So the matrix above has no existing framework to map onto. If a bot-facing framework is meant to be built, these repos are the reference set for it.
