"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export const SignOutButton = () => (
  <form action={logoutAction}>
    <button
      type="submit"
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-red-300 transition-colors hover:border-red-400/40 hover:bg-red-500/10"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  </form>
);
