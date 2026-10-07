import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BID_STAGES, bidsQuery, inr, tendersQuery } from "@/lib/data";
import { DeadlineChip, EmptyState, PageHeader } from "@/components/tender-ui";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bids")({
  head: () => ({ meta: [{ title: "Bid Pipeline — BidWin AI" }, { name: "description", content: "Track every bid from qualification to award." }, { property: "og:title", content: "Bid Pipeline — BidWin AI" }, { property: "og:description", content: "Track every bid from qualification to award." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(tendersQuery); context.queryClient.ensureQueryData(bidsQuery); },
  component: Pipeline,
});

const stageDot: Record<string, string> = {
  Qualifying: "bg-muted-foreground", Preparing: "bg-primary", Approval: "bg-warning",
  Submitted: "bg-chart-4", Won: "bg-success", Lost: "bg-destructive",
};

function useStageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("bids").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ["bids"] }); toast.success(`Moved to ${v.stage}`); },
    onError: (e) => toast.error((e as Error).message),
  });
}

function Pipeline() {
  const { data: bids } = useSuspenseQuery(bidsQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const byId = new Map(tenders.map((t) => [t.id, t]));
  const m = useStageMutation();

  if (bids.length === 0)
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Bid pipeline" />
        <EmptyState title="No bids yet" body="Open a tender and click “Start bid” to begin tracking it here." action={<Button asChild><Link to="/recommended">See recommendations</Link></Button>} />
      </div>
    );

  return (
    <div>
      <PageHeader title="Bid pipeline" subtitle={`${bids.length} bids · ${inr(bids.reduce((s, b) => s + Number(byId.get(b.tender_id)?.value_cr ?? 0), 0))} total value`} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BID_STAGES.map((stage) => {
          const col = bids.filter((b) => b.stage === stage);
          return (
            <div key={stage} className="w-72 shrink-0 rounded-2xl bg-muted/60 p-3">
              <div className="mb-3 flex items-center gap-2 px-1 text-sm font-bold">
                <span className={cn("h-2 w-2 rounded-full", stageDot[stage])} />{stage}
                <span className="ml-auto font-mono text-xs text-muted-foreground">{col.length}</span>
              </div>
              <div className="space-y-2.5">
                {col.map((b) => {
                  const t = byId.get(b.tender_id);
                  if (!t) return null;
                  return (
                    <div key={b.id} className="rounded-xl border bg-card p-3.5 shadow-card">
                      <Link to="/tenders/$id" params={{ id: t.id }} className="line-clamp-2 text-sm font-semibold hover:text-primary">{t.title}</Link>
                      <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{t.buyer}</div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-mono text-xs tabular">{inr(Number(t.value_cr))}</span>
                        <DeadlineChip deadline={t.deadline} />
                      </div>
                      <Select value={b.stage} onValueChange={(v) => m.mutate({ id: b.id, stage: v })}>
                        <SelectTrigger className="mt-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{BID_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
