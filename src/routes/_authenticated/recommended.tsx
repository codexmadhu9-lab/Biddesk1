import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, X, Minus } from "lucide-react";
import { daysLeft, inr, profileQuery, tendersQuery, watchlistQuery } from "@/lib/data";
import { computeFit } from "@/lib/fit";
import { DeadlineChip, EmptyState, FitBadge, PageHeader, WatchButton } from "@/components/tender-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/recommended")({
  head: () => ({ meta: [{ title: "AI Recommended — BidWin AI" }, { name: "description", content: "Tenders your company is most likely to qualify for and win." }, { property: "og:title", content: "AI Recommended — BidWin AI" }, { property: "og:description", content: "Tenders your company is most likely to qualify for and win." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(tendersQuery); context.queryClient.ensureQueryData(watchlistQuery); },
  component: Recommended,
});

function Recommended() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const { data: watch } = useSuspenseQuery(watchlistQuery);
  const recs = tenders
    .filter((t) => daysLeft(t.deadline) >= 0)
    .map((t) => ({ t, fit: computeFit(t, profile) }))
    .filter((r) => r.fit.score >= 60)
    .sort((a, b) => b.fit.score - a.fit.score);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Recommended for you" subtitle="Ranked by eligibility and fit with your company profile — with the reasons." />
      {recs.length === 0 ? (
        <EmptyState title="No strong matches yet" body="Add more categories, states or certifications to your profile." action={<Button asChild><Link to="/settings">Update profile</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recs.map(({ t, fit }, i) => (
            <Link key={t.id} to="/tenders/$id" params={{ id: t.id }} className="animate-rise rounded-2xl border bg-card p-5 shadow-card transition hover:border-primary/30 hover:shadow-elevated" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{t.source} · {t.category} · {t.state}</div>
                  <h3 className="mt-1 line-clamp-2 font-semibold">{t.title}</h3>
                  <div className="mt-1 text-sm text-muted-foreground">{t.buyer}</div>
                </div>
                <WatchButton tenderId={t.id} saved={watch.includes(t.id)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <FitBadge score={fit.score} /><DeadlineChip deadline={t.deadline} />
                <span className="font-mono text-xs tabular text-muted-foreground">{inr(Number(t.value_cr))}</span>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {fit.checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-1.5" title={c.detail}>
                    {c.ok === true ? <Check className="h-3.5 w-3.5 text-success" /> : c.ok === false ? <X className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5 text-warning" />}
                    <span className="text-muted-foreground">{c.label}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
