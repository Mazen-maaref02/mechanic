import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface User {
  id: string;
  email: string;
  profile: ProfileRow;
}

/**
 * Authenticated user for the current request (cached per request).
 * Returns null when not signed in.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (!profile) return null;

  return {
    id: data.user.id,
    email: profile.email,
    profile: profile,
  };
});

/**
 * Server-side gate for storefront pages that require sign-in (checkout).
 * Any authenticated client passes; redirects to /login preserving the target.
 */
export const requireUser = async (
  routeTo?: string,
): Promise<User> => {
  const next = encodeURIComponent(routeTo ?? "/account");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${next}`);
  return user;
};

/** Assurance-level check for admin areas (AAL2 when MFA enforced). */
export const hasAAL2 = async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
};

/**
 * Server-side gate for /admin/* pages.
 * Role must be admin or staff; MFA (AAL2) enforced when enabled for the profile.
 * A signed-in customer never sees admin UI — they are bounced to the shop.
 */
export const requireAdmin = async (
  routeTo?: string,
): Promise<User> => {
  const next = encodeURIComponent(routeTo ?? "/admin");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${next}&staff=1`);

  const role = user.profile.role;
  if (role !== "admin" && role !== "staff") redirect("/?denied=admin");

  if (user.profile.mfa_enforced && !(await hasAAL2())) {
    redirect("/admin/mfa?enforce=1");
  }
  return user;
};
