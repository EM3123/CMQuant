import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/accounts/config";

/**
 * The server's Supabase client. It holds the secret key, which bypasses row
 * level security, so it lives only in route handlers and never ships to the
 * browser - `server-only` makes importing it from a client file a build error.
 */
export function getAdmin(): SupabaseClient | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !secret) return null;
  return createClient(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The player behind a request's bearer token, checked with Supabase. */
export async function userFromRequest(
  request: Request,
  admin: SupabaseClient
): Promise<User | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
