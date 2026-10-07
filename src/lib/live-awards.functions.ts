import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AWARD_FEED_URL, normalizeAwards, type AwardSnapshot } from "./live-awards";

let cache: AwardSnapshot | null = null;
let pending: Promise<AwardSnapshot> | null = null;
const TTL = 15 * 60 * 1000;
export const getLiveAwards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<AwardSnapshot> => {
    if (cache && Date.now() - Date.parse(cache.fetchedAt) < TTL) return cache;
    if (pending) return pending;
    pending = (async () => {
      try {
        const res = await fetch(AWARD_FEED_URL, { signal: AbortSignal.timeout(25000), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`World Bank award feed returned ${res.status}`);
        const snapshot = normalizeAwards(await res.json());
        if (!snapshot.awards.length) throw new Error("World Bank returned no valid Indian award records.");
        cache = snapshot;
        return snapshot;
      } catch (error) {
        const warning = error instanceof Error ? error.message : "Award source unavailable";
        if (cache) return { ...cache, stale: true, warning };
        throw new Error(warning);
      } finally { pending = null; }
    })();
    return pending;
  });