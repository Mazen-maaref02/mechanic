"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogFiltersProps {
  platforms: string[];
  currentPlatform: string | null;
  currentSearch: string | null;
  basePath: string;
}

/**
 * URL-driven catalog filters (platform chips + search).
 * Server components re-render the grid — state lives in the URL only.
 */
export const CatalogFilters = ({
  platforms,
  currentPlatform,
  currentSearch,
  basePath,
}: CatalogFiltersProps) => {  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(currentSearch ?? "");

  const push = React.useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") sp.delete(key);
        else sp.set(key, value);
      }
      const qs = sp.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    },
    [params, router, basePath],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex h-10 w-full max-w-xs items-center rounded-lg border border-border bg-surface sm:w-72">
          <SlidersHorizontal className="ml-3 h-4 w-4 text-foreground-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ q: query.trim() || null });
            }}
            placeholder="Search this catalog…"
            aria-label="Search catalog"
            className="w-full bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-foreground-dim"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); push({ q: null }); }}
              aria-label="Clear search"
              className="mr-2 rounded p-1 text-foreground-dim hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {platforms.map((p) => {
          const selected = currentPlatform === p;
          return (
            <button
              key={p}
              onClick={() => push({ platform: selected ? null : p })}
              aria-pressed={selected}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-all",
                selected
                  ? "border-primary bg-primary/15 text-violet-200"
                  : "border-border text-foreground-muted hover:border-primary/40 hover:text-foreground",
              )}
            >
              {p}
            </button>
          );
        })}

        {(currentSearch || currentPlatform) && (
          <button
            onClick={() => { setQuery(""); push({ q: null, platform: null }); }}
            className="text-xs text-foreground-dim underline-offset-4 hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
};
