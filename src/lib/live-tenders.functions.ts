import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TENDER_FEED_URLS, normalizeTenders, type TenderSnapshot } from "./live-tenders";

let cache: TenderSnapshot | null = null;
let pending: Promise<TenderSnapshot> | null = null;
const TTL = 15 * 60 * 1000;

export const getLiveTenders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<TenderSnapshot> => {
    if (cache && Date.now() - Date.parse(cache.fetchedAt) < TTL) return cache;
    if (pending) return pending;
    pending = (async () => {
      try {
        const pages = await Promise.all(TENDER_FEED_URLS.map(async (url) => {
          const res = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(`World Bank tender feed returned ${res.status}`);
          return res.json();
        }));
        const snapshot = normalizeTenders(pages);
        if (!snapshot.tenders.length) throw new Error("World Bank returned no valid Indian tender notices.");
        cache = snapshot;
        return snapshot;
      } catch (error) {
        const warning = error instanceof Error ? error.message : "Tender source unavailable";
        if (cache) return { ...cache, stale: true, warning };
        throw new Error(warning);
      } finally { pending = null; }
    })();
    return pending;
  });
