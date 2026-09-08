import type { Metadata } from "next";
import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms — CMQuant",
  description: "The terms you accept by using CMQuant.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="8 September 2026">
      <p>
        CMQuant is a free set of timed practice games. Using the site means
        accepting what follows.
      </p>

      <H2>The poker wing is not gambling</H2>
      <p>
        Poker Lab teaches probability using simulated cards. There is nothing to
        deposit and nothing to withdraw. No money, prize, credit or virtual
        currency of any kind changes hands, and no score can be redeemed for
        anything. The cards exist so that probability has something concrete to
        attach to.
      </p>

      <H2>Scores</H2>
      <p>
        Scores are calculated in your browser and stored on your device, which
        means they can be edited by anyone willing to open developer tools. They
        are for your own practice and for arguments with your friends. Any
        leaderboard built on this basis will say clearly whether it is validated,
        and until a score is validated on a server it should be treated as
        entertainment.
      </p>

      <H2>Use of the site</H2>
      <p>
        Play as much as you like. Do not attempt to disrupt the service for other
        people, and do not present CMQuant as something it is not — a product of
        Carnegie Mellon University, or a gambling service.
      </p>

      <H2>No warranty</H2>
      <p>
        The site is provided as it is, with no guarantee that it will be
        available, correct or preserved. Question generators are tested heavily
        and every answer is checked against an independent recount, but this is a
        student project rather than an examined reference. Do not rely on it for
        anything that matters.
      </p>

      <H2>Trademarks</H2>
      <p>
        CMQuant is a student-built project and is not affiliated with or endorsed
        by Carnegie Mellon University. CM stands for Computational Mathematics.
        The site uses colours drawn from a public palette and none of the
        university&apos;s trademarks, names or logos.
      </p>

      <H2>Changes</H2>
      <p>
        These terms will change when accounts, a leaderboard or a subscription
        arrive. The date at the top of this page is the version you are reading.
      </p>
    </LegalPage>
  );
}
