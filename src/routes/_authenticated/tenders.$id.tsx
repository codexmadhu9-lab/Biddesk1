import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Brain, Check, FileText, Loader2, Minus, Plus, Rocket, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BID_STAGES, analysisQuery, bidsQuery, inr, profileQuery, startBid, tasksQuery, tenderQuery, watchlistQuery,
  type Bid, type TenderAnalysis,
} from "@/lib/data";
import { computeFit } from "@/lib/fit";
import { analyzeTender } from "@/lib/ai.functions";
import { DeadlineChip, FitBadge, WatchButton } from "@/components/tender-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tenders/$id")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(tenderQuery(params.id));
    if (!t) throw notFound();
    context.queryClient.ensureQueryData(bidsQuery);
    context.queryClient.ensureQueryData(watchlistQuery);
    return { title: t.title };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — BidWin AI` : "Tender — BidWin AI" },
      { name: "description", content: "Tender 360° intelligence: eligibility, AI analysis and bid workspace." },
     { property: "og:title", content: loaderData ? `${loaderData.title} — BidWin AI` : "Tender — BidWin AI" }, { property: "og:description", content: "Tender 360° intelligence: eligibility, AI analysis and bid workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
  }),
  notFoundComponent: () => <div className="p-10 text-center text-muted-foreground">Tender not found. <Link to="/discover" className="text-primary">Back to discover</Link></div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{(error as Error).message}</div>,
  component: TenderPage,
});

function Card({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-bold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function TenderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: t } = useSuspenseQuery(tenderQuery(id));
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: bids } = useSuspenseQuery(bidsQuery);
  const { data: watch } = useSuspenseQuery(watchlistQuery);
  const start = useMutation({
    mutationFn: () => startBid(t!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bids"] }); toast.success("Bid started with a task plan"); },
    onError: (e) => toast.error((e as Error).message),
  });
  if (!t) return null;
  const fit = computeFit(t, profile);
  const bid = bids.find((b) => b.tender_id === t.id);

  const facts = [
    ["Estimated value", inr(Number(t.value_cr))],
    ["EMD", `₹${t.emd_lakh} L${t.msme_emd_exempt ? " · MSME exempt" : ""}`],
    ["Published", new Date(t.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
    ["Bid due", new Date(t.deadline).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })],
    ["Tender type", t.tender_type],
    ["Ministry", t.ministry],
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/discover" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to tenders</Link>
      <div className="mb-6 animate-rise rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-secondary-foreground">{t.source}</span>
          <span className="font-mono">{t.ref_no}</span>·<span>{t.category}</span>·<span>{t.city}, {t.state}</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.buyer}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FitBadge score={fit.score} className="text-sm" /><DeadlineChip deadline={t.deadline} />
          <div className="ml-auto flex items-center gap-2">
            <WatchButton tenderId={t.id} saved={watch.includes(t.id)} />
            {bid ? (
              <Button asChild variant="outline"><Link to="/bids">In pipeline · {bid.stage}</Link></Button>
            ) : (
              <Button onClick={() => start.mutate()} disabled={start.isPending}><Rocket /> {start.isPending ? "Starting…" : "Start bid"}</Button>
            )}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 md:grid-cols-6">
          {facts.map(([k, v]) => (
            <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 text-sm font-semibold">{v}</dd></div>
          ))}
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AIPanel tenderId={t.id} />
          {bid && <BidWorkspace bid={bid} />}
          <Card title="Scope of work"><p className="text-sm leading-relaxed text-muted-foreground">{t.description}</p></Card>
        </div>
        <div className="space-y-6">
          <Card title="Eligibility check" action={<FitBadge score={fit.score} />}>
            <ul className="space-y-3">
              {fit.checks.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", c.ok === true ? "bg-success-soft text-success" : c.ok === false ? "bg-destructive-soft text-destructive" : "bg-warning-soft text-warning-foreground")}>
                    {c.ok === true ? <Check className="h-3 w-3" /> : c.ok === false ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  </span>
                  <div><div className="text-sm font-semibold">{c.label}</div><div className="text-xs text-muted-foreground">{c.detail}</div></div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Required documents">
            <ul className="space-y-2">
              {t.documents.map((d) => <li key={d} className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" />{d}</li>)}
            </ul>
            {t.required_certs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">{t.required_certs.map((c) => <span key={c} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{c}</span>)}</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AIPanel({ tenderId }: { tenderId: string }) {
  const qc = useQueryClient();
  const { data: analysis, isLoading } = useQuery(analysisQuery(tenderId));
  const run = useServerFn(analyzeTender);
  const m = useMutation({
    mutationFn: () => run({ data: { tenderId } }),
    onSuccess: (a) => qc.setQueryData(analysisQuery(tenderId).queryKey, a),
    onError: (e) => toast.error((e as Error).message),
  });

  const action = (
    <Button size="sm" variant={analysis ? "outline" : "default"} onClick={() => m.mutate()} disabled={m.isPending}>
      {m.isPending ? <Loader2 className="animate-spin" /> : <Brain />}{analysis ? "Re-analyse" : "Run AI analysis"}
    </Button>
  );

  if (isLoading || m.isPending)
    return (
      <Card title="AI bid / no-bid analysis" action={action}>
        <div className="space-y-2">{[90, 75, 82, 60].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />)}</div>
        {m.isPending && <p className="mt-3 text-xs text-muted-foreground">Reading the tender against your company profile…</p>}
      </Card>
    );

  if (!analysis)
    return (
      <Card title="AI bid / no-bid analysis" action={action}>
        <p className="text-sm text-muted-foreground">Get an executive summary, win probability, risks and a recommended decision tailored to your company.</p>
      </Card>
    );

  const tone = analysis.decision === "Bid" ? "bg-success-soft text-success" : analysis.decision === "No Bid" ? "bg-destructive-soft text-destructive" : "bg-warning-soft text-warning-foreground";
  const List = ({ title, items, dot }: { title: string; items: string[]; dot: string }) => (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="mt-2 space-y-1.5">{items.map((i) => <li key={i} className="flex gap-2 text-sm"><span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />{i}</li>)}</ul>
    </div>
  );
  return (
    <Card title="AI bid / no-bid analysis" action={action} className="animate-rise">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("rounded-lg px-3 py-1 text-sm font-bold", tone)}>{analysis.decision}</span>
        <span className="text-sm text-muted-foreground">Win probability <span className="font-mono font-medium text-foreground">{Math.round(analysis.win_probability)}%</span></span>
      </div>
      <p className="mt-4 text-sm leading-relaxed">{analysis.summary}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <List title="Strengths" items={analysis.strengths} dot="bg-success" />
        <List title="Risks" items={analysis.risks} dot="bg-destructive" />
        <List title="Key requirements" items={analysis.key_requirements} dot="bg-primary" />
        <List title="Next steps" items={analysis.next_steps} dot="bg-warning" />
      </div>
    </Card>
  );
}

function BidWorkspace({ bid }: { bid: Bid }) {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery(tasksQuery(bid.id));
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const inv = () => qc.invalidateQueries({ queryKey: ["tasks", bid.id] });
  const onErr = (e: unknown) => toast.error((e as Error).message);

  const stage = useMutation({
    mutationFn: async (s: string) => {
      const { error } = await supabase.from("bids").update({ stage: s, updated_at: new Date().toISOString() }).eq("id", bid.id);
      if (error) throw error;
    },
    onSuccess: (_d, s) => { qc.invalidateQueries({ queryKey: ["bids"] }); toast.success(`Moved to ${s}`); }, onError: onErr,
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bid_tasks").insert({ bid_id: bid.id, title, assignee: assignee || null });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setAssignee(""); inv(); }, onError: onErr,
  });
  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("bid_tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv, onError: onErr,
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("bid_tasks").delete().eq("id", id); if (error) throw error; },
    onSuccess: inv, onError: onErr,
  });
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <Card
      title="Bid workspace"
      action={
        <Select value={bid.stage} onValueChange={(v) => stage.mutate(v)}>
          <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>{BID_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground"><span>Bid readiness</span><span className="font-mono">{done}/{tasks.length} · {pct}%</span></div>
        <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
      <ul className="divide-y">
        {tasks.map((task) => (
          <li key={task.id} className="group flex items-center gap-3 py-2.5">
            <Checkbox checked={task.done} onCheckedChange={(v) => toggle.mutate({ id: task.id, done: !!v })} />
            <span className={cn("flex-1 text-sm", task.done && "text-muted-foreground line-through")}>{task.title}</span>
            {task.assignee && <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{task.assignee}</span>}
            {task.due_date && <span className="font-mono text-xs text-muted-foreground">{new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
            <button onClick={() => del.mutate(task.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Delete task"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate(); }} className="mt-3 flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" />
        <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assignee" className="w-36" />
        <Button size="icon" variant="outline" disabled={add.isPending}><Plus /></Button>
      </form>
    </Card>
  );
}
