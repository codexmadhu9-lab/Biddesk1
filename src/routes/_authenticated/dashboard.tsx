import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, CalendarClock, KanbanSquare, Target } from "lucide-react";
import { BID_STAGES, bidsQuery, daysLeft, inr, profileQuery, tendersQuery, watchlistQuery } from "@/lib/data";
import { computeFit } from "@/lib/fit";
import { DeadlineChip, FitBadge, PageHeader, TenderRow } from "@/components/tender-ui";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — BidWin AI" }, { name: "description", content: "Your tender opportunities, pipeline and deadlines at a glance." }, { property: "og:title", content: "Command Center — BidWin AI" }, { property: "og:description", content: "Your tender opportunities, pipeline and deadlines at a glance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(tendersQuery);
    context.queryClient.ensureQueryData(bidsQuery);
    context.queryClient.ensureQueryData(watchlistQuery);
  },
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const { data: bids } = useSuspenseQuery(bidsQuery);
  const { data: watch } = useSuspenseQuery(watchlistQuery);

  const open = tenders.filter((t) => daysLeft(t.deadline) >= 0);
  const scored = open.map((t) => ({ t, fit: computeFit(t, profile).score })).sort((a, b) => b.fit - a.fit);
  const strong = scored.filter((s) => s.fit >= 75);
  const byId = new Map(tenders.map((t) => [t.id, t]));
  const active = bids.filter((b) => !["Won", "Lost"].includes(b.stage));
  const pipelineValue = active.reduce((s, b) => s + Number(byId.get(b.tender_id)?.value_cr ?? 0), 0);
  const dueSoon = open.filter((t) => daysLeft(t.deadline) <= 7 && (watch.includes(t.id) || bids.some((b) => b.tender_id === t.id)));

  const kpis = [
    { label: "Strong-fit open tenders", value: strong.length, sub: `of ${open.length} open`, icon: Target },
    { label: "Active pipeline value", value: inr(pipelineValue), sub: `${active.length} live bids`, icon: KanbanSquare },
    { label: "Your deadlines this week", value: dueSoon.length, sub: "watched or bidding", icon: CalendarClock },
    { label: "Watchlist", value: watch.length, sub: "saved tenders", icon: Bookmark },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={`Good to see you, ${profile?.full_name?.split(" ")[0] ?? ""}`} subtitle={`Here's what matters for ${profile?.company_name} today.`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className="animate-rise rounded-2xl border bg-card p-5 shadow-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between text-sm text-muted-foreground">{k.label}<k.icon className="h-4 w-4" /></div>
            <div className="mt-3 font-mono text-3xl font-medium tabular">{k.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Top opportunities for you</h2>
            <Link to="/recommended" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="space-y-2.5">
            {scored.slice(0, 6).map(({ t, fit }) => <TenderRow key={t.id} t={t} fit={fit} saved={watch.includes(t.id)} />)}
          </div>
        </section>
        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-bold">Pipeline by stage</h2>
            <div className="mt-4 space-y-3">
              {BID_STAGES.map((s) => {
                const n = bids.filter((b) => b.stage === s).length;
                const pct = bids.length ? (n / bids.length) * 100 : 0;
                return (
                  <div key={s}>
                    <div className="flex justify-between text-sm"><span>{s}</span><span className="font-mono tabular text-muted-foreground">{n}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
            {bids.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Start a bid from any tender to build your pipeline.</p>}
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <h2 className="font-bold">Closing soonest (strong fit)</h2>
            <div className="mt-3 divide-y">
              {strong.sort((a, b) => daysLeft(a.t.deadline) - daysLeft(b.t.deadline)).slice(0, 5).map(({ t, fit }) => (
                <Link key={t.id} to="/tenders/$id" params={{ id: t.id }} className="flex items-center gap-3 py-2.5 hover:text-primary">
                  <span className="line-clamp-1 flex-1 text-sm">{t.title}</span>
                  <FitBadge score={fit} /><DeadlineChip deadline={t.deadline} />
                </Link>
              ))}
              {strong.length === 0 && <p className="py-2 text-sm text-muted-foreground">Add categories and certifications in your profile to unlock strong matches.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
