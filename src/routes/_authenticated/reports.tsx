import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bar as RBar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BID_STAGES, awardsQuery, bidsQuery, inr, profileQuery, tendersQuery } from "@/lib/data";
import { computeFit } from "@/lib/fit";
import { PageHeader } from "@/components/tender-ui";
import { Panel, Stat, pct } from "@/components/stat";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — BidWin AI" }, { name: "description", content: "Bid performance, win rate and market analytics." }, { property: "og:title", content: "Reports — BidWin AI" }, { property: "og:description", content: "Bid performance, win rate and market analytics." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(bidsQuery); context.queryClient.ensureQueryData(tendersQuery); context.queryClient.ensureQueryData(awardsQuery); },
  component: Reports,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 } };

function Reports() {
  const { data: bids } = useSuspenseQuery(bidsQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const { data: awards } = useSuspenseQuery(awardsQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const byId = new Map(tenders.map((t) => [t.id, t]));

  const won = bids.filter((b) => b.stage === "Won");
  const decided = bids.filter((b) => b.stage === "Won" || b.stage === "Lost");
  const wonValue = won.reduce((s, b) => s + Number(byId.get(b.tender_id)?.value_cr ?? 0), 0);
  const avgFit = bids.length ? bids.reduce((s, b) => s + computeFit(byId.get(b.tender_id)!, profile).score, 0) / bids.length : 0;

  const stageData = BID_STAGES.map((s) => ({ name: s, value: bids.filter((b) => b.stage === s).length })).filter((d) => d.value);
  const catMap: Record<string, number> = {};
  for (const a of awards) catMap[a.category] = (catMap[a.category] ?? 0) + Number(a.awarded_cr);
  const catData = Object.entries(catMap).map(([name, v]) => ({ name: name.replace(" & ", " &\n"), v: Math.round(v) })).sort((a, b) => b.v - a.v);

  const monthMap: Record<string, number> = {};
  for (const a of awards) { const k = a.awarded_on.slice(0, 7); monthMap[k] = (monthMap[k] ?? 0) + Number(a.awarded_cr); }
  const monthData = Object.entries(monthMap).sort().slice(-12).map(([m, v]) => ({ m: new Date(m + "-01").toLocaleDateString("en-IN", { month: "short" }), v: Math.round(v) }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Reports" subtitle="Your bid performance and the procurement market you compete in." />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Bids tracked" value={bids.length} sub={`${decided.length} decided`} />
        <Stat label="Win rate" value={decided.length ? pct(won.length / decided.length) : "—"} sub={`${won.length} won`} />
        <Stat label="Value won" value={inr(wonValue)} />
        <Stat label="Avg fit of bids pursued" value={Math.round(avgFit)} sub="higher fit → higher win rate" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Your bids by stage">
          {stageData.length === 0 ? <p className="text-sm text-muted-foreground">Start bids to see this chart.</p> : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stageData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {stageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 text-xs">{stageData.map((d, i) => <span key={d.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name} {d.value}</span>)}</div>
            </div>
          )}
        </Panel>
        <Panel title="Market awards by month (₹ Cr)" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthData}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
                <RBar dataKey="v" name="₹ Cr" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Awarded value by category (₹ Cr, 2 yrs)" className="lg:col-span-3">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={catData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
                <RBar dataKey="v" name="₹ Cr" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
