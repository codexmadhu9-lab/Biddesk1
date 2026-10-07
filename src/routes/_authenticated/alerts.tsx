import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlarmClock, BellRing, FileWarning, Landmark, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES, STATES, alertRulesQuery, bidsQuery, daysLeft, daysUntil, docsQuery, guaranteesQuery, inr, profileQuery, tendersQuery, watchlistQuery,
  type AlertRule, type Tender,
} from "@/lib/data";
import { computeFit } from "@/lib/fit";
import { FitBadge, PageHeader } from "@/components/tender-ui";
import { Panel } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({ meta: [{ title: "Alerts — BidWin AI" }, { name: "description", content: "Saved searches, deadline, document and guarantee alerts." }, { property: "og:title", content: "Alerts — BidWin AI" }, { property: "og:description", content: "Saved searches, deadline, document and guarantee alerts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => {
    for (const q of [alertRulesQuery, tendersQuery, bidsQuery, watchlistQuery, docsQuery, guaranteesQuery]) context.queryClient.ensureQueryData(q as never);
  },
  component: Alerts,
});

const ANY = "__any";

function matches(r: AlertRule, t: Tender, fit: number) {
  if (r.keyword && ![t.title, t.buyer, t.description].join(" ").toLowerCase().includes(r.keyword.toLowerCase())) return false;
  if (r.category && t.category !== r.category) return false;
  if (r.state && t.state !== r.state) return false;
  if (r.min_value_cr && Number(t.value_cr) < Number(r.min_value_cr)) return false;
  if (r.min_fit && fit < r.min_fit) return false;
  return true;
}

function Alerts() {
  const qc = useQueryClient();
  const { data: rules } = useSuspenseQuery(alertRulesQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: bids } = useSuspenseQuery(bidsQuery);
  const { data: watch } = useSuspenseQuery(watchlistQuery);
  const { data: docs } = useSuspenseQuery(docsQuery);
  const { data: gs } = useSuspenseQuery(guaranteesQuery);

  const blank = { name: "", keyword: "", category: ANY, state: ANY, min_value_cr: "", min_fit: "" };
  const [f, setF] = useState(blank);
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alert_rules").insert({
        name: f.name || "My alert", keyword: f.keyword || null,
        category: f.category === ANY ? null : f.category, state: f.state === ANY ? null : f.state,
        min_value_cr: f.min_value_cr ? Number(f.min_value_cr) : null, min_fit: f.min_fit ? Number(f.min_fit) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setF(blank); qc.invalidateQueries({ queryKey: ["alert_rules"] }); toast.success("Alert saved"); },
    onError: (e) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("alert_rules").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert_rules"] }),
  });

  const open = tenders.filter((t) => daysLeft(t.deadline) >= 0).map((t) => ({ t, fit: computeFit(t, profile).score }));
  const tracked = new Set([...watch, ...bids.filter((b) => !["Won", "Lost", "Submitted"].includes(b.stage)).map((b) => b.tender_id)]);

  type Item = { icon: React.ComponentType<{ className?: string }>; tone: string; title: string; body: string; to?: string };
  const feed: Item[] = [
    ...open.filter(({ t }) => tracked.has(t.id) && daysLeft(t.deadline) <= 7).map(({ t }) => ({
      icon: AlarmClock, tone: "bg-destructive-soft text-destructive", title: `Deadline in ${daysLeft(t.deadline)} days`, body: t.title, to: t.id,
    })),
    ...docs.filter((d) => d.expiry_date && daysUntil(d.expiry_date) <= 30).map((d) => ({
      icon: FileWarning, tone: "bg-warning-soft text-warning-foreground", title: daysUntil(d.expiry_date!) < 0 ? "Document expired" : `Document expires in ${daysUntil(d.expiry_date!)} days`, body: `${d.name} (${d.doc_type})`,
    })),
    ...gs.filter((g) => g.status === "Active" && daysUntil(g.expiry_date) <= 30).map((g) => ({
      icon: Landmark, tone: "bg-warning-soft text-warning-foreground", title: `${g.kind} expires in ${daysUntil(g.expiry_date)} days`, body: `${g.beneficiary} · ₹${g.amount_lakh} L · ${g.bank}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Alerts" subtitle="Saved tender searches plus automatic deadline, document and guarantee warnings." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Panel title={`Needs attention (${feed.length})`}>
            {feed.length === 0 ? <p className="text-sm text-muted-foreground">All clear — nothing urgent on your watched tenders, documents or guarantees.</p> : (
              <ul className="space-y-2">
                {feed.map((i, k) => {
                  const inner = (<><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${i.tone}`}><i.icon className="h-4 w-4" /></span><div className="min-w-0"><div className="text-sm font-semibold">{i.title}</div><div className="line-clamp-1 text-xs text-muted-foreground">{i.body}</div></div></>);
                  return <li key={k}>{i.to ? <Link to="/tenders/$id" params={{ id: i.to }} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">{inner}</Link> : <div className="flex items-center gap-3 p-2">{inner}</div>}</li>;
                })}
              </ul>
            )}
          </Panel>
          {rules.map((r) => {
            const hits = open.filter(({ t, fit }) => matches(r, t, fit)).sort((a, b) => b.fit - a.fit);
            return (
              <Panel key={r.id} title={`${r.name} · ${hits.length} matching`} action={<Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)} aria-label="Delete alert"><Trash2 /></Button>}>
                <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
                  {[r.keyword && `“${r.keyword}”`, r.category, r.state, r.min_value_cr && `≥ ₹${r.min_value_cr} Cr`, r.min_fit && `fit ≥ ${r.min_fit}`].filter(Boolean).map((x) => <span key={String(x)} className="rounded-md bg-secondary px-2 py-0.5">{x}</span>)}
                </div>
                <ul className="divide-y">
                  {hits.slice(0, 5).map(({ t, fit }) => (
                    <li key={t.id}><Link to="/tenders/$id" params={{ id: t.id }} className="flex items-center gap-3 py-2 text-sm hover:text-primary"><span className="line-clamp-1 flex-1">{t.title}</span><span className="font-mono text-xs">{inr(Number(t.value_cr))}</span><FitBadge score={fit} /></Link></li>
                  ))}
                  {hits.length === 0 && <li className="py-2 text-sm text-muted-foreground">No open tenders match yet.</li>}
                </ul>
              </Panel>
            );
          })}
        </div>
        <Panel title="New tender alert" className="self-start lg:col-span-2" action={<BellRing className="h-4 w-4 text-muted-foreground" />}>
          <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
            <div className="space-y-1.5"><Label>Alert name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Solar tenders in Gujarat" /></div>
            <div className="space-y-1.5"><Label>Keyword</Label><Input value={f.keyword} onChange={(e) => setF({ ...f, keyword: e.target.value })} placeholder="e.g. rooftop" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>Category</Label><Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ANY}>Any</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>State</Label><Select value={f.state} onValueChange={(v) => setF({ ...f, state: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ANY}>Any</SelectItem>{STATES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Min value (₹ Cr)</Label><Input type="number" value={f.min_value_cr} onChange={(e) => setF({ ...f, min_value_cr: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Min fit score</Label><Input type="number" min={0} max={100} value={f.min_fit} onChange={(e) => setF({ ...f, min_fit: e.target.value })} /></div>
            </div>
            <Button className="w-full" disabled={add.isPending}><Plus /> Save alert</Button>
            <p className="text-xs text-muted-foreground">Alerts show here in the app. Email and WhatsApp notifications can be added later.</p>
          </form>
        </Panel>
      </div>
    </div>
  );
}
