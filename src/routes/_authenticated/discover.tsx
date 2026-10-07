import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search, X } from "lucide-react";
import { CATEGORIES, STATES, daysLeft, profileQuery, tendersQuery, watchlistQuery } from "@/lib/data";
import { computeFit } from "@/lib/fit";
import { EmptyState, PageHeader, TenderRow } from "@/components/tender-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  state: z.string().optional(),
  source: z.string().optional(),
  value: z.enum(["any", "lt1", "1to10", "10to50", "gt50"]).optional(),
  sort: z.enum(["fit", "deadline", "value"]).optional(),
  closed: z.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Discover Tenders — BidWin AI" }, { name: "description", content: "Search and filter government tenders across GeM, CPPP and state portals." }, { property: "og:title", content: "Discover Tenders — BidWin AI" }, { property: "og:description", content: "Search and filter government tenders across GeM, CPPP and state portals." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(tendersQuery); context.queryClient.ensureQueryData(watchlistQuery); },
  component: Discover,
});

const ALL = "__all";

function Discover() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/discover" });
  const set = (patch: Partial<z.infer<typeof searchSchema>>) => navigate({ search: (p) => ({ ...p, ...patch }), replace: true });
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const { data: watch } = useSuspenseQuery(watchlistQuery);

  const q = (s.q ?? "").toLowerCase();
  const inValue = (v: number) => {
    switch (s.value) {
      case "lt1": return v < 1;
      case "1to10": return v >= 1 && v < 10;
      case "10to50": return v >= 10 && v < 50;
      case "gt50": return v >= 50;
      default: return true;
    }
  };
  const rows = tenders
    .filter((t) => s.closed || daysLeft(t.deadline) >= 0)
    .filter((t) => !q || [t.title, t.buyer, t.category, t.ministry, t.ref_no, t.city, t.state, t.description].join(" ").toLowerCase().includes(q))
    .filter((t) => !s.category || t.category === s.category)
    .filter((t) => !s.state || t.state === s.state)
    .filter((t) => !s.source || t.source === s.source)
    .filter((t) => inValue(Number(t.value_cr)))
    .map((t) => ({ t, fit: computeFit(t, profile).score }))
    .sort((a, b) =>
      (s.sort ?? "fit") === "fit" ? b.fit - a.fit
      : s.sort === "value" ? Number(b.t.value_cr) - Number(a.t.value_cr)
      : new Date(a.t.deadline).getTime() - new Date(b.t.deadline).getTime());

  const filtered = !!(s.q || s.category || s.state || s.source || (s.value && s.value !== "any"));

  const Filter = ({ k, label, options }: { k: "category" | "state" | "source"; label: string; options: string[] }) => (
    <Select value={s[k] ?? ALL} onValueChange={(v) => set({ [k]: v === ALL ? undefined : v })}>
      <SelectTrigger className="h-9 w-[170px] bg-card"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Discover tenders" subtitle={`${rows.length} tenders · scored against your company profile`} />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-card">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            defaultValue={s.q} key={s.q ?? ""}
            onKeyDown={(e) => { if (e.key === "Enter") set({ q: (e.target as HTMLInputElement).value || undefined }); }}
            onBlur={(e) => set({ q: e.target.value || undefined })}
            placeholder="Keyword, buyer, tender ID… (press Enter)"
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <Filter k="category" label="Categories" options={CATEGORIES} />
        <Filter k="state" label="States" options={STATES} />
        <Filter k="source" label="Sources" options={["GeM", "CPPP", "State e-Proc", "IREPS"]} />
        <Select value={s.value ?? "any"} onValueChange={(v) => set({ value: v as "any" })}>
          <SelectTrigger className="h-9 w-[140px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any value</SelectItem>
            <SelectItem value="lt1">Under ₹1 Cr</SelectItem>
            <SelectItem value="1to10">₹1–10 Cr</SelectItem>
            <SelectItem value="10to50">₹10–50 Cr</SelectItem>
            <SelectItem value="gt50">₹50 Cr+</SelectItem>
          </SelectContent>
        </Select>
        <Select value={s.sort ?? "fit"} onValueChange={(v) => set({ sort: v as "fit" })}>
          <SelectTrigger className="h-9 w-[150px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fit">Sort: Best fit</SelectItem>
            <SelectItem value="deadline">Sort: Deadline</SelectItem>
            <SelectItem value="value">Sort: Value</SelectItem>
          </SelectContent>
        </Select>
        {filtered && <Button variant="ghost" size="sm" onClick={() => navigate({ search: {}, replace: true })}><X /> Clear</Button>}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No tenders match" body="Try removing a filter or broadening your keyword." />
      ) : (
        <div className="space-y-2.5">{rows.map(({ t, fit }) => <TenderRow key={t.id} t={t} fit={fit} saved={watch.includes(t.id)} />)}</div>
      )}
    </div>
  );
}
