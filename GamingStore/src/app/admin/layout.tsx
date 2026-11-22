import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata: Metadata = {
  title: { template: "%s · NexLevel Admin", default: "Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Deep guard (role + MFA assurance when enforced) — runs on EVERY admin page.
  const user = await requireAdmin(`/admin`);

  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar userLabel={user.profile.full_name ?? user.email} role={user.profile.role} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
