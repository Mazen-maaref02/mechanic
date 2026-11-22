import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin-controlled USD→TND rate (latest effective row).
 * Used only for indicative display — orders store their own snapshot.
 */
export const getUsdToTndRate = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base", "USD")
    .eq("quote", "TND")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.rate ? Number(data.rate) : 0;
});
