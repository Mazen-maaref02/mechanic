import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] w-full max-w-md place-items-center px-4 text-center">
      <div>
        <ShieldAlert className="mx-auto h-10 w-10 text-foreground-dim" />
        <h1 className="mt-4 font-display text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          The page you are looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
            Back home
          </Link>
          <Link href="/shop" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary/50">
            Browse shop
          </Link>
        </div>
      </div>
    </div>
  );
}
