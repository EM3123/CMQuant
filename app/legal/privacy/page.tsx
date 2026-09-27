import type { Metadata } from "next";
import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy — CMQuant",
  description: "What CMQuant stores, what it does not, and who can see it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="27 September 2026">
      <p>
        CMQuant has no analytics and no advertising. You can play every game
        without an account, and if you do, nothing you do here is sent to us.
        Accounts are optional and exist for one reason: saving your runs so
        they can appear on leaderboards. This page describes what each of those
        means concretely rather than in the usual language.
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
        Without an account, that is everything. No name, no email, no device
        identifier, nothing that identifies you.
      </p>

      <H2>If you create an account</H2>
      <p>
        Signing in is done with a one-time code sent to your email. Accounts
        are stored with Supabase, the database service CMQuant uses, and hold:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong className="text-primary">Your email address</strong>, used
          only to send you sign-in codes. It is never shown to other players
          and never used for anything else — no newsletters, no marketing.
        </li>
        <li>
          <strong className="text-primary">Your username</strong>, which you
          choose. It is public, because leaderboards show it.
        </li>
        <li>
          <strong className="text-primary">Your saved runs</strong>: which
          game, the seed, your score, how many you got right out of how many,
          your best streak, and when. These are public, because leaderboards
          are built from them. Assisted runs are never saved.
        </li>
      </ul>
      <p>
        While you are signed in, your browser keeps a sign-in token in{" "}
        <code className="text-primary">localStorage</code> (a key starting{" "}
        <code className="text-primary">sb-</code>). Signing out removes it.
      </p>
      <p>
        You can delete your account at any time from the account page. That
        removes your email, your username and every saved run at once, and it
        cannot be undone.
      </p>

      <H2>Cookies</H2>
      <p>
        CMQuant sets no cookies, with or without an account. It uses browser
        storage, which is a different mechanism with the same practical effect:
        data kept on your device. None of it is used for advertising or shared
        with anyone, so there is no consent banner. If that ever changes — most likely by
        adding advertising — a consent step will land at the same time, not
        after.
      </p>

      <H2>Third parties</H2>
      <p>
        The site loads no third-party scripts, no trackers and no external fonts.
        Fonts are downloaded at build time and served from the same domain. The
        one outside service your browser talks to is Supabase, and only for
        account actions: signing in, choosing a username, and saving a run
        while you are signed in. Signed out, your browser never contacts anyone
        else while you play.
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
        under 13. Please do not create an account if you are under 13. If we
        learn that an account belongs to someone under 13, we will delete it.
      </p>

      <H2>If any of this changes</H2>
      <p>
        The next change on the roadmap that would move more data off your
        device is a subscription. It does not exist yet. When it ships, this
        page changes before it does, and it will say plainly what is collected
        and why.
      </p>

      <H2>Standing</H2>
      <p>
        CMQuant is a student-built project and is not affiliated with or endorsed
        by Carnegie Mellon University. It is not a legal document drafted by a
        lawyer; it is an honest description of what the site collects, which
        without an account is nothing. Questions go to the project owners.
      </p>
    </LegalPage>
  );
}
