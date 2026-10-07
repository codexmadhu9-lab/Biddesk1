import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { liveTendersQuery, daysUntil } from "@/lib/data";
import { PageHeader } from "@/components/tender-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const meta = "Open World Bank-financed tenders and expressions of interest in India, refreshed from the official notice feed.";
export const Route = createFileRoute("/_authenticated/live-tenders")({
  head: () => ({ meta: [{ title: "Live Tenders — BidWin AI" }, { name: "description", content: meta }, { property: "og:title", content: "Live Tenders — BidWin AI" }, { property: "og:description", content: meta }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: LiveTenders,
});

const ALL = "__all";
function LiveTenders() {
  const query = useQuery(liveTendersQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [showClosed, setShowClosed] = useState(false);
  const all = query.data?.tenders ?? [];
  const term = q.toLowerCase();
  const rows = all
    .filter((t) => showClosed || (t.deadline !== null && daysUntil(t.deadline) >= 0))
    .filter((t) => cat === ALL || t.category === cat)
    .filter((t) => type === ALL || t.noticeType === type)
    .filter((t) => !term || [t.title, t.buyer, t.project, t.reference, t.buyerAddress].join(" ").toLowerCase().includes(term));
  const cats = [...new Set(all.map((t) => t.category))].sort();

  return <div>
    <PageHeader title="Live tenders" subtitle="Real, currently published notices — no sample records." />
    <section className="mb-6 border-y py-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">World Bank · India tender notices</p><p className="mt-1 text-muted-foreground">World Bank-financed Indian projects only. GeM, CPPP and state portals block automated access, so they are not included.</p></div>
        <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? "animate-spin" : ""} />Refresh</Button>
      </div>
      {query.data && <p className="mt-2 text-xs text-muted-foreground">Retrieved {new Date(query.data.fetchedAt).toLocaleString("en-IN")} · {query.data.tenders.length} valid notices from the latest {query.data.scanned} · {query.data.excluded} excluded · 15-minute cache</p>}
      {query.data?.stale && <p role="alert" className="mt-2 text-warning-foreground">Showing last retrieved notices; refresh failed: {query.data.warning}</p>}
    </section>

    {query.isPending ? <p role="status" className="text-muted-foreground">Loading official tender notices…</p>
    : query.isError ? <div role="alert" className="border-l-2 border-destructive pl-4"><p className="font-semibold">Live tender data is unavailable</p><p className="mt-1 text-sm text-muted-foreground">{query.error.message}. No sample records are shown.</p></div>
    : <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search title, buyer, project, reference" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={cat} onValueChange={setCat}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All categories</SelectItem>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>All notice types</SelectItem><SelectItem value="Invitation for Bids">Invitation for Bids</SelectItem><SelectItem value="Request for Expression of Interest">Expression of Interest</SelectItem></SelectContent></Select>
        <Button variant={showClosed ? "secondary" : "outline"} size="sm" onClick={() => setShowClosed((v) => !v)}>{showClosed ? "Showing closed" : "Open only"}</Button>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{rows.length} notices</p>
      {rows.length === 0 ? <p className="py-10 text-center text-muted-foreground">No notices match these filters.</p> :
      <ul className="divide-y rounded-[14px] border bg-card">{rows.map((t) => {
        const d = t.deadline ? daysUntil(t.deadline) : null;
        return <li key={t.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-3xl items-start gap-2 font-medium text-primary hover:underline">{t.title}<ExternalLink className="mt-1 size-3 shrink-0" /></a>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${d === null ? "bg-muted text-muted-foreground" : d < 0 ? "bg-muted text-muted-foreground" : d <= 7 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>{d === null ? "No deadline published" : d < 0 ? "Closed" : `${d} days left`}</span>
          </div>
          <p className="mt-1 text-sm">{t.buyer}{t.buyerAddress && <span className="text-muted-foreground"> · {t.buyerAddress}</span>}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.noticeType} · {t.category} · {t.method} · {t.project} · <span className="font-mono">{t.reference}</span> · Published {t.publishedOn}{t.deadline && ` · Due ${t.deadline}${t.deadlineTime ? " " + t.deadlineTime : ""}`}</p>
        </li>;
      })}</ul>}
    </>}
  </div>;
}
