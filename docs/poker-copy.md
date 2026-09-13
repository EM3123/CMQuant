# Poker copy, all of it, in one place

Every word the poker wing shows a player. Rewrite anything here in place and
hand the file back — each block carries the file and the key it comes from, so
your version goes straight in without me guessing which string you meant.

Leave the `id:` lines alone. Everything under them is yours.

Two lines are legal guardrails rather than writing, and they are marked
**LOCKED**. They can be reworded but not removed or softened.

---

## 1. Poker Lab index — `app/poker/page.tsx`

**id: index.h1**
> Poker Lab

**id: index.standfirst** — sits beside the heading. **LOCKED** (first sentence)
> Nothing here is played for money. Every number is enumerated rather than
> sampled, and the hand ranking is checked against all 2,598,960 five-card
> hands.

**id: index.row.pot**
> Break-even probability from a pot and a bet

**id: index.row.outs**
> Count the cards that still save the hand

**id: index.row.combos**
> How many ways a hand can still be dealt

**id: index.row.equity** — not built yet, shows as Phase 2
> Run the hand out against a range

---

## 2. Pot Odds

### Intro screen — `components/potodds/PotOddsGame.tsx`

**id: pot.eyebrow**
> Poker Lab / Probability in Practice

**id: pot.title**
> Pot Odds

**id: pot.blurb** — rewritten, live
> You are facing a bet and deciding whether to call. The question is how often
> you need to win for that call to break even, and the answer is the amount you
> are calling divided by the pot as it will stand after your money is in it.
> Most people divide by the pot before their call, which quietly makes the price
> look worse than it is.

**id: pot.start** — the button
> Deal

**id: pot.keys**
> Keys 1 – 4. Space to deal. A wrong answer costs two seconds.

**id: pot.learnlink**
> How this works

### In play

**id: pot.prompt** — under the table, above the four answers
> How often do you need to win for that call to break even?

**id: pot.tape** — the line along the bottom during a run
> Your call goes into the pot you are trying to win.

**id: pot.betlabel** — printed under the villain's chips
> They bet

### Mistakes — `lib/games/potodds.ts`

Each wrong answer is a specific error. The label is the headline on the results
screen; the fix is the sentence under it.

**id: pot.mistake.forgotcall.label**
> Left your own call out of the pot

**id: pot.mistake.forgotcall.fix**
> The pot you are trying to win already contains the chips you are about to put
> in. Divide by pot + their bet + your call.

**id: pot.mistake.rawratio.label**
> Used the raw bet-to-pot ratio

**id: pot.mistake.rawratio.fix**
> Bet divided by pot is the price in pot-sized terms, not a probability. The
> denominator has to be the whole pot after the call.

**id: pot.mistake.double.label**
> Counted your call twice

**id: pot.mistake.double.fix**
> Your call goes in once. The denominator is pot + bet + call, not
> pot + bet + call + call.

---

## 3. Outs

### Intro screen — `components/outs/OutsGame.tsx`

**id: outs.eyebrow**
> Poker Lab / Probability in Practice

**id: outs.title**
> Outs

**id: outs.blurb** — rewritten, live
> Six cards are visible, your two and the four on the board, which leaves
> forty-six you have not seen and one still to come. Count how many of those
> forty-six complete the hand named in the question. Every answer is an exact
> count rather than an approximation, so the 2x and 4x shortcuts will not get
> you there.

**id: outs.start**
> Deal

**id: outs.keys**
> Keys 1 – 4. A wrong answer costs two seconds.

### In play

**id: outs.prompt** — `{target}` is filled in with the hand being drawn to
> One card to come. How many of the 46 you cannot see give you **{target}** or
> better?

### Mistakes — `lib/games/outs.ts`

**id: outs.mistake.exactonly.label**
> Counted only the cards that make exactly that hand

**id: outs.mistake.exactonly.fix**
> A card that makes something better still saves the hand. Count everything that
> reaches the target or passes it.

**id: outs.mistake.familiar.label**
> Used a memorised count from a different draw

**id: outs.mistake.familiar.fix**
> Nine for a flush draw and eight for an open-ender are worth knowing, but they
> are answers to specific board textures. Count this board.

---

## 4. Combinatorics

### Intro screen — `components/combinatorics/CombinatoricsGame.tsx`

**id: combos.eyebrow**
> Poker Lab / Probability in Practice

**id: combos.title**
> Combinatorics

