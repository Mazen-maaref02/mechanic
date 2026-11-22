import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Must run per request — OAuth providers redirect here with a one-time code.
export const dynamic = "force-dynamic";

/**
 * Supabase OAuth return path for Google / Apple quick sign-in.
 * Exchanges the authorization code for a session cookie, then sends admins
 * to the dashboard and customers to their account (the role is read from
 * the server-side profile — never from the client).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null };

      const isStaff = profile?.role === "admin" || profile?.role === "staff";
      // Only internal, first-party redirects are accepted.
      const safeNext =
        requestedNext &&
        requestedNext.startsWith("/") &&
        !requestedNext.startsWith("//") &&
        (requestedNext.startsWith("/account") || requestedNext.startsWith("/admin"))
          ? requestedNext
          : null;

      return NextResponse.redirect(`${origin}${safeNext ?? (isStaff ? "/admin" : "/account")}`);
    }
  }

  // Missing code or failed exchange — back to sign-in with a clear message.
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
