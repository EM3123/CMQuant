"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Label } from "@/components/Wing";
import { USERNAME_PATTERN } from "@/lib/accounts/config";
import {
  accessToken,
  getSupabase,
  refreshProfile,
  useAccount,
} from "@/lib/accounts/client";

/**
 * Sign in with an emailed six-digit code, then pick a username.
 *
 * A code rather than a magic link, deliberately: a link has to come back to a
 * URL Supabase has been told to trust, which every Vercel preview deploy is
 * not, and it breaks the common case of reading mail on a phone while playing
 * on a laptop. A code works from anywhere.
 */
export function AccountPanel() {
  const account = useAccount();

  if (account.status === "disabled") {
    return (
      <Frame title="Accounts">
        <p className="text-[12px] leading-relaxed text-secondary">
          Accounts are not switched on yet. Every game still works without one,
          and your personal bests stay in this browser.
        </p>
      </Frame>
    );
  }

  if (account.status === "loading") {
    return (
      <Frame title="Accounts">
        <p className="text-[12px] text-muted">Checking for a saved session…</p>
      </Frame>
    );
  }

  if (account.status === "signed-out") return <SignIn />;

  return (
    <Frame title="Your account">
      <p className="text-[12px] leading-relaxed text-secondary">
        Signed in as <span className="text-primary">{account.email}</span>. Your
        email is never shown to anyone; leaderboards show your username.
      </p>
      <UsernameForm userId={account.userId} current={account.username} />
      <AccountActions />
    </Frame>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSentTo(address);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !sentTo) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: sentTo,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    // On success the auth listener flips the page to the signed-in view.
    if (error) setError(error.message);
  }

  if (!sentTo) {
    return (
      <Frame title="Sign in">
        {/* What it does TODAY. This said "get on the leaderboards", and
            there is no leaderboard - the page was selling a feature that does
            not exist, which is the one thing a sign-up screen cannot do. */}
        <p className="text-[12px] leading-relaxed text-secondary">
          Every finished run is saved to your account, so clearing your browser
          no longer wipes your history. Leaderboards are being built and are not
          live yet. Enter your email and we will send you a six-digit code. No
          password, and a new account is made the first time you sign in.
        </p>
        <form onSubmit={sendCode} className="mt-5 flex flex-col gap-3">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Submit busy={busy}>Send code</Submit>
        </form>
        <ErrorLine message={error} />
      </Frame>
    );
  }

  return (
    <Frame title="Check your email">
      <p className="text-[12px] leading-relaxed text-secondary">
        We sent a code to <span className="text-primary">{sentTo}</span>. It
        can take a minute to arrive; check spam if it does not.
      </p>
      <form onSubmit={verify} className="mt-5 flex flex-col gap-3">
        <Field
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 10))}
          required
        />
        <Submit busy={busy}>Sign in</Submit>
      </form>
      <ErrorLine message={error} />
      <button
        onClick={() => {
          setSentTo(null);
          setCode("");
          setError(null);
        }}
        className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-primary"
      >
        Use a different email
      </button>
    </Frame>
  );
}

function UsernameForm({ userId, current }: { userId: string; current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const username = value.trim().toLowerCase();
    setSaved(false);
    if (!USERNAME_PATTERN.test(username)) {
      setError("3 to 20 characters: lowercase letters, digits and underscores.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("profiles").upsert({ id: userId, username });
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "That username is taken." : error.message);
      return;
    }
    setSaved(true);
    await refreshProfile();
  }

  return (
    <form onSubmit={save} className="mt-6 flex flex-col gap-3 border-t border-hairline pt-5">
      {!current && (
        <p className="text-[12px] leading-relaxed text-rare">
          Pick a username to appear on leaderboards.
        </p>
      )}
      <Field
        label="Username"
        autoComplete="username"
        value={value}
        onChange={(v) => setValue(v.toLowerCase())}
        required
      />
      <Submit busy={busy}>{current ? "Change username" : "Save username"}</Submit>
      {saved && <p className="text-[11px] text-data-pos">Saved.</p>}
      <ErrorLine message={error} />
    </form>
  );
}

function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    await getSupabase()?.auth.signOut();
  }

  async function deleteAccount() {
    setError(null);
    const token = await accessToken();
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError("Could not delete the account. Try again, or sign out and back in first.");
      return;
    }
    await getSupabase()?.auth.signOut();
  }

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-hairline pt-5">
      <button
        onClick={signOut}
        className="rounded-control border border-hairline-strong px-6 py-3 text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
      >
        Sign out
      </button>
      {confirming ? (
        <div className="border border-data-neg/60 px-4 py-3">
          <p className="text-[12px] leading-relaxed text-secondary">
            This deletes your account, username and every saved run. It cannot
            be undone.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={deleteAccount}
              className="text-[10px] uppercase tracking-[0.18em] text-data-neg hover:text-primary"
            >
              Delete everything
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-[10px] uppercase tracking-[0.18em] text-muted hover:text-primary"
            >
              Keep my account
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-data-neg"
        >
          Delete account
        </button>
      )}
      <ErrorLine message={error} />
      <p className="text-[10px] leading-relaxed text-muted">
        What is stored and who can see it:{" "}
        <Link href="/legal/privacy" className="underline hover:text-primary">
          privacy
        </Link>
        .
      </p>
    </div>
  );
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-hairline-strong">
      <div className="border-b border-hairline px-4 py-2">
        <Label>{title}</Label>
      </div>
      <div className="px-5 py-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "email" | "text";
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular rounded-control border border-hairline-strong bg-surface-sunken px-3 py-2.5 text-sm text-primary outline-none focus:border-accent-ink"
      />
    </label>
  );
}

function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="rounded-control border border-hairline-strong px-6 py-3 text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink disabled:opacity-50"
    >
      {busy ? "…" : children}
    </button>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-3 text-[11px] leading-relaxed text-data-neg">{message}</p>;
}