**id: combos.blurb** — rewritten, live
> There are four aces, and any two of them make pocket aces, which gives six
> combinations before any other card is known. Put one ace on the board and only
> three aces remain, so the count falls from six to three, because half the
> pairings that were available no longer exist. The work is counting what
> survives once cards are removed.

**id: combos.start**
> Deal

**id: combos.keys**
> Keys 1 – 4. A wrong answer costs two seconds.

### In play

**id: combos.prompt** — `{holding}` is e.g. "pocket aces" or "ace-king suited"
> How many combinations of **{holding}** can still be dealt?

### Mistakes — `lib/games/combinatorics.ts`

**id: combos.mistake.blockers.label**
> Counted the full deck and forgot the board

**id: combos.mistake.blockers.fix**
> Every card on the board is a card nobody can be holding. Subtract it before
> you count, not after.

**id: combos.mistake.shape.label**
> Used the count for a different shape of hand

**id: combos.mistake.shape.fix**
> A pair is six combinations, two ranks suited is four, and offsuit is twelve.
> Check which one you were asked for.

---

## 5. Explainer: Pot odds — `app/learn/pot-odds/page.tsx`

**id: learn.pot.title**
> Pot odds

**id: learn.pot.standfirst**
> Someone bets. Before you can decide anything, you need the price you are being
> offered — the share of the time you must win for calling to break even.

### Section: The question

**id: learn.pot.s1.h**
> The question

**id: learn.pot.s1.p1**
> A call costs you chips now and pays you the pot later. Break-even is the point
> where those two cancel out: win often enough and calling makes money, win less
> often and it burns money. The number you want is that threshold.

**id: learn.pot.s1.p2**
> It has one form and it never changes:

**id: learn.pot.s1.formula**
> break-even = call ÷ (pot after your call)

**id: learn.pot.s1.p3**
> Everything difficult about this is in the denominator, and everything people
> get wrong is in the denominator too.

### Section: A worked example

**id: learn.pot.s2.h**
> A worked example

**id: learn.pot.s2.p1**
> The pot is 800. Your opponent bets 400. You have to put in 400 to continue.

**id: learn.pot.s2.p2**
> Three things are going into that pot, so add all three:

**id: learn.pot.s2.table** — the labels only, the numbers are 800 / 400 / 400 / 1,600
> pot already there · their bet · your call · pot you are playing for

**id: learn.pot.s2.p3**
> Then the price is your call against that total:

**id: learn.pot.s2.formula**
> 400 ÷ 1,600 = 25%

**id: learn.pot.s2.p4**
> You need to win at least a quarter of the time. Above that, calling makes
> money. Below it, folding does.

### Section: The shortcut worth having

**id: learn.pot.s3.h**
> The shortcut worth having

**id: learn.pot.s3.p1**
> At a table you will not be doing long division. What you actually learn is the
> handful of bet sizes people use, because each one has a fixed answer no matter
> how big the pot is.

**id: learn.pot.s3.table** — labels only; the values are 17 / 25 / 29 / 33 / 40%
> quarter-pot bet · half-pot bet · two-thirds pot · pot-sized bet · double the pot

**id: learn.pot.s3.p2**
> Notice how little the answer moves. A bet eight times larger than another only
> shifts the threshold from 17% to 40%, which is why big bets are less punishing
> than they feel and small bets are harder to fold to than they look.

### Section: The three ways to get it wrong

**id: learn.pot.s4.h**
> The three ways to get it wrong

**id: learn.pot.s4.p1**
> The game's wrong answers are not random numbers. Each one is a specific error,
> so when you miss, the results screen can tell you which of these you did.

**id: learn.pot.s4.m1.h**
> Leaving your own call out of the pot

**id: learn.pot.s4.m1.body**
> The most common one by far. Using 800 + 400 = 1,200 instead of 1,600 gives 33%
> rather than 25%, and makes every call look worse than it is. The chips you put
> in are part of the pot you win.

**id: learn.pot.s4.m2.h**
> Using the raw bet-to-pot ratio

**id: learn.pot.s4.m2.body**
> 400 ÷ 800 = 50% is a description of the bet size, not a probability. It is a
> useful number for a different purpose and it is never the break-even point.

**id: learn.pot.s4.m3.h**
> Counting your call twice

**id: learn.pot.s4.m3.body**
> Adding the call to a total that already contains it gives 2,000 and an answer
> of 20%. Your money goes in once.

