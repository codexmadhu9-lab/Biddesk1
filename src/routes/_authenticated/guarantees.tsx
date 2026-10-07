import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil, guaranteesQuery, tendersQuery } from "@/lib/data";
import { EmptyState, PageHeader } from "@/components/tender-ui";
import { Stat } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/guarantees")({
  head: () => ({ meta: [{ title: "EMD & Bank Guarantees — BidWin AI" }, { name: "description", content: "Track EMDs, performance guarantees and their expiry and refunds." }, { property: "og:title", content: "EMD & Bank Guarantees — BidWin AI" }, { property: "og:description", content: "Track EMDs, performance guarantees and their expiry and refunds." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(guaranteesQuery); context.queryClient.ensureQueryData(tendersQuery); },
  component: Guarantees,
});

const KINDS = ["EMD", "Bid Security BG", "Performance BG", "Advance Payment BG"];
const STATUSES = ["Active", "Refund pending", "Released", "Invoked"];
const NONE = "__none";

function Guarantees() {
  const { data: gs } = useSuspenseQuery(guaranteesQuery);
  const { data: tenders } = useSuspenseQuery(tendersQuery);
  const qc = useQueryClient();
  const blank = { kind: KINDS[0]!, tender_id: NONE, beneficiary: "", bank: "", instrument_no: "", amount_lakh: "", expiry_date: "" };
  const [f, setF] = useState(blank);
  const tname = new Map(tenders.map((t) => [t.id, t.title]));
  const inv = () => qc.invalidateQueries({ queryKey: ["guarantees"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!f.beneficiary || !f.bank || !f.amount_lakh || !f.expiry_date) throw new Error("Fill beneficiary, bank, amount and expiry");
      const { error } = await supabase.from("guarantees").insert({
        ...f, tender_id: f.tender_id === NONE ? null : f.tender_id, amount_lakh: Number(f.amount_lakh), instrument_no: f.instrument_no || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setF(blank); inv(); toast.success("Instrument recorded"); },
    onError: (e) => toast.error((e as Error).message),
  });
  const upd = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("guarantees").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: inv,
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("guarantees").delete().eq("id", id); if (error) throw error; },
    onSuccess: inv,
  });

  const live = gs.filter((g) => g.status === "Active" || g.status === "Refund pending");
  const locked = live.reduce((s, g) => s + Number(g.amount_lakh), 0);
  const soon = live.filter((g) => daysUntil(g.expiry_date) <= 30).length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="EMD & bank guarantees" subtitle="Know how much capital is locked up and what needs renewal or refund." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Stat label="Capital locked" value={`₹${locked.toFixed(1)} L`} sub={`${live.length} live instruments`} />
        <Stat label="Expiring in 30 days" value={soon} sub="renew or claim refund" />
        <Stat label="Refunds pending" value={gs.filter((g) => g.status === "Refund pending").length} sub="follow up with buyers" />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mb-6 grid gap-3 rounded-2xl border bg-card p-4 shadow-card md:grid-cols-4">
        <div className="space-y-1.5"><Label>Type</Label><Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Linked tender</Label><Select value={f.tender_id} onValueChange={(v) => setF({ ...f, tender_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Not linked</SelectItem>{tenders.map((t) => <SelectItem key={t.id} value={t.id}>{t.title.slice(0, 80)} · {t.ref_no}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Beneficiary</Label><Input value={f.beneficiary} onChange={(e) => setF({ ...f, beneficiary: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Issuing bank</Label><Input value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} placeholder="e.g. SBI, Pune Main" /></div>
        <div className="space-y-1.5"><Label>Instrument no.</Label><Input value={f.instrument_no} onChange={(e) => setF({ ...f, instrument_no: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label>Amount (₹ L)</Label><Input type="number" step="0.01" value={f.amount_lakh} onChange={(e) => setF({ ...f, amount_lakh: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Expiry</Label><Input type="date" value={f.expiry_date} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} /></div>
        </div>
        <Button className="md:col-span-4 md:justify-self-end" disabled={add.isPending}><Plus /> Record instrument</Button>
      </form>
      {gs.length === 0 ? <EmptyState title="No EMDs or guarantees yet" body="Record each EMD and BG to get expiry and refund tracking." /> : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Type", "Beneficiary / tender", "Bank", "Amount", "Expiry", "Status", ""].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {gs.map((g) => {
                const d = daysUntil(g.expiry_date);
                return (
                  <tr key={g.id} className="border-b last:border-0">
                    <td className="p-3 font-semibold">{g.kind}</td>
                    <td className="p-3"><div>{g.beneficiary}</div>{g.tender_id && <div className="line-clamp-1 text-xs text-muted-foreground">{tname.get(g.tender_id)}</div>}</td>
                    <td className="p-3">{g.bank}<div className="font-mono text-xs text-muted-foreground">{g.instrument_no}</div></td>
                    <td className="p-3 font-mono">₹{Number(g.amount_lakh).toFixed(2)} L</td>
                    <td className="p-3"><span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", d < 0 ? "bg-destructive-soft text-destructive" : d <= 30 ? "bg-warning-soft text-warning-foreground" : "bg-secondary")}>{d < 0 ? "Expired" : `${g.expiry_date} · ${d}d`}</span></td>
                    <td className="p-3"><Select value={g.status} onValueChange={(v) => upd.mutate({ id: g.id, status: v })}><SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></td>
                    <td className="p-3"><Button variant="ghost" size="icon" onClick={() => del.mutate(g.id)} aria-label="Delete"><Trash2 /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
