import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/tender-ui";
import { Panel, Stat } from "@/components/stat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AwardSource } from "@/components/award-source";
import { money, quantile, type AwardSnapshot } from "@/lib/live-awards";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "Pricing Intelligence — BidWin AI" }, { name: "description", content: "Winning price ranges and L1 discounts by category." }, { property: "og:title", content: "Pricing Intelligence — BidWin AI" }, { property: "og:description", content: "Winning price ranges and L1 discounts by category." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Pricing,
});
function Pricing() {
  return <div className="mx-auto max-w-7xl"><PageHeader title="Pricing intelligence" subtitle="Published signed contract amounts, in their original currency." /><AwardSource>{(snapshot) => <PricingView snapshot={snapshot} />}</AwardSource></div>;
}
function PricingView({ snapshot }: { snapshot: AwardSnapshot }) {
  const [category, setCategory] = useState("All");
  const [currency, setCurrency] = useState("INR");
  const categories = [...new Set(snapshot.awards.map((a) => a.category))].sort();
  const currencies = [...new Set(snapshot.awards.map((a) => a.currency).filter((c): c is string => c !== null))].sort();
  const matching = snapshot.awards.filter((a) => category === "All" || a.category === category);
  const rows = matching.filter((a) => a.currency === currency && a.amount !== null);
  const amounts = rows.map((a) => a.amount ?? 0);
  return <>
    <div className="mb-6 flex flex-wrap items-end gap-4 border-b pb-5"><div className="space-y-2"><Label>Procurement group</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-60"><SelectValue /></SelectTrigger><SelectContent>{["All", ...categories].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Published currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{[...new Set(["INR", ...currencies])].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><p className="text-sm text-muted-foreground">{rows.length} priced awards · {matching.filter((a) => a.amount === null).length} without an unambiguous signed price</p></div>
    <p className="mb-6 text-sm text-muted-foreground">These are contract-size statistics, not comparable bid recommendations or L1 discounts. Estimates are not published; currencies are never converted or mixed.</p>
    {!rows.length ? <p className="text-muted-foreground">No published contract prices match these filters.</p> : <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Contract amount · P25" value={money(quantile(amounts, .25), currency)} /><Stat label="Median contract amount" value={money(quantile(amounts, .5), currency)} /><Stat label="Contract amount · P75" value={money(quantile(amounts, .75), currency)} /><Stat label="Priced awards" value={rows.length} sub="in retrieved notices" /></div>{rows.length < 10 && <p className="mt-4 text-sm text-warning-foreground">Small sample: these amounts are not a robust market benchmark.</p>}<div className="mt-6"><Panel title="Published signed contract prices"><ul className="divide-y">{rows.map((a) => <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-4 text-sm"><div className="min-w-0 flex-1"><a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 font-medium text-primary hover:underline">{a.title}<ExternalLink className="mt-0.5 size-3 shrink-0" /></a><p className="mt-1 text-xs text-muted-foreground">{a.awardedOn} · {a.supplier}</p></div><span className="font-mono">{money(a.amount, a.currency)}</span></li>)}</ul></Panel></div></>}
  </>;
}