### Section: What this does not tell you

**id: learn.pot.s5.h**
> What this does not tell you

**id: learn.pot.s5.p1**
> Pot odds give you a threshold, not a decision. To act on it you also need some
> sense of how often you actually win, which is what counting outs is for. The
> two together are the whole calculation: this is the price, that is whether you
> can pay it.

---

## 6. Explainer: Outs — `app/learn/outs/page.tsx`

**id: learn.outs.title**
> Outs

**id: learn.outs.standfirst** — currently set in the page header
> How to count the cards that still save a hand, and how to turn that count into
> a probability.

### Section: counting

**id: learn.outs.s1.p1**
> There are 52 cards. You can see six of them — your two and the four on the
> board — which leaves 46 you cannot. An out is one of those 46 that gets you
> where you need to go.

**id: learn.outs.s1.p2**
> Say you are holding two hearts and two more are on the board:

**id: learn.outs.s1.p3**
> Thirteen hearts exist. You are looking at four of them, so nine are
> unaccounted for. That is the number.

**id: learn.outs.s1.formula**
> 13 hearts − 4 you can see = 9 outs

**id: learn.outs.s1.p4**
> The counting is always this literal. Work out which cards finish the hand,
> then subtract the ones already face up.

### Section: the counts worth memorising

**id: learn.outs.s2.table** — labels only; values are 9 / 8 / 4 / 6 / 7
> flush draw · open-ended straight draw · gutshot straight draw · two overcards ·
> set to a full house or better

**id: learn.outs.s2.p1**
> A few board textures come up constantly, and knowing them saves you the
> arithmetic every time.

**id: learn.outs.s2.p2**
> Learn them, then be suspicious of them. They are answers to specific board
> textures, and reaching for one without checking the board in front of you is
> the second-most-common way to be wrong.

### Section: turning a count into a probability

**id: learn.outs.s3.p1**
> A count is not yet a decision. With one card still to come, each out is worth
> roughly two percent:

**id: learn.outs.s3.formula**
> chance of hitting ≈ outs × 2%

**id: learn.outs.s3.p2**
> Nine outs is about 18%. Eight is about 16%. Four is about 8%. The real numbers
> are a shade higher — nine outs out of 46 unseen cards is 19.6% — so the
> shortcut is slightly pessimistic, which is the right direction for a shortcut
> to err.

**id: learn.outs.s3.p3**
> Now the two halves meet. If a half-pot bet needs you to win 25% of the time
> and your flush draw gets there 18% of the time, the call loses money. Nine
> outs is not enough at that price. Against a quarter-pot bet, needing 17%, the
> same draw is a call.

**id: learn.outs.s3.table** — labels only; values are 25% / 18% / fold
> price you are offered · chance you get there · verdict

### Section: the two ways to get it wrong

**id: learn.outs.s4.p1**
> As with Pot Odds, the wrong answers in the game are specific errors rather
> than arbitrary numbers, so a miss tells you something.

**id: learn.outs.s4.m1.body**
> If you are drawing to a straight and the board pairs your ace, the card that
> makes you trips also saves the hand. Anything that reaches the target or
> passes it counts, so count the improvements you did not plan for.

**id: learn.outs.s4.m2.body**
> Nine is the answer for a flush draw with four suited cards visible. It is not
> the answer for a flush draw where one of your suit is already on the board
> twice over, or for a board that is not a flush draw at all. Count the board in
> front of you.

### Section: what the count does not tell you

**id: learn.outs.s5.p1**
> Every out here is a card that improves your hand. Whether the improved hand
> actually wins is a different question, and it depends on what the other player
> has. A flush that arrives on a paired board can be second best. Treat the
> count as an upper bound on how often you are saved, then discount it for the
> times you improve and still lose.

---

## 7. Explainer: Combinatorics — `app/learn/combinatorics/page.tsx`

**id: learn.combos.title**
> Combinatorics

**id: learn.combos.standfirst**
> "They might have aces" is a feeling. "There are three combinations of aces
> left and nine of ace-king" is a number, and the difference between the two is
> a subtraction anyone can do.

### Section: Three shapes, three numbers

**id: learn.combos.s1.h**
> Three shapes, three numbers

**id: learn.combos.s1.p1**
> Before any cards are dealt, every hand has a fixed number of combinations, and
> there are only three answers to remember.

