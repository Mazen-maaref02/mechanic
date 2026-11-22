import { Suspense } from "react";
import { CartProvider } from "@/components/store/cart-context";
import { MotionProvider } from "@/components/store/motion-provider";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";

// Storefront requires sign-in only at checkout (0008). No layout-level auth
// lookup: pages that need the user call the session helpers directly.
// clients never sign in, so the header stays static and pages stream fast.
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <CartProvider>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main className="flex-1">
            <Suspense>{children}</Suspense>
          </main>
          <SiteFooter />
        </div>
      </CartProvider>
    </MotionProvider>
  );
}
