import type { Metadata } from "next";
import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy — CMQuant",
  description: "What CMQuant stores, what it does not, and who can see it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="8 September 2026">
      <p>
        CMQuant has no accounts, no sign-up and no analytics. Nothing you do
        here is sent to us, because there is no server of ours to send it to.
        This page describes what that means concretely rather than in the usual
        language.
      </p>

      <H2>What is stored, and where</H2>
      <p>
        Your personal bests and your daily-challenge result are written to{" "}
        <code className="text-primary">localStorage</code> in your own browser.
        They stay on the device you played on. They are not uploaded, not backed
        up, and not readable by us or by anyone else. Clearing your browser data
        deletes them permanently and we cannot restore them.
      </p>
      <p>The complete list of what gets written:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <code className="text-primary">cmquant:&lt;game&gt;:best</code> — your
          highest score in each game, as a number.
        </li>
        <li>
          <code className="text-primary">cmquant:daily:&lt;date&gt;</code> — the
          score, accuracy and streak from your daily attempt.
        </li>
      </ul>
      <p>
        That is everything. No name, no email, no device identifier, nothing that
        identifies you.
      </p>

      <H2>Cookies</H2>
      <p>
        CMQuant sets no cookies. It uses browser storage, which is a different
        mechanism with the same practical effect: data kept on your device.
        Because none of it is transmitted, used for advertising, or shared with
        anyone, there is no consent banner. If that ever changes — most likely by
        adding advertising — a consent step will land at the same time, not
        after.
      </p>

      <H2>Third parties</H2>
      <p>
        The site loads no third-party scripts, no trackers and no external fonts.
        Fonts are downloaded at build time and served from the same domain, so
        your browser never contacts anyone else while you play.
      </p>
      <p>
        The site is hosted on Vercel, which keeps standard server request logs.
        Those logs include IP addresses and are held by Vercel under their own
        privacy terms. We do not read them, query them, or connect them to
        anything you do in a game.
      </p>

      <H2>Children</H2>
      <p>
        CMQuant is built for university students and is not directed at children
        under 13. We collect no information from anyone, which includes them.
      </p>

      <H2>If any of this changes</H2>
      <p>
        Two changes on the roadmap would move real data off your device:
        accounts for the campus leaderboard, and a subscription. Neither exists
        yet. When either ships, this page changes before it does, and it will say
        plainly what is collected and why.
      </p>

      <H2>Standing</H2>
      <p>
        CMQuant is a student-built project and is not affiliated with or endorsed
        by Carnegie Mellon University. It is not a legal document drafted by a
        lawyer; it is an honest description of a site that currently collects
        nothing. Questions go to the project owners.
      </p>
    </LegalPage>
  );
}
