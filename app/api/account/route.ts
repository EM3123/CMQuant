import { getAdmin, json, userFromRequest } from "@/lib/accounts/server";

/**
 * Delete the signed-in player's account.
 *
 * Removing the auth user cascades to their profile and every saved run, so
 * this one call is the whole of "delete my data" that the privacy page offers.
 */
export async function DELETE(request: Request) {
  const admin = getAdmin();
  if (!admin) return json({ error: "accounts-disabled" }, 503);

  const user = await userFromRequest(request, admin);
  if (!user) return json({ error: "signed-out" }, 401);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "delete-failed" }, 500);
  return json({ deleted: true });
}
