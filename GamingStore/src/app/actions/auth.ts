"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validation/schemas";

export interface ActionState {
  error?: string;
  success?: string;
}

const genericAuthError = "Invalid email or password. Please try again.";

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  }

  const h = await headers();
  if (!rateLimit(`register:${clientIp(h)}`, 5, 10 * 60_000).ok) {
    return { error: "Too many registration attempts. Try again later." };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/account`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.status === 422) {
      return { error: "An account with this email already exists — sign in instead." };
    }
    return { error: "Registration failed. Please try again." };
  }

  if (!data.session) {
    return {
      success:
        "Account created. If email confirmation is required, check your inbox — then sign in.",
    };
  }
  return { success: "Account created successfully. You can now view your orders." };
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    staff: formData.get("staff") === "1",
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const h = await headers();
  if (!rateLimit(`login:${clientIp(h)}`, 20, 5 * 60_000).ok) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: genericAuthError };

  // Role-based redirect — role never read from the client.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .single();

  const next = formData.get("next");
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (profile?.role === "admin" || profile?.role === "staff") {
    redirect(nextPath ?? "/admin");
  }
  // Signed-in customers land on their account (orders overview).
  redirect(nextPath && nextPath.startsWith("/account") ? nextPath : "/account");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
