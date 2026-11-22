import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/account"];

/** Refresh the auth session cookie and provide a light first-line gate. */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return supabaseResponse;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() (not getSession) — network-verified session.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    if (path.startsWith("/admin")) url.searchParams.set("staff", "1");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // run on all pages except static assets & api
    "/((?!_next/static|_next/image|favicon.ico|fonts|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
