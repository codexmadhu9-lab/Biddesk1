import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AwardSource, AwardLinks } from "@/components/award-source";
import { money, type AwardSnapshot } from "@/lib/live-awards";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/tender-ui";
import { Panel } from "@/components/stat";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/competitors")({
  head: () => ({ meta: [{ title: "Competitor Intelligence — BidWin AI" }, { name: "description", content: "Who wins tenders in your categories, at what price and where." }, { property: "og:title", content: "Competitor Intelligence — BidWin AI" }, { property: "og:description", content: "Who wins tenders in your categories, at what price and where." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Competitors,
});

function Competitors() {
  return <div className="mx-auto max-w-7xl"><PageHeader title="Competitor intelligence" subtitle="Published winning suppliers and joint ventures on Indian project awards." /><AwardSource>{(snapshot) => <SupplierView snapshot={snapshot} />}</AwardSource></div>;
}

function SupplierView({ snapshot }: { snapshot: AwardSnapshot }) {
  const [selected, setSelected] = useState<string | null>(null);
  const groups = [...new Set(snapshot.awards.map((a) => a.supplier))].map((supplier) => {
    const won = snapshot.awards.filter((a) => a.supplier === supplier);
    return { supplier, won, inrValue: won.filter((a) => a.currency === "INR" && a.amount !== null).reduce((s, a) => s + (a.amount ?? 0), 0), priced: won.filter((a) => a.currency === "INR" && a.amount !== null).length };
  }).sort((a, b) => b.inrValue - a.inrValue);
  const sel = groups.find((g) => g.supplier === selected) ?? groups[0];
  return <div className="grid gap-6 lg:grid-cols-5">
    <Panel title="Suppliers by published INR award value" className="lg:col-span-3">
      <p className="mb-4 text-xs text-muted-foreground">Joint ventures remain one entry; contract values are not attributed separately to each member.</p>
      <div className="space-y-2">{groups.map((g, i) => <Button key={g.supplier} variant="ghost" onClick={() => setSelected(g.supplier)} className={cn("h-auto w-full justify-start whitespace-normal p-3 text-left", sel?.supplier === g.supplier && "bg-primary-soft")}><span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{i + 1}</span><span className="min-w-0 flex-1 break-words">{g.supplier}<span className="mt-1 block text-xs font-normal text-muted-foreground">{g.won.length} awards in retrieved notices</span></span><span className="shrink-0 font-mono text-xs">{g.priced ? money(g.inrValue, "INR") : "No INR value"}</span></Button>)}</div>
      {!groups.length && <p className="text-muted-foreground">No valid supplier awards available.</p>}
    </Panel>
    {sel && <Panel title={sel.supplier} className="self-start lg:col-span-2"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted-foreground">Retrieved awards</dt><dd className="mt-1 font-mono text-lg">{sel.won.length}</dd></div><div><dt className="text-muted-foreground">INR value · {sel.priced} awards</dt><dd className="mt-1 font-mono">{sel.priced ? money(sel.inrValue, "INR") : "Not published"}</dd></div></dl><p className="mt-4 text-xs text-muted-foreground">Turnover, MSME status, headquarters and estimate discounts are not published in this feed.</p><div className="mt-5"><AwardLinks awards={sel.won.slice(0, 10)} /></div></Panel>}
  </div>;
}
