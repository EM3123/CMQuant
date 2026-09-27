// Accounts are off until the Supabase keys exist.
//
// Same shape as the ads flag: with the variables unset, nothing account-shaped
// renders and nothing talks to the network, so the site is exactly what it was.
// docs/accounts.md says where the values come from.
//
// NEXT_PUBLIC_ values are inlined at build time, so adding them in Vercel only
// takes effect on the next deploy.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const ACCOUNTS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Lowercase letters, digits and underscores, 3 to 20 long. The database
 *  enforces the same rule; this copy is for the error message. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
