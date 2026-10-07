import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profileQuery, tendersQuery, watchlistQuery } from "@/lib/data";
import { computeFit } from "@/lib/fit";
import { EmptyState, PageHeader, TenderRow } from "@/components/tender-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — BidWin AI" }, { name: "description", content: "Tenders you've saved to track." }, { property: "og:title", content: "Watchlist — BidWin AI" }, { property: "og:description", content: "Tenders you've saved to track." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(tendersQuery); context.queryClient.ensureQueryData(watchlistQuery); },
  component: Watchlist,
});

function Watchlist() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const { data: watch } = useSuspenseQuery(watchlistQuery);
  const rows = tenders.filter((t) => watch.includes(t.id));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Watchlist" subtitle={`${rows.length} saved tenders, sorted by deadline`} />
      {rows.length === 0 ? (
        <EmptyState title="Nothing saved yet" body="Tap the bookmark on any tender to track it here." action={<Button asChild><Link to="/discover">Discover tenders</Link></Button>} />
      ) : (
        <div className="space-y-2.5">{rows.map((t) => <TenderRow key={t.id} t={t} fit={computeFit(t, profile).score} saved />)}</div>
      )}
    </div>
  );
}
