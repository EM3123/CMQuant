# Pokerbot strategy library and opponent-observation plan

Prep for the No Limit pokerbot tournament (Sequoia, Citadel Securities, OpenAI). The variant has not been published in what we have, so everything here is written to transfer across variants. Thresholds are starting guesses to be tuned in a local arena, not measured values.

## 1. Vetted public repos

Read these for ideas. Most have no license, so do not copy code into a submission without checking the tournament rules and asking the authors.

| Repo | What it is | Why it matters | License |
| --- | --- | --- | --- |
| [anantjain29/iit-pokerbots-2026](https://github.com/anantjain29/iit-pokerbots-2026) | 2nd overall of 400+ teams, IIT PokerBots 2026. Prelims and finals bots, experiments, and tournament tooling. | Strongest evidence of competitive play in the set. The bot-experiment layout (`bot_equity`, `bot_opponent`, `bot_pass_trap`, `bot_meta`) is close to the multi-strategy design we want. | none |
| [kartikya2207/poker__bot_engine_kartikya](https://github.com/kartikya2207/poker__bot_engine_kartikya) | IIT 2026 Sneak Peek bot. 169-class preflop table, 60-sample Monte Carlo, per-street cache. | Concrete example of a fast equity engine that fits a per-decision budget. | none |
| [Aravind-Ramana/IIT_Pokerbots_2026](https://github.com/Aravind-Ramana/IIT_Pokerbots_2026) | 5th place, IIT 2026 prelims and finals. | Adaptive bid factor and "conservative bidding for weak hands" logic. | none |
| [christinedong0103-commits/texas-holdem-bot](https://github.com/christinedong0103-commits/texas-holdem-bot) | Quadrature Fullhouse Hackathon bot. Pipeline of policy adjustments, opponent labels `MANIAC / STATION / NIT / TAG / PASSIVE`, and deterministic sampling from a state hash. | The clearest opponent-labelling scheme in the set, and the policy-pipeline pattern fits "pick a preloaded strategy." | none |
| [juanorbea/pokerbot](https://github.com/juanorbea/pokerbot) | MIT 2026 bot. Uses MIT's three reference bots as a ladder: toss-smallest, good-cards, Monte Carlo. | The reference ladder is a ready-made opponent set for the local arena. | none |
| [fabianruiz3/pokerbots-2026](https://github.com/fabianruiz3/pokerbots-2026) | MIT 2026 "Camello" bot. CFR-trained, with a documented week-by-week iteration log. | Shows which early ideas failed. | none |
| [amalkoch/pokerbot-lab](https://github.com/amalkoch/pokerbot-lab) | Offline Kuhn-poker practice arena, seeded, with decision-latency benchmarks. | Small and dependency-free. Good for testing the observation logic before the big arena exists. | none |
| [sharvuncle/pokerlab-research-showcase](https://github.com/sharvuncle/pokerlab-research-showcase) | Research write-up. Finds that a conservative imitation reference is extremely passive in six-player preflop, and that a position-aware aggression overlay improves results. | Direct evidence for the "conservative bots are exploitable" hypothesis. Read the limitations doc first. | none |
| [LucasColas/Poker-AI](https://github.com/LucasColas/Poker-AI) | Python agents (probability, Monte Carlo, outs) plus clustering of player types. | Only repo here with explicit player-type clustering. | GPL-3.0 |
| [PokerBotAI/awesome-poker-ai](https://github.com/PokerBotAI/awesome-poker-ai) | Curated list of papers, solvers and frameworks. | Index for finding more. Its "AI Poker Bots" section is mostly commercial rooms bots, which are out of scope. | none |

Excluded on purpose, not evaluated: repos built to play real-money rooms or to evade detection (`dustij/texas-holdem-bot`, `appleweed/pokerbotsallstars`, `gianlucaio/PokerBotStealther`, `Adrak2006/monopoly-poker-ai-bot`), and the commercial bot vendors in the awesome list. A tournament bot does not need any of that.

**Variant caveat.** The IIT repos play Sneak Peek or Anaconda Hold'em, and the MIT repos play Toss'em. Only the generic parts transfer: equity code, preflop tables, the opponent-stat tracker, legal-action handling. Do not copy variant-specific strategy.

## 2. Preloaded strategies

Each strategy is a fixed policy with a target bias and a signature that triggers it. Switching is a table lookup, so it fits the per-decision budget.

| ID | Strategy | Target bias (the opponent is...) | Signature to trigger | What we do |
| --- | --- | --- | --- | --- |
| S0 | **Baseline** | none | default, or insufficient data | Tight-aggressive preflop chart. Bet for value, bluff rarely. Mixed sizes so we are not readable. |
| S1 | **Blind stealer** | over-folds (nit, passive) | fold-to-bet above ~60% on flop, low VPIP | Open wider, c-bet dry boards, bluff scare cards, steal blinds. |
| S2 | **Value-only** | calls too much (station) | fold-to-bet below ~25%, high call frequency | Value-bet thinner and bigger. Never bluff. Check back marginal hands. |
| S3 | **Trap and call-down** | bets and shoves too much (maniac, all-in) | high aggression factor, frequent all-ins | Call lighter, trap strong hands with check-call, avoid bluffing into shoves. |
| S4 | **Overbet punisher** | folds to large bets | fold-to-overbet above ~70% | Bluff big on the river with polar ranges. Fold our own bluff-catchers to small bets. |
| S5 | **Fallback exploit** | does not adapt, or times out | identical action in most spots, or illegal or missing actions | Play a fixed, simple counter. Do not chase a read we can't trust. |

Thresholds are starting hypotheses. Tune them in the arena before the event.

## 3. Observation protocol for the first two rounds

The paste says each round weighs more than the last, so the first two rounds are the cheapest place to learn and the later rounds are where the exploit pays.

1. **Hands 1–200 of round 1: pure observation.** Play S0 and record, per opponent, VPIP, PFR, fold-to-bet by street, fold-to-overbet, call frequency by bet size, all-in frequency, showdown strength, and illegal or timed-out actions.
2. **Smoothing.** Use a Beta prior, for example Beta(2, 2), so one hand cannot flip a label. Require about 30 observations on a stat before it can trigger a switch.
3. **Hysteresis.** A signature must hold in two consecutive windows of 100 hands before we switch. This stops the bot from flipping on noise.
4. **Per-opponent tracking.** If the engine identifies opponents, keep stats per opponent. If it does not, keep stats per match and reset at each new opponent.
5. **Rounds 2 to 6: exploit.** Use the triggered strategy. Keep a running check on the stats so we can drop back to S0 if the opponent adapts.
6. **Logging.** Write one line per decision for the post-round review, so we can check which signature fired and whether the switch paid.

**Risk.** An early switch can lose more than it wins. S0 is the safe default, and the bot should stay on it until the signature clears the thresholds above.

## 4. What to test in the local arena before the event

- Each strategy against each baseline in duplicate matches with seats swapped: all-in, calling station, nit, maniac, and MIT's reference bots from `juanorbea/pokerbot`.
- Whether the observation step picks the correct label against each baseline, measured as label accuracy after 200 hands and after 1,000 hands.
- Decision latency for the switch logic under load, against the 1 ms budget.
- Whether a switch ever costs chips against an opponent that does not adapt, which tests the hysteresis.

## 5. Open questions for the team

- Which opponents will we see, and will the engine tell us their identity?
- How many hands make up a round? The paste says thousands of games in total. Round length sets how long observation can run.
- Does the tournament allow us to use these public repos as reference, and do the rules say anything about shared code?