**id: learn.combos.s1.table** — labels only; values are 6 / 4 / 12 / 16
> a pocket pair · two ranks, suited · two ranks, offsuit · two ranks, any suits

**id: learn.combos.s1.p2**
> A pair is six because you are choosing two cards from four, and there are six
> ways to do that. Two different ranks is four suits times four suits, which is
> sixteen — of which four are suited and the other twelve are not.

**id: learn.combos.s1.p3**
> That last line is worth sitting with. Offsuit hands are three times as common
> as suited ones, which is why an opponent turning up with suited connectors
> feels rarer than it is unfair.

### Section: Then the board takes cards away

**id: learn.combos.s2.h**
> Then the board takes cards away

**id: learn.combos.s2.p1**
> Every card face up is a card nobody is holding. That is the whole idea, and it
> is called card removal or blocking.

**id: learn.combos.s2.p2**
> There is an ace on that board, so only three aces remain. Choosing two from
> three gives three combinations, not six.

**id: learn.combos.s2.table** — labels only; values are 6 / 3
> pocket aces, before the flop · pocket aces, on this board

**id: learn.combos.s2.p3**
> Half of the hands you were worried about stopped existing when the flop came
> down. Nothing about your opponent changed; the deck did.

### Section: Why this decides hands

**id: learn.combos.s3.h**
> Why this decides hands

**id: learn.combos.s3.p1**
> Counting one hand is arithmetic. Counting two and comparing them is the part
> that wins pots.

**id: learn.combos.s3.p2**
> On that same ace-high board, suppose you can only beat ace-king and you lose
> to aces. Aces are down to three combinations. Ace-king is now three remaining
> aces times four kings, which is twelve — and if you hold a king yourself, nine.

**id: learn.combos.s3.table** — labels only; values are 3 / 9 / "9 in 12, or 75%"
> combinations that beat you · combinations you beat · you are ahead

**id: learn.combos.s3.p3**
> That 75% is the number that goes into pot odds. Combinations are how a read
> becomes a probability, and pot odds are what you do with it.

### Section: The two ways to get it wrong

**id: learn.combos.s4.h**
> The two ways to get it wrong

**id: learn.combos.s4.m1.h**
> Counting the full deck and forgetting the board

**id: learn.combos.s4.m1.body**
> Answering six for pocket aces on an ace-high board is the single most common
> slip, and it doubles your estimate of the hands that beat you. Subtract the
> board before you count, not after.

**id: learn.combos.s4.m2.h**
> Using the count for a different shape

**id: learn.combos.s4.m2.body**
> Six, four and twelve are easy to swap under time pressure. Check whether you
> were asked for a pair, for suited, or for offsuit before you reach for a
> number.

### Section: What the count does not include

**id: learn.combos.s5.h**
> What the count does not include

**id: learn.combos.s5.p1**
> Combinations tell you how many ways a hand can exist, not how likely somebody
> is to be holding it. Nobody plays every hand they are dealt, so a range is
> combinations filtered by whether a person would actually have played that way.
> The counting comes first because it is the part that is objectively true; the
> filtering is judgement, and judgement applied to a wrong count is just a
> confident mistake.

---

## 8. Shared, appears on every poker page — `components/SiteFooter.tsx`

**id: footer.simulated** — **LOCKED**
> Simulated cards only. Nothing can be wagered here and nothing can be cashed
> out.

**id: footer.unaffiliated** — **LOCKED**
> CMQuant is a student-built project and is not affiliated with or endorsed by
> Carnegie Mellon University.

**id: footer.cm**
> CM stands for Computational Mathematics.

---

## Notes for whoever rewrites this

Three things the copy is currently doing that are worth keeping or breaking on
purpose rather than by accident.

**Every explainer ends with what the thing does not tell you.** Pot odds gives a
threshold and not a decision, an out is a card that improves your hand and not
one that wins it, a combination count is not a range. That is the section that
separates this from every other poker tutorial, and it is also the section
easiest to cut for length.

**The mistake text is load-bearing.** Those labels and fixes are wired to actual
wrong answers the generator produces on purpose, and they appear on the results
screen naming what you did. If a label stops describing the error it is attached
to, the results screen starts lying.

**Numbers in the prose are checked.** 2,598,960 hands, 46 unseen cards, 19.6%,
the 6/4/12 combination counts, the 17/25/29/33/40 price table — all of those are
computed or enumerated somewhere in the repo. Change the words freely; tell me
if you want to change a number and I will re-derive it rather than take it out.
