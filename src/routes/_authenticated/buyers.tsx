import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/tender-ui";
import { Panel, Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { AwardSource, AwardLinks } from "@/components/award-source";
import { money, type AwardSnapshot } from "@/lib/live-awards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/buyers")({
  head: () => ({ meta: [{ title: "Buyer Intelligence — BidWin AI" }, { name: "description", content: "How government buyers procure, pay and award." }, { property: "og:title", content: "Buyer Intelligence — BidWin AI" }, { property: "og:description", content: "How government buyers procure, pay and award." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Buyers,
});
function Buyers() {
  return <div className="mx-auto max-w-7xl"><PageHeader title="Buyer intelligence" subtitle="Award activity by World Bank-financed Indian project." /><AwardSource>{(snapshot) => <BuyerView snapshot={snapshot} />}</AwardSource></div>;
}
function BuyerView({ snapshot }: { snapshot: AwardSnapshot }) {
  const [selected, setSelected] = useState<string | null>(null);
  const groups = [...new Set(snapshot.awards.map((a) => a.projectId))].map((id) => {
    const rows = snapshot.awards.filter((a) => a.projectId === id);
    return { id, name: rows[0]?.project ?? id, rows, priced: rows.filter((a) => a.currency === "INR" && a.amount !== null), suppliers: [...new Set(rows.map((a) => a.supplier))] };
  }).sort((a, b) => b.rows.length - a.rows.length);
  const b = groups.find((g) => g.id === selected) ?? groups[0];
  return <>
    <p className="mb-5 text-sm text-muted-foreground">Project is the published grouping, not a verified buyer department. Payment times, bidder counts and tender estimates are unavailable.</p>
    <div className="grid gap-6 lg:grid-cols-5">
      <Panel title="Awarding projects" className="self-start lg:col-span-2"><div className="space-y-2">{groups.map((g) => <Button key={g.id} variant="ghost" onClick={() => setSelected(g.id)} className={cn("h-auto w-full justify-start whitespace-normal p-3 text-left", b?.id === g.id && "bg-primary-soft")}><span className="min-w-0 flex-1 break-words">{g.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{g.id} · {g.rows.length} retrieved awards</span></span></Button>)}</div>{!groups.length && <p>No verified project awards available.</p>}</Panel>
      {b && <div className="space-y-6 lg:col-span-3"><div className="grid gap-4 sm:grid-cols-3"><Stat label="Published INR value" value={b.priced.length ? money(b.priced.reduce((s, a) => s + (a.amount ?? 0), 0), "INR") : "Not published"} sub={`${b.priced.length} priced awards`} /><Stat label="Retrieved awards" value={b.rows.length} /><Stat label="Winning supplier groups" value={b.suppliers.length} /></div><Panel title="Winning suppliers"><ul className="divide-y text-sm">{b.suppliers.map((s) => <li key={s} className="flex items-start justify-between gap-3 py-3"><span className="min-w-0 break-words">{s}</span><span className="shrink-0 font-mono text-muted-foreground">{b.rows.filter((a) => a.supplier === s).length} awards</span></li>)}</ul></Panel><Panel title="Published award notices"><AwardLinks awards={b.rows.slice(0, 10)} /></Panel></div>}
    </div>
  </>;
}
