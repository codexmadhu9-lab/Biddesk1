import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { liveAwardsQuery } from "@/lib/data";
import type { AwardSnapshot, LiveAward } from "@/lib/live-awards";

export function AwardSource({ children }: { children: (snapshot: AwardSnapshot) => ReactNode }) {
  const query = useQuery(liveAwardsQuery);
  return <>
    <section className="mb-6 border-y py-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">World Bank · India contract awards</p><p className="mt-1 text-muted-foreground">World Bank-financed Indian projects only. Not a GeM, CPPP or all-India market feed.</p></div>
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? "animate-spin" : ""} />Refresh</Button>
      </div>
      {query.data && <p className="mt-2 text-xs text-muted-foreground">Retrieved {new Date(query.data.fetchedAt).toLocaleString("en-IN")} · {query.data.awards.length} valid awards from the latest {query.data.scanned} notices · {query.data.excluded} excluded · Source catalogue: {query.data.total.toLocaleString("en-IN")} notices · 15-minute cache</p>}
      {query.data?.stale && <p role="alert" className="mt-2 text-warning-foreground">Showing last retrieved awards; source refresh failed: {query.data.warning}</p>}
    </section>
    {query.isPending ? <p role="status" className="text-muted-foreground">Loading official award notices…</p> : query.isError ? <div role="alert" className="border-l-2 border-destructive pl-4"><p className="font-semibold">Live award data is unavailable</p><p className="mt-1 text-sm text-muted-foreground">{query.error.message}. No sample records are shown.</p></div> : children(query.data)}
  </>;
}
export function AwardLinks({ awards }: { awards: LiveAward[] }) {
  return <ul className="divide-y">{awards.map((a) => <li key={a.id} className="py-3 text-sm"><a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 font-medium text-primary hover:underline">{a.title}<ExternalLink className="mt-0.5 size-3 shrink-0" /></a><p className="mt-1 text-xs text-muted-foreground">{a.reference} · Awarded {a.awardedOn} · {a.supplier}</p></li>)}</ul>;
}