"use client";

import Link from "next/link";
import { useAccount } from "@/lib/accounts/client";

/**
 * The nav entry for accounts. Renders nothing until accounts are switched on,
 * and nothing while the stored session is being read, so a signed-in player
 * never sees "Sign in" flicker past on the way to their name.
 */
export function AccountLink() {
  const account = useAccount();
  if (account.status === "disabled" || account.status === "loading") return null;

  const label =
    account.status === "signed-out" ? "Sign in" : (account.username ?? "Account");

  return (
    <Link href="/account" className="transition-colors hover:text-primary">
      {label}
    </Link>
  );
}
